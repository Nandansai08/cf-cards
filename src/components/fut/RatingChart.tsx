import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RatingChart({ data }: { data: { date: string; rating: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="grid h-56 place-items-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
        Not enough rated contests yet to draw a rating history.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: string) => v.slice(0, 7)}
            minTickGap={36}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            stroke="var(--color-border)"
            domain={["dataMin - 100", "dataMax + 100"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              color: "var(--color-foreground)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="rating"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            fill="url(#ratingFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
