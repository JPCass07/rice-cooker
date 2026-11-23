/* Rice Cooker SDDM login theme (Qt 6). The generator writes these files to
 * /usr/share/sddm/themes/rice-cooker and a theme.conf.user with the rice's
 * colours, wallpaper and style. Styles: blur, clean (wallpaper only, card on
 * key press), dock (Caelestia-style pill that pops up the login card).
 * Test it without logging out:  sddm-greeter-qt6 --test-mode --theme /usr/share/sddm/themes/rice-cooker
 */
(function (RB) {
  'use strict';
  const metadata = `[SddmGreeterTheme]
Name=Rice Cooker
Description=Login screen made by Rice Cooker: blurred, clean or dock style
Author=Rice Cooker
License=MIT
Type=sddm-theme
Version=1.0
Website=https://jpcass07.github.io/rice-cooker/
MainScript=Main.qml
ConfigFile=theme.conf
QtVersion=6
`;
  const themeConf = `[General]
background=
style=blur
accent=#e6d675
bg=#16150f
surface=#2c2a22
fg=#ebe7da
dim=#9d998b
font=Noto Sans
clock24=true
`;
  const mainQml = String.raw`import QtQuick
import QtQuick.Controls
import QtQuick.Effects

Rectangle {
    id: root
    width: 1920
    height: 1080
    color: config.bg || "#111111"

    readonly property color accent: config.accent || "#e6d675"
    readonly property color fg: config.fg || "#ebe7da"
    readonly property color dim: config.dim || "#9d998b"
    readonly property color surface: config.surface || "#2c2a22"
    readonly property string look: config.style || "blur"
    readonly property string face: config.font || "Noto Sans"
    readonly property bool hasWall: (config.background || "") !== ""
    // blur: card always shown. clean and dock: hidden until you press a key or click
    property bool open: look === "blur"
    property int session: sessionModel.lastIndex >= 0 ? sessionModel.lastIndex : 0
    property string failed: ""

    function clockText() { return Qt.formatTime(new Date(), config.clock24 === "false" ? "h:mm AP" : "HH:mm") }
    function dateText() { return Qt.formatDate(new Date(), "dddd d MMMM") }
    function reveal() { if (!open) { open = true } pass.forceActiveFocus(); idle.restart() }
    function tryLogin() {
        failed = ""
        sddm.login(userName.text !== "" ? userName.text : userModel.lastUser, pass.text, session)
    }

    Connections {
        target: sddm
        function onLoginFailed() { root.failed = "That password didn't work"; pass.text = ""; pass.forceActiveFocus() }
    }

    // ---- background: the rice's wallpaper, blurred in the blur and dock styles
    Image {
        id: wall
        anchors.fill: parent
        source: config.background || ""
        fillMode: Image.PreserveAspectCrop
        asynchronous: true
        // always drawn: if the blur below can't run (no GPU), you still get the wallpaper
        visible: root.hasWall
    }
    MultiEffect {
        anchors.fill: wall
        source: wall
        visible: root.hasWall && root.look !== "clean"
        blurEnabled: true
        blurMax: 64
        blur: root.look === "dock" && !root.open ? 0.35 : 1.0
        brightness: -0.08
        Behavior on blur { NumberAnimation { duration: 450; easing.type: Easing.OutCubic } }
    }
    Rectangle { anchors.fill: parent; color: "black"; opacity: root.open ? 0.25 : 0.0; Behavior on opacity { NumberAnimation { duration: 300 } } }

    Timer { id: tick; interval: 1000; running: true; repeat: true; onTriggered: { bigClock.text = root.clockText(); smallClock.text = root.clockText(); pillClock.text = root.clockText() } }
    Timer { id: idle; interval: 30000; onTriggered: if (root.look !== "blur" && pass.text === "") root.open = false }

    focus: true
    Keys.onPressed: (e) => { root.reveal() }
    MouseArea { anchors.fill: parent; enabled: !root.open; onClicked: root.reveal() }

    // ---- blur style: big clock above the card
    Column {
        visible: root.look === "blur"
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: card.top
        anchors.bottomMargin: 48
        spacing: 6
        Text { id: bigClock; text: root.clockText(); color: root.fg; font.family: root.face; font.pixelSize: 112; font.weight: Font.Light; anchors.horizontalCenter: parent.horizontalCenter }
        Text { text: root.dateText(); color: root.fg; opacity: 0.8; font.family: root.face; font.pixelSize: 20; anchors.horizontalCenter: parent.horizontalCenter }
    }

    // ---- clean style: only a small clock in the corner until you start typing
    Column {
        visible: root.look === "clean"
        opacity: root.open ? 0 : 1
        Behavior on opacity { NumberAnimation { duration: 250 } }
        anchors.left: parent.left; anchors.bottom: parent.bottom; anchors.margins: 56
        Text { id: smallClock; text: root.clockText(); color: "white"; font.family: root.face; font.pixelSize: 64; font.weight: Font.Light; style: Text.Raised; styleColor: "#55000000" }
        Text { text: root.dateText(); color: "white"; opacity: 0.85; font.family: root.face; font.pixelSize: 18 }
    }

    // ---- the login card (centre for blur and clean, above the pill for dock)
    Rectangle {
        id: card
        width: 380
        height: col.implicitHeight + 48
        radius: 22
        color: Qt.rgba(root.surface.r, root.surface.g, root.surface.b, 0.82)
        border.color: Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.12)
        anchors.horizontalCenter: parent.horizontalCenter
        y: root.look === "dock" ? (root.open ? parent.height - 120 - height : parent.height) : (root.look === "blur" ? parent.height * 0.52 : (parent.height - height) / 2)
        opacity: root.open ? 1 : 0
        visible: opacity > 0.01
        Behavior on y { NumberAnimation { duration: 380; easing.type: Easing.OutCubic } }
        Behavior on opacity { NumberAnimation { duration: 260 } }

        Column {
            id: col
            anchors.centerIn: parent
            width: parent.width - 48
            spacing: 14

            Rectangle {
                width: 84; height: 84; radius: 42
                anchors.horizontalCenter: parent.horizontalCenter
                gradient: Gradient { GradientStop { position: 0; color: root.accent } GradientStop { position: 1; color: Qt.darker(root.accent, 1.6) } }
                Text { anchors.centerIn: parent; text: (userModel.lastUser || "?").charAt(0).toUpperCase(); color: root.surface; font.family: root.face; font.pixelSize: 36; font.weight: Font.DemiBold }
            }
            Text { visible: userModel.lastUser !== ""; text: userModel.lastUser; color: root.fg; font.family: root.face; font.pixelSize: 20; anchors.horizontalCenter: parent.horizontalCenter }
            TextField {
                id: userName
                visible: userModel.lastUser === ""
                width: parent.width
                placeholderText: "User name"
                font.family: root.face
                color: root.fg
                background: Rectangle { radius: 12; color: Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.08); border.color: userName.activeFocus ? root.accent : "transparent" }
            }
            Row {
                width: parent.width
                spacing: 8
                TextField {
                    id: pass
                    width: parent.width - go.width - 8
                    height: 44
                    echoMode: TextInput.Password
                    placeholderText: "Password"
                    font.family: root.face
                    font.pixelSize: 15
                    color: root.fg
                    focus: root.look === "blur"
                    onAccepted: root.tryLogin()
                    onTextChanged: idle.restart()
                    background: Rectangle { radius: 12; color: Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.08); border.width: 1.5; border.color: pass.activeFocus ? root.accent : "transparent" }
                }
                Rectangle {
                    id: go
                    width: 44; height: 44; radius: 22
                    color: root.accent
                    Text { anchors.centerIn: parent; text: "→"; color: root.surface; font.pixelSize: 20 }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.tryLogin() }
                }
            }
            Text { visible: root.failed !== ""; text: root.failed; color: "#ff8a80"; font.family: root.face; font.pixelSize: 13; anchors.horizontalCenter: parent.horizontalCenter }
            Text {
                text: "Session: " + (sessionModel.data(sessionModel.index(root.session, 0), Qt.UserRole + 4) || "default") + "  ▸"
                color: root.dim; font.family: root.face; font.pixelSize: 13
                anchors.horizontalCenter: parent.horizontalCenter
                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.session = (root.session + 1) % Math.max(1, sessionModel.rowCount()) }
            }
            Row {
                spacing: 18
                anchors.horizontalCenter: parent.horizontalCenter
                Repeater {
                    model: [["Sleep", function () { sddm.suspend() }, sddm.canSuspend], ["Restart", function () { sddm.reboot() }, sddm.canReboot], ["Shut down", function () { sddm.powerOff() }, sddm.canPowerOff]]
                    delegate: Text {
                        visible: modelData[2]
                        text: modelData[0]
                        color: root.dim
                        font.family: root.face; font.pixelSize: 13
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: modelData[1]() }
                    }
                }
            }
        }
    }

    // ---- dock style: the Caelestia-like pill; click it (or type) to pop the card up
    Rectangle {
        id: pill
        visible: root.look === "dock"
        height: 56
        width: pillRow.implicitWidth + 40
        radius: 28
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 40
        color: Qt.rgba(root.surface.r, root.surface.g, root.surface.b, 0.85)
        border.color: root.open ? root.accent : Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.14)
        Behavior on width { NumberAnimation { duration: 250 } }
        Row {
            id: pillRow
            anchors.centerIn: parent
            spacing: 16
            Text { id: pillClock; text: root.clockText(); color: root.fg; font.family: root.face; font.pixelSize: 20; font.weight: Font.DemiBold; anchors.verticalCenter: parent.verticalCenter }
            Text { text: root.dateText(); color: root.dim; font.family: root.face; font.pixelSize: 14; anchors.verticalCenter: parent.verticalCenter }
            Rectangle { width: 1; height: 22; color: Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.2); anchors.verticalCenter: parent.verticalCenter }
            Rectangle {
                width: 30; height: 30; radius: 15; color: root.accent; anchors.verticalCenter: parent.verticalCenter
                Text { anchors.centerIn: parent; text: (userModel.lastUser || "?").charAt(0).toUpperCase(); color: root.surface; font.pixelSize: 14; font.weight: Font.DemiBold }
            }
            Text { text: userModel.lastUser || "Log in"; color: root.fg; font.family: root.face; font.pixelSize: 15; anchors.verticalCenter: parent.verticalCenter }
        }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.open ? (root.open = false) : root.reveal() }
    }

    Component.onCompleted: if (root.look === "blur") pass.forceActiveFocus()
}
`;
  RB.sddmTheme = { metadata, themeConf, mainQml };
})((window.RB = window.RB || {}));
