import type { InstrumentId } from "../types";
import type { SampleSet } from "./sampler";

/**
 * Instruments that play recordings instead of the synthesizer.
 *
 * Violin: the University of Iowa Musical Instrument Samples (arco, mf), free to use without
 * restrictions. Each pitch is taken from the string a player would use in first position
 * (G3–C#4 on G, D4–G#4 on D, A4–D#5 on A, E5 up on E), retuned to equal temperament,
 * levelled, started 10 dB into the bow's slow swell so short notes speak at once, and given a
 * crossfaded loop from about 1.4 s to 2.6 s for notes held longer. Pitches with no recording
 * of their own (D6, F6, G6, A#6, C7) play their neighbour a semitone away.
 */
const VIOLIN_NOTES: SampleSet["notes"] = [
  [55, 1.400998, 2.6], [56, 1.400884, 2.6], [57, 1.4, 2.6], [58, 1.398707, 2.6], [59, 1.401338, 2.6],
  [60, 1.399819, 2.6], [61, 1.398617, 2.6], [62, 1.401361, 2.6], [63, 1.401134, 2.6], [64, 1.398639, 2.6],
  [65, 1.400204, 2.6], [66, 1.399977, 2.6], [67, 1.400998, 2.6], [68, 1.400884, 2.6], [69, 1.4, 2.6],
  [70, 1.400862, 2.6], [71, 1.39932, 2.6], [72, 1.399819, 2.6], [73, 1.400431, 2.6], [74, 1.39966, 2.6],
  [75, 1.399524, 2.6], [76, 1.400159, 2.6], [77, 1.400204, 2.6], [78, 1.399977, 2.6], [79, 1.399728, 2.6],
  [80, 1.399683, 2.6], [81, 1.4, 2.6], [82, 1.399773, 2.6], [83, 1.400317, 2.6], [84, 1.399819, 2.6],
  [85, 1.400431, 2.6], [87, 1.40034, 2.6], [88, 1.400159, 2.6], [90, 1.399977, 2.6], [92, 1.400272, 2.6],
  [93, 1.4, 2.6], [95, 1.399819, 2.6],
];

export const SAMPLE_SETS: Partial<Record<InstrumentId, SampleSet>> = {
  violin: {
    base: "/sounds/violin",
    notes: VIOLIN_NOTES,
    vibratoCents: 15,
    // about 2 dB(A) above the piano, so a violin melody leads its accompaniment
    level: 0.72,
    credit: "Violin recordings: University of Iowa Electronic Music Studios, Musical Instrument Samples",
  },
};
