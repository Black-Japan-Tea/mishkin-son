import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { shortDayLabel, type DailySleep } from "../../lib/stats";

interface SleepBarsProps {
  days: DailySleep[];
  /** Норма возраста, часы [от, до] */
  normHours: [number, number];
}

/** Сон по дням + полоса нормы возраста (план §7.3). */
export default function SleepBars({ days, normHours }: SleepBarsProps): React.JSX.Element {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="dayKey" tickFormatter={shortDayLabel} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" unit=" ч" width={48} />
          <Tooltip
            formatter={(value) => [`${String(value)} ч`, "Сон"]}
            labelFormatter={(label: unknown) => shortDayLabel(String(label))}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
          />
          <ReferenceArea y1={normHours[0]} y2={normHours[1]} fill="var(--sleep)" fillOpacity={0.12} />
          <Bar dataKey="hours" fill="var(--sleep)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
