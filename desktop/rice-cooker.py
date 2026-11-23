#!/usr/bin/env python3
"""Rice Cooker desktop app.

A GTK 4 + WebKit window around the Rice Cooker web app, plus a small bridge
that lets the page change the real desktop:

  * reads the host's distro and Plasma version,
  * keeps "My rices" in ~/.local/share/rice-cooker/rices,
  * saves wallpapers to ~/Pictures/Wallpapers/rice-cooker,
  * runs the generated script on the host and streams its output back,
  * lists backups and runs their undo.sh.

Inside Flatpak, commands run on the host through `flatpak-spawn --host`
(the app needs org.freedesktop.Flatpak for that). Outside Flatpak they run
directly. Passwords for package installs are asked by a small askpass helper
(kdialog, zenity or ksshaskpass), never typed into or seen by the page.
"""
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
gi.require_version("WebKit", "6.0")
from gi.repository import Adw, Gio, GLib, Gtk, WebKit  # noqa: E402

APP_ID = "io.github.jpcass07.RiceCooker"
IN_FLATPAK = os.path.exists("/.flatpak-info")
HOME = Path(os.path.expanduser("~"))
DATA = HOME / ".local/share/rice-cooker"          # host path (granted to the sandbox)
RICES = DATA / "rices"
RUNS = DATA / "run"
BACKUPS = DATA / "backups"
WALLS = HOME / "Pictures/Wallpapers/rice-cooker"
DOWNLOADS = Path(GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD) or HOME / "Downloads")
STATE = DATA / "app.json"


def web_root() -> Path:
    """Where index.html lives: next to this file when run from source, /app/share in Flatpak."""
    for p in (Path(__file__).resolve().parent.parent, Path("/app/share/rice-cooker/web"),
              Path(sys.prefix) / "share/rice-cooker/web"):
        if (p / "index.html").exists():
            return p
    raise SystemExit("Rice Cooker: could not find the web files (index.html)")


def slug(s: str) -> str:
    s = re.sub(r"[^\w]+", "-", s.lower()).strip("-")
    return s[:60] or "rice"


def host_argv(argv):
    """Run a command on the host, also from inside the Flatpak sandbox."""
    if IN_FLATPAK:
        envs = [f"--env={k}={os.environ[k]}" for k in ("SUDO_ASKPASS", "RC_APP") if k in os.environ]
        return ["flatpak-spawn", "--host", *envs, *argv]
    return list(argv)


def host_output(argv, timeout=8):
    try:
        proc = Gio.Subprocess.new(host_argv(argv), Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE)
        ok, out, _ = proc.communicate_utf8(None, None)
        return out.strip() if ok and out else ""
    except GLib.Error:
        return ""


def read_os_release():
    for p in ("/run/host/os-release", "/etc/os-release", "/usr/lib/os-release"):
        if os.path.exists(p):
            info = {}
            for line in Path(p).read_text().splitlines():
                if "=" in line:
                    k, v = line.split("=", 1)
                    info[k] = v.strip().strip('"')
            return info
    return {}


ASKPASS = """#!/bin/sh
# Rice Cooker password prompt for sudo (SUDO_ASKPASS). The password goes straight to sudo.
msg="Rice Cooker needs your password to install packages."
if command -v kdialog >/dev/null 2>&1; then exec kdialog --title "Rice Cooker" --password "$msg"
elif command -v zenity >/dev/null 2>&1; then exec zenity --password --title="Rice Cooker"
elif command -v ksshaskpass >/dev/null 2>&1; then exec ksshaskpass "$msg"
else echo "No password dialog found (install kdialog or zenity)" >&2; exit 1; fi
"""


def b64url_text(code):
    code = code.strip()
    return base64.urlsafe_b64decode(code + "=" * (-len(code) % 4)).decode("utf-8")


def read_shared(gfile):
    """A rice handed to the app: a .rice.json file or a ricecooker://open?p=<code> link."""
    uri = gfile.get_uri() or ""
    if uri.startswith("ricecooker:"):
        m = re.search(r"[?#&]p=([\w-]+)", uri)
        if not m:
            raise ValueError("the link has no rice in it")
        return {"name": "", "text": b64url_text(m.group(1))}
    ok, data, _ = gfile.load_contents(None)
    if len(data) > 64 * 1024 * 1024:
        raise ValueError("file too large")
    return {"name": gfile.get_basename() or "", "text": bytes(data).decode("utf-8")}


