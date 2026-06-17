import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import type { ReflectionTrend } from "@/lib/reflectionAnalytics";

interface Props { trend: ReflectionTrend }

const Bar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
      <span>{label}</span>
      <span className="text-accent">{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
      <div
        className="h-full rounded-full transition-smooth"
        style={{
          width: `${value}%`,
          background: "linear-gradient(90deg, hsl(264 100% 65%), hsl(285 100% 75%))",
          boxShadow: "0 0 10px hsl(270 96% 65% / 0.6)",
        }}
      />
    </div>
  </div>
);

export const ReflectionScoreCard = ({ trend }: Props) => {
  const { current, delta } = trend;
  const TrendIcon = delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus;
  const trendColor = delta > 1 ? "text-emerald-300" : delta < -1 ? "text-rose-300" : "text-muted-foreground";

  return (
    <section className="rounded-3xl glass p-5 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
          Reflection Score
        </h2>
      </div>

      <div className="flex items-end gap-3">
        <div className="font-display text-5xl text-glow leading-none">{current.total}</div>
        <div className="text-xs text-muted-foreground mb-1">/ 100</div>
        <div className={`ml-auto flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span>
            {delta > 0 ? "+" : ""}
            {delta} vs last week
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Bar label="Emotional stability" value={current.stability} />
        <Bar label="Positivity" value={current.positivity} />
        <Bar label="Consistency" value={current.consistency} />
      </div>

      <p className="text-[11px] text-muted-foreground font-light">
        Based on {current.entryCount} entries across {current.daysCovered} day
        {current.daysCovered === 1 ? "" : "s"} this week.
      </p>
    </section>
  );
};
