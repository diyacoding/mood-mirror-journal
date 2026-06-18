import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

// Three-stage celebratory hatch sequence:
// 1) shake  2) crack  3) burst + confetti  → onDone (open creator)
export const EggHatch = ({ onDone }: Props) => {
  const [stage, setStage] = useState<"shake" | "crack" | "burst">("shake");

  useEffect(() => {
    const t1 = setTimeout(() => setStage("crack"), 1400);
    const t2 = setTimeout(() => setStage("burst"), 2400);
    const t3 = setTimeout(() => onDone(), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  // Pre-computed confetti pieces
  const confetti = Array.from({ length: 28 }).map((_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const distance = 120 + Math.random() * 80;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const emojis = ["✨", "🎉", "💜", "💖", "⭐", "🌟", "🩷"];
    const emoji = emojis[i % emojis.length];
    const delay = Math.random() * 0.15;
    return { dx, dy, emoji, delay, key: i };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <style>{`
        @keyframes egg-shake {
          0%, 100% { transform: rotate(0) }
          15% { transform: rotate(-12deg) }
          30% { transform: rotate(10deg) }
          45% { transform: rotate(-8deg) }
          60% { transform: rotate(6deg) }
          75% { transform: rotate(-4deg) }
        }
        @keyframes egg-burst {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.9; }
          100% { transform: scale(0.2); opacity: 0; }
        }
        @keyframes confetti-fly {
          0% { transform: translate(0,0) scale(0.4); opacity: 0; }
          15% { opacity: 1; }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(1.2) rotate(360deg);
            opacity: 0;
          }
        }
        .egg-shake { animation: egg-shake 0.5s ease-in-out infinite; }
        .egg-burst { animation: egg-burst 1.2s ease-out forwards; }
        .confetti-piece { animation: confetti-fly 1.4s ease-out forwards; }
      `}</style>

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative h-48 w-48 flex items-center justify-center">
          {/* Glow */}
          <div className="absolute inset-0 rounded-full gradient-glow blur-3xl opacity-70" />

          {stage !== "burst" ? (
            <div
              className={stage === "shake" ? "egg-shake text-[8rem] leading-none" : "text-[8rem] leading-none"}
              style={{ filter: "drop-shadow(0 0 30px hsl(270 96% 70% / 0.7))" }}
            >
              {stage === "crack" ? "🐣" : "🥚"}
            </div>
          ) : (
            <>
              <div
                className="absolute egg-burst text-[8rem] leading-none"
                style={{ filter: "drop-shadow(0 0 40px hsl(270 96% 75% / 0.9))" }}
              >
                🥚
              </div>
              {confetti.map((c) => (
                <span
                  key={c.key}
                  className="absolute confetti-piece text-2xl"
                  style={{
                    // @ts-ignore CSS custom properties
                    "--dx": `${c.dx}px`,
                    "--dy": `${c.dy}px`,
                    animationDelay: `${c.delay}s`,
                  } as React.CSSProperties}
                >
                  {c.emoji}
                </span>
              ))}
            </>
          )}
        </div>

        <div className="text-center space-y-1 animate-fade-in">
          <p className="font-display text-2xl tracking-widest text-glow">
            {stage === "shake" && "Your egg is shaking…"}
            {stage === "crack" && "Cracks are forming!"}
            {stage === "burst" && "Your pet has hatched!"}
          </p>
          {stage === "burst" && (
            <p className="text-sm text-accent/80">Design your new companion ✨</p>
          )}
        </div>
      </div>
    </div>
  );
};
