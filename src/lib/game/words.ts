// Common English words used for the time / words / sudden-death modes.
export const COMMON_WORDS = (
  "the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an " +
  "will my one all would there their what so up out if about who get which go me when make can like time no just him " +
  "know take people into year your good some could them see other than then now look only come its over think also back " +
  "after use two how our work first well way even new want because any these give day most us write story poem verse " +
  "ink page word line letter book light night dream heart rain river stone voice song quiet morning paper silence memory " +
  "window garden ocean wander whisper moment journey forest winter summer candle shadow golden simple gentle little open " +
  "between always never often begin end small great long short young old early late hand place world life home thought"
).split(" ");

/** Returns `count` random words (no immediate repeats). */
export function randomWords(count: number, source: string[] = COMMON_WORDS): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let next = source[Math.floor(Math.random() * source.length)];
    if (next === out[i - 1]) next = source[(source.indexOf(next) + 1) % source.length];
    out.push(next);
  }
  return out;
}
