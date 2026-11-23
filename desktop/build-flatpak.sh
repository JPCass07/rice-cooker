#!/usr/bin/env bash
# Builds dist/rice-cooker.flatpak with only `flatpak` (no flatpak-builder, no SDK):
# the app is Python + web files on top of the GNOME runtime, which already ships
# Python, PyGObject, GTK 4, libadwaita and WebKitGTK.
set -euo pipefail
cd "$(dirname "$0")/.."
APP=io.github.jpcass07.RiceCooker
RUNTIME=org.gnome.Platform
BRANCH=${RUNTIME_BRANCH:-51}
OUT=build/flatpak
rm -rf "$OUT"; mkdir -p "$OUT" dist

if ! flatpak info "$RUNTIME//$BRANCH" >/dev/null 2>&1; then
  echo "Installing $RUNTIME//$BRANCH from Flathub (one time)…"
  flatpak install --user -y flathub "$RUNTIME//$BRANCH"
fi

flatpak build-init "$OUT/app" "$APP" "$RUNTIME" "$RUNTIME" "$BRANCH"
F="$OUT/app/files"
mkdir -p "$F/bin" "$F/share/rice-cooker/web" "$F/share/applications" "$F/share/icons/hicolor/scalable/apps" "$F/share/metainfo" "$F/share/mime/packages"
cp -r index.html css js research LICENSE README.md "$F/share/rice-cooker/web/"
install -m755 desktop/rice-cooker.py "$F/bin/rice-cooker"
install -m644 "desktop/$APP.desktop" "$F/share/applications/"
install -m644 "desktop/$APP.svg" "$F/share/icons/hicolor/scalable/apps/"
install -m644 "desktop/$APP.metainfo.xml" "$F/share/metainfo/"
install -m644 "desktop/$APP.mime.xml" "$F/share/mime/packages/$APP.xml"

# org.freedesktop.Flatpak = flatpak-spawn --host: the app has to run the rice script on
# the real desktop (plasma-apply-*, kwriteconfig6, sudo for packages).
flatpak build-finish "$OUT/app" \
  --command=rice-cooker \
  --share=ipc --share=network \
  --socket=wayland --socket=fallback-x11 --device=dri \
  --talk-name=org.freedesktop.Flatpak \
  --filesystem=xdg-data/rice-cooker:create \
  --filesystem=xdg-pictures/Wallpapers/rice-cooker:create \
  --filesystem=xdg-download

flatpak build-export "$OUT/repo" "$OUT/app" stable
flatpak build-bundle "$OUT/repo" dist/rice-cooker.flatpak "$APP" stable \
  --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo
echo "Built dist/rice-cooker.flatpak"
echo "Install it with: flatpak install --user dist/rice-cooker.flatpak"
