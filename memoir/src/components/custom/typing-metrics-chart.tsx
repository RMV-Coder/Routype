"use client";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  Tooltip,
  ResponsiveContainer,
  DotProps
} from "recharts";
import { ChartTooltipContent, ChartContainer, ChartConfig } from "@/components/ui/chart"; // reuse if needed

interface MetricPoint {
  second: number;
  chars: number;
  errors: number;
  rawWPM: number;
}
const chartConfig = {
    chars:{
        color:'var(--color-primary)'
    },
    errors:{
        color:'var(--color-sestructive)'
    },
    rawWPM:{
        color:'var(--color-foreground)'
    }
};

const ErrorDot = (props: DotProps & { payload?: {errors?: number} }) => {
    const { cx, cy, payload } = props;
    if (!payload || payload.errors === undefined || payload.errors <= 0) {
      return null;
    }
    return <circle cx={cx} cy={cy} r={4} fill="red" />;
  };

export function TypingMetricsLineChart({ data }: { data: MetricPoint[] }) {
  
    return (
    // <Card>
    //   <CardHeader>
    //     <CardTitle>Typing Metrics Over Time</CardTitle>
    //     <CardDescription>Per-second stats: chars, errors, raw WPM</CardDescription>
    //   </CardHeader>
    //   <CardContent>
        <div className="w-full h-64"> {/* ensure parent has height */}
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart accessibilityLayer data={data} margin={{ top: 10, right: 50, left: 20, bottom: 5 }}>
              <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="second" label={{value: "Seconds", position: "insideBottom", offset:0}} />
              <YAxis yAxisId={'left'} orientation="left" label={{value:"Words Per Minute", angle: -90, position: "insideLeft"}}/>
              <YAxis yAxisId={'right'} orientation="right" label={{value:"Errors", angle:90, position: "insideRight"}}/>
              <Tooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId={'left'}
                type="monotone"
                dataKey="chars"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{r:3, fill:'var(--color-primary)'}}
                name="Chars/s"
              />
              <Line
                yAxisId={'right'}
                type="monotone"
                dataKey="errors"
                stroke="none"
                dot={<ErrorDot/>}
                name="Errors"
                connectNulls
              />
              <Line
                yAxisId={'left'}
                type="monotone"
                dataKey="rawWPM"
                stroke="var(--color-foreground)"
                strokeWidth={2}
                dot={{r:3, fill:'var(--color-foreground)'}}
                name="Raw WPM"
              />
            </LineChart>
          </ResponsiveContainer>
          </ChartContainer>
        </div>
    //   </CardContent>
    //   <CardFooter>
    //     <div className="text-sm text-muted-foreground">Raw data per second</div>
    //   </CardFooter>
    // </Card>
  );
}
