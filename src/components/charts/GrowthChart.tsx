import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ageInMonths } from "../../lib/time";
import { seriesAt } from "../../lib/who/growth-data";
import { seriesFor } from "../../lib/who/percentiles";
import type { ChildSex, Measurement, MeasurementType } from "../../lib/types";

interface GrowthChartProps {
  type: MeasurementType;
  sex: ChildSex | null;
  birthDate: string;
  measurements: Measurement[];
}

const UNIT: Record<MeasurementType, string> = { weight: "кг", height: "см", head: "см" };

/** Кривая ВОЗ: полоса ±2SD, медиана и точки малыша (план §5.5). */
export default function GrowthChart({ type, sex, birthDate, measurements }: GrowthChartProps): React.JSX.Element {
  const series = seriesFor(type, sex);
  const months = Math.min(series.median.length - 1, 24);
  const band = Array.from({ length: months + 1 }, (_, m) => {
    const { median, sd } = seriesAt(series, m);
    return { month: m, median, band: [median - 2 * sd, median + 2 * sd] };
  });
  const points = measurements
    .filter((m) => m.type === type)
    .map((m) => ({
      month: Math.round(ageInMonths(birthDate, new Date(m.measuredAt)) * 10) / 10,
      value: m.value,
    }))
    .sort((a, b) => a.month - b.month);

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={band} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            unit=" м"
            type="number"
            domain={[0, months]}
          />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={44} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
            formatter={(value, name) =>
              name === "median"
                ? [`${String(value)} ${UNIT[type]}`, "Медиана ВОЗ"]
                : [String(value), "Малыш"]
            }
            labelFormatter={(m) => `${String(m)} мес`}
          />
          <Area dataKey="band" stroke="none" fill="var(--sleep)" fillOpacity={0.15} />
          <Line dataKey="median" stroke="var(--sleep)" strokeWidth={2} dot={false} />
          <ReferenceLine x={0} stroke="none" />
          <Scatter data={points} dataKey="value" fill="var(--food)">
            <ZAxis dataKey="value" range={[40, 40]} />
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
