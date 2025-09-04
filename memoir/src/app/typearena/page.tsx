// "use client";

// import { useEffect, useMemo, useState, useRef } from "react";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { useTypeArena } from "@/hooks/use-typearena";
// import TypeArenaSettings from "@/components/custom/typearena-game-settings";
// import { TypeArenaPerformanceGraph } from "@/components/custom/typearena-performance-graph";
// import { Play, Users, Clock, Trophy } from "lucide-react";

// // Random word generator for solo mode
// const randomWords = [
//     "the", "be", "to", "of", "and", "a", "in", "that", "have", "I", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
//     "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
//     "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
//     "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
//     "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
// ];

// interface PerformancePoint {
//     wpm: number;
//     accuracy: number;
//     timestamp: number;
// }

// export default function TypeArenaLobbyPage() {
//     const [state, actions] = useTypeArena();
//     const [text, setText] = useState("");
//     const [matchIdInput, setMatchIdInput] = useState("");
//     const [soloMode, setSoloMode] = useState(false);
//     const [soloWords, setSoloWords] = useState<string[]>([]);
//     const [soloInput, setSoloInput] = useState("");
//     const [soloTimeLeft, setSoloTimeLeft] = useState(60);
//     const [soloStarted, setSoloStarted] = useState(false);
//     const [soloStats, setSoloStats] = useState<{
//         wpm: number;
//         accuracy: number;
//         correctChars: number;
//         totalChars: number;
//         errors: number;
//         keystrokes: number[];
//         timestamps: number[];
//     } | null>(null);
//     const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
//     const [sessionStartTime, setSessionStartTime] = useState<number>(0);
//     const performanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

//     const matchId = state.match?.id;

//     const handleCreate = async () => {
//         await actions.create(text || undefined);
//     };
    
//     const handleJoin = async () => {
//         if (!matchIdInput.trim()) return;
//         await actions.join(matchIdInput.trim());
//     };

//     const startSoloMode = () => {
//         const shuffled = [...randomWords].sort(() => Math.random() - 0.5).slice(0, 50);
//         setSoloWords(shuffled);
//         setSoloInput("");
//         setSoloTimeLeft(60);
//         setSoloStarted(true);
//         setSoloStats(null);
//         setPerformanceData([]);
//         const startTime = Date.now();
//         setSessionStartTime(startTime);
        
//         // Start performance tracking every 500ms
//         performanceIntervalRef.current = setInterval(() => {
//             if (soloInput.length > 0) {
//                 const currentTime = Date.now();
//                 const elapsed = (currentTime - startTime) / 1000; // seconds
//                 const targetText = soloWords.join(" ");
//                 let correctChars = 0;
                
//                 for (let i = 0; i < Math.min(soloInput.length, targetText.length); i++) {
//                     if (soloInput[i] === targetText[i]) {
//                         correctChars++;
//                     }
//                 }
                
//                 const accuracy = soloInput.length > 0 ? Math.round((correctChars / soloInput.length) * 100) : 100;
//                 const wpm = elapsed > 0 ? Math.round((correctChars / 5) / (elapsed / 60)) : 0;
                
//                 setPerformanceData(prev => [...prev, { wpm, accuracy, timestamp: currentTime }]);
//             }
//         }, 500);
//     };

//     const endSoloMode = () => {
//         setSoloStarted(false);
        
//         // Clear performance tracking
//         if (performanceIntervalRef.current) {
//             clearInterval(performanceIntervalRef.current);
//             performanceIntervalRef.current = null;
//         }
        
//         // Calculate final stats
//         const totalTyped = soloInput.length;
//         const targetText = soloWords.join(" ");
//         let correctChars = 0;
//         let errors = 0;
        
//         for (let i = 0; i < Math.min(totalTyped, targetText.length); i++) {
//             if (soloInput[i] === targetText[i]) {
//                 correctChars++;
//             } else {
//                 errors++;
//             }
//         }
        
