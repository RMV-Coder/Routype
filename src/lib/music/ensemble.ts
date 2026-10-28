import type { Track } from "./audio/performer";
import { buildChart, simulatePart } from "./chart";
import type { Take } from "./session";

export interface EnsembleTrack extends Track {
  partId: string;
  name: string;
}

/** The player's take with every other part of the piece, played by stand-ins. */
export function ensembleTracks(take: Take): EnsembleTrack[] {
  const { song, part, speed } = take.setup;
  return song.parts.map((p, i) =>
    p.id === part.id
      ? { partId: p.id, name: `${p.name} (you)`, instrument: p.instrument, notes: take.played }
      : { partId: p.id, name: `${p.name} (stand-in)`, instrument: p.instrument, notes: simulatePart(buildChart(song, p, speed), 11 + i) },
  );
}

export function ensembleEnd(tracks: Track[], chartEnd: number): number {
  return Math.max(chartEnd, ...tracks.flatMap((t) => t.notes.map((n) => n.t + n.dur)));
}
