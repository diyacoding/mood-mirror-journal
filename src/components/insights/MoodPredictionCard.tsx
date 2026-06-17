import { Brain } from "lucide-react";
import { moodMeta } from "@/lib/moodTypes";
import type { MoodPrediction } from "@/lib/reflectionAnalytics";

interface Props { prediction: MoodPrediction | null }

export const MoodPredictionCard = ({ prediction }: Props) => {
  return (
    <section className="rounded-3xl glass p-5 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-accent" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
          Tomorrow's Mood
        </h2>
      </div>

      {!prediction ? (
        <p className="text-sm text-muted-foreground font-light">
          Log a few more days to unlock predictions.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="text-5xl drop-shadow-[0_0_18px_hsl(270_96%_75%/0.45)]">
              {moodMeta(prediction.predictedMood).emoji}
            </div>
            <div className="flex-1">
              <div className="font-display text-lg tracking-widest">
                {moodMeta(prediction.predictedMood).label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Predicted score {prediction.predictedScore} / 10
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl text-accent">{prediction.confidence}%</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Confidence
              </div>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${prediction.confidence}%`,
                background: "linear-gradient(90deg, hsl(264 100% 65%), hsl(285 100% 75%))",
                boxShadow: "0 0 10px hsl(270 96% 65% / 0.6)",
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            {prediction.explanation}
          </p>
        </>
      )}
    </section>
  );
};