//         const accuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;
//         const wpm = Math.round((correctChars / 5) / (60 / 60)); // 5 chars = 1 word, 60 seconds
        
//         setSoloStats({
//             wpm,
//             accuracy,
//             correctChars,
//             totalChars: totalTyped,
//             errors,
//             keystrokes: [], // TODO: Track keystrokes during typing
//             timestamps: [] // TODO: Track timestamps during typing
//         });
//     };

//     useEffect(() => {
//         if (soloStarted && soloTimeLeft > 0) {
//             const timer = setTimeout(() => {
//                 setSoloTimeLeft(prev => {
//                     if (prev <= 1) {
//                         endSoloMode();
//                         return 0;
//                     }
//                     return prev - 1;
//                 });
//             }, 1000);
//             return () => clearTimeout(timer);
//         }
//     }, [soloStarted, soloTimeLeft]);

//     // Cleanup interval on unmount
//     useEffect(() => {
//         return () => {
//             if (performanceIntervalRef.current) {
//                 clearInterval(performanceIntervalRef.current);
//             }
//         };
//     }, []);

//     const targetText = soloWords.join(" ");
//     const currentProgress = soloStarted ? Math.min(soloInput.length / Math.max(1, targetText.length) * 100, 100) : 0;

//     return (
//         <div className="mx-auto max-w-4xl p-6 space-y-6">
//             <div className="text-center">
//                 <h1 className="text-3xl font-bold mb-2">TypeArena</h1>
//                 <p className="text-muted-foreground">Challenge your typing speed against friends or practice solo</p>
//             </div>

//             {/* Solo Mode Section */}
//             <Card>
//                 <CardHeader>
//                     <CardTitle className="flex items-center gap-2">
//                         <Play className="h-5 w-5" />
//                         Solo Practice
//                     </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                     <TypeArenaSettings />
                    
//                     {!soloStarted ? (
//                         <div className="text-center">
//                             <Button 
//                                 onClick={startSoloMode} 
//                                 size="lg" 
//                                 className="px-8"
//                             >
//                                 Start 60-Second Challenge
//                             </Button>
//                         </div>
//                     ) : (
//                         <div className="space-y-4">
//                             <div className="flex justify-between items-center">
//                                 <div className="text-2xl font-mono font-bold">
//                                     {soloTimeLeft}s
//                                 </div>
//                                 <div className="text-sm text-muted-foreground">
//                                     Progress: {Math.round(currentProgress)}%
//                                 </div>
//                             </div>
                            
//                             <div className="border rounded-lg p-4 bg-muted/20">
//                                 <div className="font-mono text-lg leading-relaxed">
//                                     {soloWords.map((word, i) => (
//                                         <span key={i} className="mr-2">
//                                             {word}
//                                         </span>
//                                     ))}
//                                 </div>
//                             </div>
                            
//                             <div className="space-y-2">
//                                 <label className="text-sm font-medium">Type here:</label>
//                                 <Input
//                                     value={soloInput}
//                                     onChange={(e) => setSoloInput(e.target.value)}
//                                     placeholder="Start typing..."
//                                     className="font-mono text-lg"
//                                     autoFocus
//                                 />
//                             </div>
                            
//                             <Button 
//                                 onClick={endSoloMode} 
//                                 variant="outline"
//                                 className="w-full"
//                             >
//                                 End Session
//                             </Button>
//                         </div>
//                     )}
//                 </CardContent>
//             </Card>

