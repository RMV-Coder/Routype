"use client";

import { LineChart, CartesianGrid, XAxis, YAxis, Line, ResponsiveContainer, Tooltip, type DotProps } from "recharts";
import type { MetricPoint } from "@/lib/definitions";

const ErrorDot = (props: DotProps & { payload?: { errors?: number } }) => {
  const { cx, cy, payload } = props;
  if (!payload?.errors) return null;
  return <circle cx={cx} cy={cy} r={4} fill="var(--color-destructive)" />;
};

/** Per-second raw WPM with error markers, shown after a test. */
export function TypingMetricsLineChart({ data }: { data: MetricPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="second" tickLine={false} fontSize={12} />
          <YAxis yAxisId="wpm" tickLine={false} fontSize={12} width={36} />
          <YAxis yAxisId="errors" orientation="right" tickLine={false} fontSize={12} width={24} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "var(--color-popover)", borderColor: "var(--color-border)", fontSize: 12 }}
            labelFormatter={(s) => `${s}s`}
          />
          <Line yAxisId="wpm" type="monotone" dataKey="rawWPM" name="raw wpm" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
          <Line yAxisId="errors" dataKey="errors" name="errors" stroke="none" dot={<ErrorDot />} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
