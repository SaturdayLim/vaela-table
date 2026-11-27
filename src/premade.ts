// Random pre-made characters: a full sheet, ready to play without a Session 0.
// Every character grew up in Golgotha. Facts come only from the player-facing Player Kit
// (mining guilds, forge-cities at shaft-heads, ice north / lava middle / arable south, the Survey Dispatch Board,
// Emberisle and Frostholm dialects, Vitalen in mountain and ice communities). Nothing DM-only lives here.
// Values are keyed by the sheet's field ids and match its select options exactly.

type Values = Record<string, string>;

/** Uniform integer in [0, n) from the CSPRNG. */
function rand(n: number): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}
const pick = <T>(xs: readonly T[]): T => xs[rand(xs.length)];
function pickN<T>(xs: readonly T[], n: number): T[] {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(rand(pool.length), 1)[0]);
  return out;
}
const d20 = () => rand(20) + 1;

const GIVEN = ["Ash", "Bram", "Cael", "Dagna", "Edda", "Fenn", "Garra", "Hesk", "Ilse", "Joss", "Kettle", "Lora",
  "Mott", "Nessa", "Orrin", "Pell", "Quill", "Rhun", "Sabe", "Tamsin", "Ulla", "Vos", "Wren", "Yara"] as const;
const FAMILY = ["Coldshaft", "Ironside", "Slagwell", "Brassmark", "Deepcart", "Ashgrove", "Hammerlee", "Seamwright",
  "Pitlamp", "Oreford", "Cinderhill", "Blackrope", "Gantt", "Tallis", "Marrow", "Stoke"] as const;

/** Class, its Vaelan proficiency, likely Force, and the skills that suit it. */
const CLASSES = [
  { cls: "Fighter", prof: ["None", "Apprentice"], force: ["Magic-Mute", "Vitalen"], skills: ["Athletics", "Intimidation", "Perception", "Survival"] },
  { cls: "Rogue", prof: ["None", "Apprentice"], force: ["Magic-Mute", "Arcaen"], skills: ["Stealth", "Sleight of Hand", "Deception", "Thieves' tools"] },
  { cls: "Ranger", prof: ["Apprentice"], force: ["Vitalen"], skills: ["Survival", "Nature", "Perception", "Cartographer's tools"] },
  { cls: "Barbarian", prof: ["None"], force: ["Vitalen", "Magic-Mute"], skills: ["Athletics", "Survival", "Intimidation", "Animal Handling"] },
  { cls: "Artificer", prof: ["Apprentice", "Journeyman"], force: ["Arcaen"], skills: ["Arcana", "Investigation", "Tinker's tools", "Smith's tools"] },
  { cls: "Alchemist", prof: ["Apprentice", "Journeyman"], force: ["Arcaen", "Vitalen"], skills: ["Alchemist's supplies", "Medicine", "Nature", "Investigation"] },
  { cls: "Healer", prof: ["Apprentice", "Journeyman"], force: ["Vitalen"], skills: ["Medicine", "Insight", "Healer's kit", "Herbalism kit"] },
  { cls: "Cleric", prof: ["Apprentice"], force: ["Somalen"], skills: ["Religion", "Insight", "Persuasion", "History"] },
  { cls: "Bard", prof: ["Apprentice"], force: ["Somalen", "Arcaen"], skills: ["Performance", "Persuasion", "History", "Musical instrument"] },
  { cls: "Mage", prof: ["Apprentice", "Journeyman"], force: ["Arcaen"], skills: ["Arcana", "History", "Investigation", "Calligrapher's supplies"] },
  { cls: "Monk", prof: ["Apprentice"], force: ["Vitalen", "Somalen"], skills: ["Acrobatics", "Insight", "Athletics", "Religion"] },
  { cls: "Paladin", prof: ["Apprentice"], force: ["Somalen", "Vitalen"], skills: ["Athletics", "Religion", "Persuasion", "Insight"] },
] as const;

const SPECIES = ["Human (Vaelan-adapted)", "Human (Vaelan-adapted)", "Human (Vaelan-adapted)", "Dwarf", "Dwarf", "Elf", "Centaur"] as const;

/** Golgotha's three bands, from the Player Kit: ice north, lava middle, arable south. */
const HOMES = [
  { where: "a forge-city in the lava middle", dialect: "Emberisle" },
  { where: "an ice-shaft town in the north", dialect: "Frostholm" },
  { where: "a farm terrace in the arable south", dialect: "Eldorian" },
  { where: "a shaft-head camp in the lava middle", dialect: "Emberisle" },
] as const;

