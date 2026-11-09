import type { Song, SongGroup } from "./types";

/*
 * Starter pieces, transcribed from public-domain compositions (some arranged).
 * Notation: NOTE[/beats], chords with "+", rests "r", "|" marks a bar.
 */

const eliseA = [
  "E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5 |",
  "A2+A4/.5 E3/.5 A3/.5 C4/.5 E4/.5 A4/.5 |",
  "E2+B4/.5 E3/.5 G#3/.5 E4/.5 G#4/.5 B4/.5 |",
  "A2+C5/.5 E3/.5 A3/.5 E4/.5 E5/.5 D#5/.5 |",
  "E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5 |",
  "A2+A4/.5 E3/.5 A3/.5 C4/.5 E4/.5 A4/.5 |",
  "E2+B4/.5 E3/.5 G#3/.5 E4/.5 C5/.5 B4/.5 |",
].join(" ");

/** One bar of the C major prelude: its five-note figure, played in each half of the bar. */
const prelude = (a: string, b: string, c: string, d: string, e: string) => {
  const half = [a, b, c, d, e, c, d, e].map((n) => `${n}/.25`).join(" ");
  return `${half} ${half} |`;
};

const ground = "D3 A2 B2 F#2 | G2 D2 G2 A2 | ";
const canonA = "F#5 E5 D5 C#5 | B4 A4 B4 C#5 | ";
const canonB = "D5 C#5 B4 A4 | G4 F#4 G4 E4 | ";
const canonC = "D4/.5 F#4/.5 A4/.5 G4/.5 F#4/.5 D4/.5 F#4/.5 E4/.5 | D4/.5 B3/.5 D4/.5 A4/.5 G4/.5 B4/.5 A4/.5 G4/.5 | ";

const minuetA = `D5 G4/.5 A4/.5 B4/.5 C5/.5 | D5 G4 G4 | E5 C5/.5 D5/.5 E5/.5 F#5/.5 | G5 G4 G4 | `;
const minuetBassA = `G2 B2 D3 | G2 B2 D3 | C3 E3 G3 | B2 D3 G3 | `;

const mountainKing = `A3/.5 B3/.5 C4/.5 D4/.5 E4/.5 C4/.5 E4 | D#4/.5 B3/.5 D#4 D4/.5 Bb3/.5 D4 |
  A3/.5 B3/.5 C4/.5 D4/.5 E4/.5 C4/.5 E4/.5 A4/.5 | G4/.5 E4/.5 C4/.5 E4/.5 G4/2 | `;

