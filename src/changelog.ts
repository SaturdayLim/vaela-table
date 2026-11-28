// Version history, shown behind the version number in the footer (table/DESIGN.md, "Footer and version").
// Newest first. Versions are MAJOR.MINOR.PATCH, two digits each (v00.02.00). Every push that changes what
// players see adds an entry here; the footer shows the first one. Player-facing words only: this ships publicly.

export type Release = { v: string; date: string; changes: string[] };

export const RELEASES: Release[] = [
  { v: "00.02.00", date: "28 Nov 2026", changes: [
    "Practice turn: leaving it is one tap, and it never sticks after a reload, so a live turn always reaches you.",
    "Inbox: the code is six boxes, entered inside your player card. Tap outside to close the card.",
    "Roll boxes: Roll here spins the number on screen; each box shows its die; the DM can roll for you.",
    "Theme: follows your device. The sun and moon switch changes it until you close the app.",
    "Text size: a small A and a large A, no labels.",
    "Pages slide between sections and turn like a book between their tabs; the tabs are icons.",
    "Earlier turns show what each player answered.",
    "The opening book opens every time you open the app.",
    "This version history.",
  ] },
  { v: "00.01.08", date: "28 Nov 2026", changes: [
    "Scene pictures under a turn's title, with a note while the picture is on its way.",
    "Every button is at least 44 px tall on phones.",
  ] },
  { v: "00.01.07", date: "28 Nov 2026", changes: ["Faction emblems in the Player Kit.", "Wording that works for any number of players."] },
  { v: "00.01.06", date: "27 Nov 2026", changes: [
    "The gilded V: app icon, header mark and the opening book.",
    "Text size, welcome letter, several players on one device, random Golgotha characters.",
    "Character Sheet: picker, Save, Copy and Download, Randomize.",
  ] },
  { v: "00.01.05", date: "27 Nov 2026", changes: ["Dice tray, roll boxes, Roll for me, private checks, page tabs and the page turn."] },
  { v: "00.01.04", date: "26 Nov 2026", changes: ["End the session together.", "A steadier live connection."] },
  { v: "00.01.03", date: "25 Nov 2026", changes: ["Your move and Private chat; new turns arrive live.", "Your pack in your inbox.", "The practice turn."] },
  { v: "00.01.02", date: "25 Nov 2026", changes: ["The table moves to Gantry."] },
  { v: "00.01.01", date: "2 Nov 2026", changes: ["Handouts and the Rolls list look the part.", "The Dice page."] },
  { v: "00.01.00", date: "30 Oct 2026", changes: ["First version: the table feed, sealed inboxes and the player kit."] },
];