const LEFT = [
  "My guild lost the mineral rights, and the ground went with them.",
  "The shaft I was born beside closed. Nobody said why in writing.",
  "I owe a forge-city guild more than a year's wages.",
  "I signed on as a surveyor's runner and never went back.",
  "My family's seam ran out; my cousins stayed to argue about it.",
  "A guild clerk wrote my name on the wrong list.",
];
// These two match the sheet's dropdowns exactly.
const SPONSOR = ["A mining guild", "The Transport Guild", "A former employer", "Nobody: on probation", "A ship's or caravan captain"];
const CHEAP = ["New to the work", "No guild or college behind me", "In debt, and they know it",
  "A bad job on my record", "Good, but overlooked"];
const BACKSTORY = [
  (where: string) => `Grew up in ${where}, the third child of a shift foreman. Learned to read the ground before learning to read paper, and ran messages for the guild surveyors.`,
  (where: string) => `Born in ${where} to a family that worked the same seam for four generations. Kept the guild's tally books from the age of twelve, and noticed when the numbers stopped adding up.`,
  (where: string) => `Raised in ${where} by an aunt who mended safety lamps. Spent years underground, then a year in a forge-city's yards, and never quite settled in either.`,
  (where: string) => `From ${where}. Apprenticed to a carter on the ore roads, saw most of Golgotha from a wagon seat, and learned which guild owned which road.`,
];
const STRANGER = [
  "Smells of slag and lamp oil, and counts the exits.",
  "Short words, long silences, grey dust in every seam.",
  "Carries a guild mark scratched off a belt buckle.",
  "Looks at a rope the way other people look at a face.",
  "Polite to clerks, rude to everyone else.",
];
const LOOK = [
  "Burn-scarred knuckles, a squint from years of forge light.",
  "Broad shoulders, a careful walk, boots resoled more than once.",
  "Ash-grey hair tied back with wire, a quick, flat stare.",
  "Weathered hands and a voice used to shouting down a shaft.",
];
const ITEM = [
  "A brass guild chit from a guild that no longer holds its ground",
  "A safety lamp with a cracked, carefully mended glass",
  "A prospector's pick, the guild mark filed off the haft",
  "A sample of ore wrapped in a letter you never sent",
  "A slag-glass bead on a cord, from your first shaft",
];
const KIT = ["Rope (50 ft), lamp and oil, chalk", "Bedroll, hard tack for three days, waterskin", "Hammer, pitons, a tin of grease", "Ledger, ink, a day-pass sized wallet"];
const ANCHOR = [
  "A guild's word is worth less than its ledger. Mine is worth more.",
  "Nobody goes down a shaft alone.",
  "Ground belongs to whoever works it, whatever the paper says.",
  "Pay your debts before you make new ones.",
];
const SCAR = [
  "A collapse I walked out of. Two of my crew did not.",
  "The day my family's rights were sold over our heads.",
  "A forge fire I could have stopped, and didn't.",
  "I testified for a guild and they used it against my neighbours.",
];
const QUESTION = [
  "Who bought our rights, and what did they want under that ground?",
  "Can I earn enough to buy a seam of my own?",
  "Is there a place where paper matters less than work?",
  "Why did the shaft close the week before the inspector came?",
];
const ENJOYS = ["A hot meal after a long haul", "Good tools, well kept", "A fair bargain struck over a meal", "Quiet after the noon bell"];
const HATES = ["Clerks who never went down a shaft", "Being told to wait in a queue", "Wasted lamp oil", "Debts that grow while you sleep"];
const TIE = ["A mining guild", "The Transport Guild", "None"];

/** A complete sheet. Every required field is filled; Lines and Veils stay for the player to set. */
export function randomGolgotha(): Values {
  const c = pick(CLASSES);
  const home = pick(HOMES);
  const prof = pick(c.prof);
  const v: Values = {
    "f-name": `${pick(GIVEN)} ${pick(FAMILY)}`,
    "f-pronouns": pick(["she/her", "he/him", "they/them"]),
    "f-species": pick(SPECIES),
    "f-class": c.cls,
    "f-stranger": pick(STRANGER),
    "f-region": "Golgotha",
    "f-left": pick(LEFT),
    "f-sponsor": pick(SPONSOR),
    "f-cheap": pick(CHEAP),
    "f-desc": pick(LOOK),
    "f-backstory": pick(BACKSTORY)(home.where),
    "f-prof": prof,
    "f-force": pick(c.force),
    "f-item": pick(ITEM),
    "f-kit": pick(KIT),
    "f-anchor": pick(ANCHOR),
    "f-scar": pick(SCAR),
    "f-question": pick(QUESTION),
    "f-tie": pick(TIE),
    "f-hope": pick(ENJOYS),
    "f-hate": pick(HATES),
    "f-lang1": home.dialect,
  };
  if (home.dialect !== "Eldorian") v["f-lang2"] = "Eldorian";
  if (prof !== "None" && v["f-force"] !== "Magic-Mute") v["f-dialect"] = home.dialect;
  for (const a of ["str", "dex", "con", "int", "wis", "cha"]) v[`f-${a}`] = String(d20());
  pickN(c.skills, 4).forEach((s, i) => { v[`f-skill${i + 1}`] = s; });
  return v;
}
