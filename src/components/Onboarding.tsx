import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { onDone: () => void }

const slides = [
  {
    emoji: "🪞",
    title: "Meet Mood Mirror",
    body: "A gentle daily companion to help you notice how you feel — and why.",
  },
  {
    emoji: "🌱",
    title: "Track mood & habits",
    body: "Log your mood with a tap, add a few daily behaviors, and watch patterns emerge.",
  },
  {
    emoji: "✨",
    title: "Quiet, private insights",
    body: "Your data stays on your device. Insights are supportive, never clinical.",
  },
];

export const Onboarding = ({ onDone }: Props) => {
  const [i, setI] = useState(0);
  const slide = slides[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Enter" && next();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const next = () => (i < slides.length - 1 ? setI(i + 1) : onDone());

  return (
    <div className="min-h-screen flex flex-col gradient-dawn">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-7xl mb-8 animate-float">{slide.emoji}</div>
        <h1 key={slide.title} className="text-3xl font-semibold mb-3 text-foreground animate-fade-in">
          {slide.title}
        </h1>
        <p key={slide.body} className="text-muted-foreground max-w-sm leading-relaxed animate-fade-in">
          {slide.body}
        </p>
      </div>

      <div className="px-8 pb-12 space-y-6">
        <div className="flex justify-center gap-2">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-smooth ${
                idx === i ? "w-8 bg-primary" : "w-1.5 bg-primary/25"
              }`}
            />
          ))}
        </div>
        <Button onClick={next} size="lg" className="w-full rounded-full gradient-sky text-primary-foreground border-0 shadow-glow hover:opacity-95">
          {i === slides.length - 1 ? (
            <>Begin <Sparkles className="ml-2 h-4 w-4" /></>
          ) : (
            <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
};
