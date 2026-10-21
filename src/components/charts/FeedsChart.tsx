import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { shortDayLabel, type DailyFeeds } from "../../lib/stats";

interface FeedsChartProps {
  days: DailyFeeds[];
}

/** Кормления по дням: число (столбцы) и объём мл (линия). */
export default function FeedsChart({ days }: FeedsChartProps): React.JSX.Element {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="dayKey" tickFormatter={shortDayLabel} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis yAxisId="count" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} allowDecimals={false} />
          <YAxis yAxisId="ml" orientation="right" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={44} />
          <Tooltip
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
            formatter={(value, name) =>
              name === "ml" ? [`${String(value)} мл`, "Объём"] : [String(value), "Кормлений"]
            }
            labelFormatter={(label: unknown) => shortDayLabel(String(label))}
          />
          <Bar yAxisId="count" dataKey="count" fill="var(--food)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Line yAxisId="ml" type="monotone" dataKey="ml" stroke="var(--ai)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