export const SONGS: Song[] = [
  {
    id: "fur-elise", title: "Für Elise", composer: "Ludwig van Beethoven",
    source: "Bagatelle No. 25 in A minor, opening section", group: "piano-solo", format: "Piano solo",
    marking: "Poco moto", tempo: [{ beat: 0, bpm: 108 }], beatUnit: 8, beatsPerBar: 3, pickup: 1,
    parts: [{
      id: "piano", name: "Piano (both hands)", instrument: "piano", role: "solo",
      notes: `E5/.5 D#5/.5 | ${eliseA}
        A2+A4/.5 E3/.5 A3/.5 r/.5 E5/.5 D#5/.5 | ${eliseA}
        A2+A4/.5 E3/.5 A3/.5 B4/.5 C5/.5 D5/.5 |
        C3+E5/.5 G3/.5 C4/.5 G4/.5 F5/.5 E5/.5 |
        G2+D5/.5 G3/.5 B3/.5 F4/.5 E5/.5 D5/.5 |
        A2+C5/.5 E3/.5 A3/.5 E4/.5 D5/.5 C5/.5 |
        E2+B4/.5 E3/.5 G#3/.5 E4/.5 C5/.5 B4/.5 |
        A2+A4/3`,
    }],
  },
  {
    id: "prelude-in-c", title: "Prelude in C", composer: "Johann Sebastian Bach",
    source: "The Well-Tempered Clavier, Book I, BWV 846, bars 1–11", group: "piano-solo", format: "Piano solo",
    marking: "Moderato", tempo: [{ beat: 0, bpm: 66 }], beatUnit: 4, beatsPerBar: 4, pickup: 0,
    parts: [{
      id: "piano", name: "Piano", instrument: "piano", role: "broken chords",
      notes: [
        prelude("C4", "E4", "G4", "C5", "E5"), prelude("C4", "D4", "A4", "D5", "F5"),
        prelude("B3", "D4", "G4", "D5", "F5"), prelude("C4", "E4", "G4", "C5", "E5"),
        prelude("C4", "E4", "A4", "E5", "A5"), prelude("C4", "D4", "F#4", "A4", "D5"),
        prelude("B3", "D4", "G4", "D5", "G5"), prelude("B3", "C4", "E4", "G4", "C5"),
        prelude("A3", "C4", "E4", "G4", "C5"), prelude("D3", "A3", "D4", "F#4", "C5"),
        prelude("G3", "B3", "D4", "G4", "B4"), "C3/.5 G3/.5 C4/.5 E4/.5 C5/2",
      ].join(" "),
    }],
  },
  {
    id: "ode-to-joy", title: "Ode to Joy", composer: "Ludwig van Beethoven",
    source: "Symphony No. 9, finale theme, arranged in C", group: "duet", format: "Duet",
    marking: "Allegro assai", tempo: [{ beat: 0, bpm: 112 }], beatUnit: 4, beatsPerBar: 4, pickup: 0,
    parts: [
      {
        id: "violin", name: "Violin", instrument: "violin", role: "melody",
        notes: `E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/1.5 D4/.5 D4/2 |
                E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/.5 C4/2 |
                D4 D4 E4 C4 | D4 E4/.5 F4/.5 E4 C4 | D4 E4/.5 F4/.5 E4 D4 | C4 D4 G3/2 |
                E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/.5 C4/2`,
      },
      {
        id: "piano", name: "Piano", instrument: "piano", role: "bass line",
        notes: `C3 G3 E3 G3 | G2 D3 B2 D3 | C3 G3 E3 G3 | G2 D3 B2 D3 |
                C3 G3 E3 G3 | G2 D3 B2 D3 | C3 G3 E3 G3 | G2 D3 C3/2 |
                G2 D3 C3 G3 | G2 D3 C3 G3 | G2 D3 G2 B2 | C3 D3 G2/2 |
                C3 G3 E3 G3 | G2 D3 B2 D3 | C3 G3 E3 G3 | G2 D3 C3/2`,
      },
    ],
  },
  {
    id: "minuet-in-g", title: "Minuet in G", composer: "Christian Petzold",
    source: "From the Notebook for Anna Magdalena Bach, arranged for violin and cello", group: "duet", format: "Duet",
    marking: "Allegretto", tempo: [{ beat: 0, bpm: 100 }], beatUnit: 4, beatsPerBar: 3, pickup: 0,
    parts: [
      {
        id: "violin", name: "Violin", instrument: "violin", role: "melody",
        notes: `${minuetA} C5 D5/.5 C5/.5 B4/.5 A4/.5 | B4 C5/.5 B4/.5 A4/.5 G4/.5 | F#4 G4/.5 A4/.5 B4/.5 G4/.5 | A4/3 |
                ${minuetA} C5 D5/.5 C5/.5 B4/.5 A4/.5 | B4 C5/.5 B4/.5 A4/.5 G4/.5 | A4 B4/.5 A4/.5 G4/.5 F#4/.5 | G4/3`,
      },
      {
        id: "cello", name: "Cello", instrument: "cello", role: "bass line",
        notes: `${minuetBassA} A2 C3 E3 | G2 B2 D3 | D3 F#3 A3 | D3/3 |
                ${minuetBassA} A2 C3 E3 | G2 B2 D3 | D3 F#3 A3 | G2/3`,
      },
    ],
  },
  {
    id: "canon-in-d", title: "Canon in D", composer: "Johann Pachelbel",
    source: "Canon for three violins and basso continuo", group: "orchestra", format: "Orchestra",
    marking: "Andante", tempo: [{ beat: 0, bpm: 72 }], beatUnit: 4, beatsPerBar: 4, pickup: 0,
    parts: [
      { id: "violin-1", name: "Violin I", instrument: "violin", role: "enters bar 3",
        notes: `r/8 ${canonA}${canonB}${canonC}${canonA}${canonB}${canonC} D5/4` },
      { id: "violin-2", name: "Violin II", instrument: "violin", role: "enters bar 5",
        notes: `r/16 ${canonA}${canonB}${canonC}${canonA}${canonB} F#4/4` },
      { id: "violin-3", name: "Violin III", instrument: "violin", role: "enters bar 7",
        notes: `r/24 ${canonA}${canonB}${canonC}${canonA} A4/4` },
      { id: "cello", name: "Cello", instrument: "cello", role: "ground bass", notes: `${ground.repeat(7)} D3/4` },
    ],
  },
  {
    id: "mountain-king", title: "In the Hall of the Mountain King", composer: "Edvard Grieg",
    source: "Peer Gynt Suite No. 1, theme in A minor; faster every time it comes round", group: "fast", format: "Piano solo",
    marking: "Alla marcia e molto marcato",
    tempo: [{ beat: 0, bpm: 100 }, { beat: 16, bpm: 120 }, { beat: 32, bpm: 140 }, { beat: 48, bpm: 165 }],
    beatUnit: 4, beatsPerBar: 4, pickup: 0,
    parts: [{ id: "piano", name: "Piano", instrument: "piano", role: "theme", notes: `${mountainKing.repeat(4)} A3+A4/4` }],
  },
];

export const SONG_GROUPS: { id: SongGroup; label: string }[] = [
  { id: "piano-solo", label: "Piano solos" },
  { id: "duet", label: "Duets" },
  { id: "orchestra", label: "Orchestra" },
  { id: "fast", label: "Fast and fun" },
];

export function getSong(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