//             {/* Solo Results */}
//             {soloStats && (
//                 <Card>
//                     <CardHeader>
//                         <CardTitle className="flex items-center gap-2">
//                             <Trophy className="h-5 w-5" />
//                             Session Results
//                         </CardTitle>
//                     </CardHeader>
//                     <CardContent className="space-y-6">
//                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
//                             <div>
//                                 <div className="text-2xl font-bold text-blue-600">{soloStats.wpm}</div>
//                                 <div className="text-sm text-muted-foreground">WPM</div>
//                             </div>
//                             <div>
//                                 <div className="text-2xl font-bold text-green-600">{soloStats.accuracy}%</div>
//                                 <div className="text-sm text-muted-foreground">Accuracy</div>
//                             </div>
//                             <div>
//                                 <div className="text-2xl font-bold text-purple-600">{soloStats.correctChars}</div>
//                                 <div className="text-sm text-muted-foreground">Correct</div>
//                             </div>
//                             <div>
//                                 <div className="text-2xl font-bold text-red-600">{soloStats.errors}</div>
//                                 <div className="text-sm text-muted-foreground">Errors</div>
//                             </div>
//                         </div>
                        
//                         {/* Performance Graph */}
//                         {performanceData.length > 0 && (
//                             <TypeArenaPerformanceGraph data={performanceData} />
//                         )}
                        
//                         <div className="text-center">
//                             <Button onClick={startSoloMode} variant="outline">
//                                 Try Again
//                             </Button>
//                         </div>
//                     </CardContent>
//                 </Card>
//             )}

//             {/* Multiplayer Section */}
//             <Card>
//                 <CardHeader>
//                     <CardTitle className="flex items-center gap-2">
//                         <Users className="h-5 w-5" />
//                         Multiplayer Challenge
//                     </CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                     <div className="space-y-2">
//                         <label className="text-sm font-medium">Custom text (optional)</label>
//                         <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Leave blank for default" />
//                         <Button onClick={handleCreate}>Create Match</Button>
//                     </div>
//                     <div className="space-y-2">
//                         <label className="text-sm font-medium">Join by Match ID</label>
//                         <div className="flex gap-2">
//                             <Input value={matchIdInput} onChange={(e) => setMatchIdInput(e.target.value)} placeholder="match id" />
//                             <Button variant="secondary" onClick={handleJoin}>Join</Button>
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>

//             {state.match && (
//                 <Card>
//                     <CardHeader>
//                         <CardTitle>Match: {state.match.id}</CardTitle>
//                     </CardHeader>
//                     <CardContent className="space-y-3">
//                         <div className="text-sm text-muted-foreground">Status: {state.match.status}</div>
//                         <div className="space-y-1">
//                             <div className="font-medium">Players</div>
//                             {Object.values(state.match.participants).map((p) => (
//                                 <div key={p.id} className="flex items-center justify-between text-sm">
//                                     <span>{p.name || p.id}</span>
//                                     <span>{p.ready ? "Ready" : "Not ready"}</span>
//                                 </div>
//                             ))}
//                         </div>
//                         <div className="flex gap-2">
//                             <Button onClick={() => actions.setReady(state.match!.id, true)}>Ready</Button>
//                             <Button variant="secondary" onClick={() => actions.setReady(state.match!.id, false)}>Unready</Button>
//                             <Button variant="outline" onClick={() => actions.leave(state.match!.id)}>Leave</Button>
//                             <Link href={`/typearena/${state.match.id}`} className="ml-auto">
//                                 <Button variant="default">Go to Game</Button>
//                             </Link>
//                         </div>
//                     </CardContent>
//                 </Card>
//             )}
//         </div>
//     );
// }

// app/typing/page.tsx
import TypingTestFixed from "@/components/custom/typing-test";
import TypingTest from "@/components/custom/typing-test";

const WORDS = "this is a sample typing test to demonstrate monkeytype like behavior with errors backspace and ghost replay parameter temple scatter crew expect burst doctor contraction remedy world great hate restaurant refer agreement parallel brake realism generate toast night dressing revolution different perform reactor excess convict lead threaten tell publish fix wisecrack deny memorandum biology stall tolerate pay inflation withdraw see ton persist meadow market scene video discreet".split(" ");

export default function Page() {
  return (
    <main className="container mx-auto p-6">
      <TypingTestFixed promptWords={WORDS} durationSec={60} />
      {/* Later: settings panel to switch caret style, allow-backspace-previous-words, etc. */}
    </main>
  );
}