class Host:
    """Methods the page can call. Each returns JSON-serialisable data."""

    def __init__(self, win):
        self.win = win
        self.proc = None
        self.page_ready = False
        self.pending = []
        for d in (RICES, RUNS, BACKUPS):
            d.mkdir(parents=True, exist_ok=True)
        askpass = DATA / "askpass.sh"
        askpass.write_text(ASKPASS)
        askpass.chmod(0o755)
        os.environ["SUDO_ASKPASS"] = str(askpass)
        os.environ["RC_APP"] = "1"

    # --- system ---------------------------------------------------------
    def info(self):
        osr = read_os_release()
        pv = host_output(["plasmashell", "--version"])
        state = json.loads(STATE.read_text()) if STATE.exists() else {}
        return {
            "flatpak": IN_FLATPAK,
            "os": {k: osr.get(k, "") for k in ("ID", "ID_LIKE", "VERSION_ID", "PRETTY_NAME")},
            "plasma": pv.split()[-1] if pv else "",
            "session": os.environ.get("XDG_SESSION_TYPE", ""),
            "desktop": os.environ.get("XDG_CURRENT_DESKTOP", ""),
            "unboxed": bool(state.get("unboxed")),
            "paths": {"rices": str(RICES), "walls": str(WALLS), "backups": str(BACKUPS)},
        }

    def setUnboxed(self, value=True):
        state = json.loads(STATE.read_text()) if STATE.exists() else {}
        state["unboxed"] = bool(value)
        STATE.write_text(json.dumps(state))
        return True

    # --- shared rices and the rice on screen ----------------------------
    def queue_open(self, gfile):
        try:
            item = read_shared(gfile)
        except Exception as e:  # tell the page instead of failing silently
            item = {"name": gfile.get_basename() or "", "text": "", "error": str(e)}
        if self.page_ready:
            self.win.emit_event("open", item)
        else:
            self.pending.append(item)

    def ready(self):
        self.page_ready = True
        items, self.pending = self.pending, []
        return items

    def saveCurrent(self, data):
        (DATA / "current.json").write_text(json.dumps(data))
        return True

    def loadCurrent(self):
        f = DATA / "current.json"
        return json.loads(f.read_text()) if f.exists() else None

    # --- my rices -------------------------------------------------------
    def listRices(self):
        out = []
        for f in sorted(RICES.glob("*.rice.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                out.append({"file": f.name, "data": json.loads(f.read_text()), "modified": f.stat().st_mtime})
            except (OSError, ValueError):
                continue
        return out

    def saveRice(self, name, data):
        f = RICES / f"{slug(name)}.rice.json"
        f.write_text(json.dumps(data, indent=2))
        return f.name

    def deleteRice(self, file):
        f = RICES / Path(file).name
        if f.exists() and f.suffix == ".json":
            f.unlink()
        return True

    # --- files ----------------------------------------------------------
    def saveWallpaper(self, name, data_url):
        WALLS.mkdir(parents=True, exist_ok=True)
        head, _, b64 = data_url.partition(",")
        if not head.startswith("data:image/"):
            raise ValueError("not an image")
        dest = WALLS / Path(name).name
        dest.write_bytes(base64.b64decode(b64))
        return str(dest)

    def saveFile(self, name, text):
        DOWNLOADS.mkdir(parents=True, exist_ok=True)
        dest = DOWNLOADS / Path(name).name
        dest.write_text(text)
        return str(dest)

    def listBackups(self):
        out = []
        for d in sorted(BACKUPS.glob("*/"), reverse=True):
            if (d / "undo.sh").exists():
                out.append({"path": str(d), "name": d.name})
        return out

    def openUrl(self, url):
        if url.startswith(("https://", "http://")):
            Gio.AppInfo.launch_default_for_uri(url, None)
        return True

    # --- running scripts ------------------------------------------------
    def run(self, script, label="rice"):
        if self.proc:
            raise RuntimeError("Something is already cooking; wait for it to finish.")
        path = RUNS / f"{time.strftime('%Y%m%d-%H%M%S')}-{slug(label)}.sh"
        path.write_text(script)
        path.chmod(0o700)
        return self._spawn(["bash", str(path), "-y"], label)

    def undo(self, path):
        p = Path(path) / "undo.sh"
        if not p.exists() or BACKUPS not in p.parents:
            raise ValueError("no undo.sh in that backup")
        return self._spawn(["bash", str(p)], "restore")

    def _spawn(self, argv, label):
        flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE | Gio.SubprocessFlags.STDIN_PIPE
        self.proc = Gio.Subprocess.new(host_argv(argv), flags)
        self.proc.get_stdin_pipe().close()  # no terminal: the script must not wait for input
        stream = Gio.DataInputStream.new(self.proc.get_stdout_pipe())

        def on_line(src, res):
            try:
                line, _ = src.read_line_finish_utf8(res)
            except GLib.Error:
                line = None
            if line is None:
                self.proc.wait_async(None, on_exit)
                return
            self.win.emit_event("log", re.sub(r"\x1b\[[0-9;]*m", "", line))
            src.read_line_async(GLib.PRIORITY_DEFAULT, None, on_line)

        def on_exit(proc, res):
            try:
                proc.wait_finish(res)
            except GLib.Error:
                pass
            code = proc.get_exit_status() if proc.get_if_exited() else -1
            self.proc = None
            self.win.emit_event("done", {"code": code, "label": label})

        stream.read_line_async(GLib.PRIORITY_DEFAULT, None, on_line)
        return True


class Window(Adw.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app, title="Rice Cooker")
        self.set_default_size(1440, 920)
        self.host = Host(self)

        ucm = WebKit.UserContentManager()
        ucm.register_script_message_handler("rc", None)
        ucm.connect("script-message-received::rc", self.on_message)
        self.web = WebKit.WebView(user_content_manager=ucm)
        s = self.web.get_settings()
        s.set_enable_developer_extras(os.environ.get("RC_DEVTOOLS") == "1")
        s.set_javascript_can_access_clipboard(True)
        self.web.connect("decide-policy", self.on_policy)
        self.web.connect("create", lambda *_: None)  # never open new web windows

        root = web_root()
        self.web.load_uri((root / "index.html").as_uri() + "?app=1")
        self.set_content(self.web)

    # page -> python
    def on_message(self, _ucm, value):
        try:
            msg = json.loads(value.to_string())
            fn = getattr(self.host, msg["method"], None)
            if not fn or msg["method"].startswith("_"):
                raise AttributeError(f"unknown method {msg['method']}")
            result, error = fn(*msg.get("args", [])), None
        except Exception as e:  # report every failure back to the page
            result, error = None, str(e)
        self._js(f"window.RCHost && window.RCHost._reply({json.dumps(msg.get('id'))}, {json.dumps(result)}, {json.dumps(error)})")

    # python -> page
    def emit_event(self, name, data):
        self._js(f"window.RCHost && window.RCHost._event({json.dumps(name)}, {json.dumps(data)})")

    def _js(self, code):
        self.web.evaluate_javascript(code, -1, None, None, None, None, None)

    def on_policy(self, _web, decision, kind):
        if kind in (WebKit.PolicyDecisionType.NAVIGATION_ACTION, WebKit.PolicyDecisionType.NEW_WINDOW_ACTION):
            uri = decision.get_navigation_action().get_request().get_uri()
            if uri.startswith(("http://", "https://")):
                Gio.AppInfo.launch_default_for_uri(uri, None)
                decision.ignore()
                return True
        return False


class App(Adw.Application):
    def __init__(self):
        super().__init__(application_id=APP_ID, flags=Gio.ApplicationFlags.HANDLES_OPEN)

    def do_activate(self):
        win = self.get_active_window() or Window(self)
        win.present()

    def do_open(self, files, n_files, hint):
        win = self.get_active_window() or Window(self)
        for f in files:
            win.host.queue_open(f)
        win.present()


if __name__ == "__main__":
    sys.exit(App().run(sys.argv))
