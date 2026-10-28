import { Noto_Music } from "next/font/google";
import { ConcertHall } from "@/components/music/concert-hall";

// clefs and sharps for the Sheet view, which draws on a canvas
const notoMusic = Noto_Music({ weight: "400", subsets: ["music"] });

export default function ConcertHallPage() {
  return <ConcertHall musicFont={notoMusic.style.fontFamily} />;
}
