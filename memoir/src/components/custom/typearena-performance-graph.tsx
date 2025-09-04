"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface PerformanceData {
    wpm: number;
    accuracy: number;
    timestamp: number;
}

interface TypeArenaPerformanceGraphProps {
    data: PerformanceData[];
    className?: string;
}

export function TypeArenaPerformanceGraph({ data, className }: TypeArenaPerformanceGraphProps) {
    const chartData = useMemo(() => {
        if (data.length === 0) return null;
        
        const maxWpm = Math.max(...data.map(d => d.wpm));
        const maxAccuracy = 100;
        const timeRange = data[data.length - 1].timestamp - data[0].timestamp;
        
        return {
            maxWpm,
            maxAccuracy,
            timeRange,
            points: data.map((point, index) => ({
                x: (point.timestamp - data[0].timestamp) / timeRange * 100,
                yWpm: (point.wpm / maxWpm) * 100,
                yAccuracy: point.accuracy,
                wpm: point.wpm,
                accuracy: point.accuracy,
                timestamp: point.timestamp
            }))
        };
    }, [data]);

    if (!chartData || data.length === 0) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="text-lg">Performance Graph</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                        No performance data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-lg">Performance Graph</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* WPM Graph */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Words Per Minute</span>
                            <span className="text-sm text-muted-foreground">
                                Max: {chartData.maxWpm} WPM
                            </span>
                        </div>
                        <div className="relative h-24 bg-muted/20 rounded-lg overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="wpmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={chartData.points.map((point, i) => 
                                        `${i === 0 ? 'M' : 'L'} ${point.x} ${100 - point.yWpm}`
                                    ).join(' ')}
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d={chartData.points.map((point, i) => 
                                        `${i === 0 ? 'M' : 'L'} ${point.x} ${100 - point.yWpm}`
                                    ).join(' ') + ` L 100 ${100 - chartData.points[chartData.points.length - 1].yWpm} L 100 100 Z`}
                                    fill="url(#wpmGradient)"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Accuracy Graph */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Accuracy</span>
                            <span className="text-sm text-muted-foreground">
                                Avg: {Math.round(data.reduce((sum, d) => sum + d.accuracy, 0) / data.length)}%
                            </span>
                        </div>
                        <div className="relative h-24 bg-muted/20 rounded-lg overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="accuracyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={chartData.points.map((point, i) => 
                                        `${i === 0 ? 'M' : 'L'} ${point.x} ${100 - point.yAccuracy}`
                                    ).join(' ')}
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d={chartData.points.map((point, i) => 
                                        `${i === 0 ? 'M' : 'L'} ${point.x} ${100 - point.yAccuracy}`
                                    ).join(' ') + ` L 100 ${100 - chartData.points[chartData.points.length - 1].yAccuracy} L 100 100 Z`}
                                    fill="url(#accuracyGradient)"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Time markers */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0s</span>
                        <span>{Math.round(chartData.timeRange / 1000)}s</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
