/* Rice Cooker Plasma widget (Plasma 6). One widget, several looks picked with the
 * "kind" setting: clock, greeting, nowplaying, rings, cpu, memory, gpu, calendar
 * and dock (the Caelestia/Serpantinum top-dock pill for panels). Colours come from
 * the active colour scheme, so the rice's palette styles it. The generator writes
 * these files to ~/.local/share/plasma/plasmoids/io.github.jpcass07.ricecooker.
 */
(function (RB) {
  'use strict';
  const ID = 'io.github.jpcass07.ricecooker';
  const metadata = JSON.stringify({
    KPackageStructure: 'Plasma/Applet',
    KPlugin: {
      Id: ID, Name: 'Rice Cooker card', Description: 'Clock, greeting, now playing, system rings, calendar and top-dock pill, styled by your rice',
      Icon: 'preferences-desktop-theme', License: 'MIT', Version: '1.0', Authors: [{ Name: 'Rice Cooker' }],
      Category: 'Miscellaneous', FormFactors: ['desktop', 'panel'],
    },
    'X-Plasma-API-Minimum-Version': '6.0',
  }, null, 2);

  const configXml = `<?xml version="1.0" encoding="UTF-8"?>
<kcfg xmlns="http://www.kde.org/standards/kcfg/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.kde.org/standards/kcfg/1.0 http://www.kde.org/standards/kcfg/1.0/kcfg.xsd">
  <kcfgfile name=""/>
  <group name="General">
    <entry name="kind" type="String"><default>clock</default></entry>
    <entry name="clock24" type="Bool"><default>true</default></entry>
    <entry name="name" type="String"><default></default></entry>
  </group>
</kcfg>
`;

  const mainQml = String.raw`import QtQuick
import QtQuick.Layouts
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import org.kde.kirigami as Kirigami
import org.kde.plasma.private.mpris as Mpris
import org.kde.ksysguard.sensors as Sensors

PlasmoidItem {
    id: root
    readonly property string kind: Plasmoid.configuration.kind || "clock"
    readonly property bool inPanel: Plasmoid.formFactor === PlasmaCore.Types.Horizontal || Plasmoid.formFactor === PlasmaCore.Types.Vertical
    Plasmoid.backgroundHints: PlasmaCore.Types.NoBackground
    preferredRepresentation: fullRepresentation

    // the rice's colours, through the colour scheme Rice Cooker applied
    Kirigami.Theme.colorSet: Kirigami.Theme.View
    Kirigami.Theme.inherit: false
    readonly property color bg: Kirigami.Theme.backgroundColor
    readonly property color fg: Kirigami.Theme.textColor
    readonly property color dim: Kirigami.Theme.disabledTextColor
    readonly property color accent: Kirigami.Theme.highlightColor
    readonly property color accent2: Kirigami.Theme.linkColor
    readonly property color card: Qt.rgba(Kirigami.Theme.alternateBackgroundColor.r, Kirigami.Theme.alternateBackgroundColor.g, Kirigami.Theme.alternateBackgroundColor.b, 0.86)

    property date now: new Date()
    Timer { interval: 1000; running: true; repeat: true; onTriggered: root.now = new Date() }
    function hhmm() { return Qt.formatTime(root.now, Plasmoid.configuration.clock24 ? "HH:mm" : "h:mm AP") }

    Mpris.Mpris2Model { id: mpris }
    readonly property var player: mpris.currentPlayer
    readonly property bool playing: (player?.playbackStatus ?? 0) === Mpris.PlaybackStatus.Playing
    readonly property string track: player?.track || ""
    readonly property string artist: player?.artist || ""

    fullRepresentation: Item {
        Layout.preferredWidth: root.kind === "dock" ? (ld.item ? ld.item.implicitWidth : Kirigami.Units.gridUnit * 10) : Kirigami.Units.gridUnit * 16
        Layout.preferredHeight: root.kind === "dock" ? Kirigami.Units.gridUnit * 1.6 : Kirigami.Units.gridUnit * 8
        Layout.minimumWidth: root.kind === "dock" ? Layout.preferredWidth : Kirigami.Units.gridUnit * 6

        // ---- card background (desktop kinds)
        Rectangle {
            visible: root.kind !== "dock" && root.kind !== "clock"
            anchors.fill: parent
            radius: Kirigami.Units.gridUnit * 0.8
            color: root.card
            border.color: Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.10)
        }

        Loader {
            id: ld
            anchors.fill: parent
            anchors.margins: root.kind === "dock" || root.kind === "clock" ? 0 : Kirigami.Units.gridUnit * 0.9
            sourceComponent: ({ clock: clockC, greeting: greetC, nowplaying: musicC, rings: ringsC, cpu: oneRingC, memory: oneRingC, gpu: oneRingC, calendar: calC, dock: dockC })[root.kind] || clockC
        }

        // ---- top-dock pill: clock, date, now playing with a little visualiser
        Component {
            id: dockC
            Item {
                implicitWidth: dockRow.implicitWidth + Kirigami.Units.gridUnit * 1.5
                RowLayout {
                    id: dockRow
                    anchors.centerIn: parent
                    spacing: Kirigami.Units.gridUnit * 0.7
                    Text { text: root.hhmm(); color: root.fg; font.bold: true; font.pixelSize: Kirigami.Units.gridUnit * 0.8 }
                    Text { text: Qt.formatDate(root.now, "ddd d MMM"); color: root.dim; font.pixelSize: Kirigami.Units.gridUnit * 0.65 }
                    Rectangle { visible: root.track !== ""; width: 1; height: Kirigami.Units.gridUnit * 0.8; color: Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.25) }
                    Image { visible: root.track !== ""; source: root.player?.artUrl || ""; Layout.preferredWidth: Kirigami.Units.gridUnit; Layout.preferredHeight: Kirigami.Units.gridUnit; fillMode: Image.PreserveAspectCrop; asynchronous: true }
                    Text { visible: root.track !== ""; text: root.track; color: root.fg; font.pixelSize: Kirigami.Units.gridUnit * 0.65; elide: Text.ElideRight; Layout.maximumWidth: Kirigami.Units.gridUnit * 9 }
                    Text { visible: root.artist !== ""; text: root.artist; color: root.dim; font.pixelSize: Kirigami.Units.gridUnit * 0.65; elide: Text.ElideRight; Layout.maximumWidth: Kirigami.Units.gridUnit * 6 }
                    Viz { visible: root.track !== "" }
                }
                MouseArea { anchors.fill: parent; onClicked: root.player?.PlayPause() }
            }
        }

        // ---- big clock (no card, like the preview)
        Component {
            id: clockC
            ColumnLayout {
                spacing: 0
                Text { Layout.alignment: Qt.AlignHCenter; text: root.hhmm(); color: root.fg; font.pixelSize: parent.height * 0.55; font.weight: Font.Bold; style: Text.Raised; styleColor: Qt.rgba(0, 0, 0, 0.35) }
                Text { Layout.alignment: Qt.AlignHCenter; text: Qt.formatDate(root.now, "dddd d MMMM").toUpperCase(); color: root.dim; font.pixelSize: Math.max(10, parent.height * 0.09); font.letterSpacing: 2 }
            }
        }

        // ---- greeting
        Component {
            id: greetC
            ColumnLayout {
                spacing: Kirigami.Units.smallSpacing
                Text { text: (root.now.getHours() < 12 ? "Good morning" : root.now.getHours() < 18 ? "Good afternoon" : "Good evening") + (Plasmoid.configuration.name ? ", " + Plasmoid.configuration.name : ""); color: root.fg; font.bold: true; font.pixelSize: Kirigami.Units.gridUnit * 0.95; elide: Text.ElideRight; Layout.fillWidth: true }
                Text { text: Qt.formatDate(root.now, "dddd d MMMM"); color: root.dim; font.pixelSize: Kirigami.Units.gridUnit * 0.7 }
                Item { Layout.fillHeight: true }
                Text { text: root.hhmm(); color: root.accent; font.bold: true; font.pixelSize: Kirigami.Units.gridUnit * 1.8 }
            }
        }

        // ---- now playing: art, title, artist, progress, controls (any MPRIS player)
        Component {
            id: musicC
            RowLayout {
                spacing: Kirigami.Units.gridUnit * 0.7
                Rectangle {
                    Layout.preferredWidth: parent.height; Layout.preferredHeight: parent.height
                    radius: Kirigami.Units.gridUnit * 0.5
                    gradient: Gradient { GradientStop { position: 0; color: root.accent } GradientStop { position: 1; color: root.accent2 } }
                    Image { anchors.fill: parent; source: root.player?.artUrl || ""; fillMode: Image.PreserveAspectCrop; asynchronous: true; visible: status === Image.Ready }
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: Kirigami.Units.smallSpacing
                    Text { text: root.track || "Nothing playing"; color: root.fg; font.bold: true; elide: Text.ElideRight; Layout.fillWidth: true }
                    Text { text: root.artist || (root.player ? root.player.identity : "Start some music"); color: root.dim; elide: Text.ElideRight; Layout.fillWidth: true; font.pixelSize: Kirigami.Units.gridUnit * 0.65 }
                    Rectangle {
                        Layout.fillWidth: true; height: 4; radius: 2; color: Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.15)
                        Rectangle { height: parent.height; radius: 2; color: root.accent; width: (root.player && root.player.length > 0) ? parent.width * Math.min(1, root.player.position / root.player.length) : 0 }
                    }
                    RowLayout {
                        spacing: Kirigami.Units.gridUnit
                        Repeater {
                            model: [["⏮", function () { root.player?.Previous() }], [root.playing ? "⏸" : "▶", function () { root.player?.PlayPause() }], ["⏭", function () { root.player?.Next() }]]
                            Text { text: modelData[0]; color: root.fg; font.pixelSize: Kirigami.Units.gridUnit * 0.8; MouseArea { anchors.fill: parent; anchors.margins: -6; onClicked: modelData[1]() } }
                        }
                        Item { Layout.fillWidth: true }
                        Viz { visible: root.playing }
                    }
                }
            }
        }

        // ---- CPU / RAM / GPU rings (live sensors)
        Component {
            id: ringsC
            RowLayout {
                spacing: 0
                Ring { sensor: "cpu/all/usage"; label: "CPU"; Layout.fillWidth: true; Layout.fillHeight: true }
                Ring { sensor: "memory/physical/usedPercent"; label: "RAM"; Layout.fillWidth: true; Layout.fillHeight: true }
                Ring { sensor: "gpu/gpu0/usage"; label: "GPU"; Layout.fillWidth: true; Layout.fillHeight: true }
            }
        }
        Component {
            id: oneRingC
            Ring {
                sensor: root.kind === "cpu" ? "cpu/all/usage" : root.kind === "memory" ? "memory/physical/usedPercent" : "gpu/gpu0/usage"
                label: root.kind === "cpu" ? "CPU" : root.kind === "memory" ? "RAM" : "GPU"
            }
        }

        // ---- calendar: month grid with today in the accent colour
        Component {
            id: calC
            ColumnLayout {
                spacing: Kirigami.Units.smallSpacing
                Text { text: Qt.formatDate(root.now, "MMMM yyyy"); color: root.fg; font.bold: true }
                GridLayout {
                    columns: 7; rowSpacing: 2; columnSpacing: 2
                    Layout.fillWidth: true; Layout.fillHeight: true
                    Repeater {
                        model: 42
                        Rectangle {
                            readonly property var first: new Date(root.now.getFullYear(), root.now.getMonth(), 1)
                            readonly property int offset: (first.getDay() + 6) % 7
                            readonly property int day: index - offset + 1
                            readonly property int days: new Date(root.now.getFullYear(), root.now.getMonth() + 1, 0).getDate()
                            readonly property bool inMonth: day >= 1 && day <= days
                            readonly property bool today: inMonth && day === root.now.getDate()
                            Layout.fillWidth: true; Layout.fillHeight: true
                            color: "transparent"
                            Rectangle { anchors.centerIn: parent; width: Math.min(parent.width, parent.height); height: width; radius: width / 2; color: parent.today ? root.accent : "transparent" }
                            Text { anchors.centerIn: parent; text: parent.inMonth ? parent.day : ""; color: parent.today ? Kirigami.Theme.highlightedTextColor : root.dim; font.pixelSize: Kirigami.Units.gridUnit * 0.55 }
                        }
                    }
                }
            }
        }
    }

    // a ring for one sensor
    component Ring: Item {
        id: ring
        property string sensor
        property string label
        Sensors.Sensor { id: s; sensorId: ring.sensor; updateRateLimit: 1500 }
        readonly property real v: Math.max(0, Math.min(100, s.value || 0))
        implicitWidth: Kirigami.Units.gridUnit * 4; implicitHeight: Kirigami.Units.gridUnit * 4
        Canvas {
            id: c
            anchors.centerIn: parent
            width: Math.min(parent.width, parent.height - lbl.height) * 0.9; height: width
            onPaint: {
                var ctx = getContext("2d"); ctx.reset();
                var r = width / 2 - 4; ctx.lineWidth = Math.max(3, width / 11); ctx.lineCap = "round";
                ctx.strokeStyle = Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.14); ctx.beginPath(); ctx.arc(width / 2, height / 2, r, 0, 2 * Math.PI); ctx.stroke();
                ctx.strokeStyle = root.accent; ctx.beginPath(); ctx.arc(width / 2, height / 2, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (ring.v / 100)); ctx.stroke();
            }
            Connections { target: ring; function onVChanged() { c.requestPaint() } }
            Text { anchors.centerIn: parent; text: Math.round(ring.v) + "%"; color: root.fg; font.bold: true; font.pixelSize: Math.max(9, parent.width / 5) }
        }
        Text { id: lbl; anchors.horizontalCenter: parent.horizontalCenter; anchors.bottom: parent.bottom; text: ring.label; color: root.dim; font.pixelSize: Kirigami.Units.gridUnit * 0.55 }
    }

    // bouncing bars; animated only while music plays (a look, not an audio meter)
    component Viz: Row {
        spacing: 2
        Repeater {
            model: 5
            Rectangle {
                width: 3; radius: 1.5; color: root.accent
                anchors.bottom: parent.bottom
                height: Kirigami.Units.gridUnit * 0.3
                SequentialAnimation on height {
                    running: root.playing; loops: Animation.Infinite
                    NumberAnimation { to: Kirigami.Units.gridUnit * (0.4 + (index % 3) * 0.2); duration: 260 + index * 70 }
                    NumberAnimation { to: Kirigami.Units.gridUnit * 0.2; duration: 240 + index * 60 }
                }
            }
        }
        height: Kirigami.Units.gridUnit * 0.8
    }
}
`;
  RB.plasmoid = { ID, metadata, configXml, mainQml };
})((window.RB = window.RB || {}));
