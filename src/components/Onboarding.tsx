import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/mood-mirror-logo.png";

interface Props { onDone: () => void }

const slides = [
  {
    title: "Mood Mirror",
    body: "A luxurious daily companion to help you reflect on how you feel — and why.",
    showLogo: true,
  },
  {
    title: "Reflect",
    body: "Capture your emotions with a tap or a glance. Layered insights, never clinical.",
    showLogo: false,
  },
  {
    title: "Transform",
    body: "Quiet, private patterns emerge as you check in. Your reflection, your pace.",
    showLogo: false,
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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Aurora glow background */}
      <div className="absolute inset-0 gradient-aurora" />
      <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full gradient-glow blur-3xl opacity-70" />
      <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full gradient-glow blur-3xl opacity-50" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-8 text-center">
        {slide.showLogo ? (
          <img
            src={logo}
            alt="Mood Mirror"
            className="w-56 h-56 object-contain mb-6 animate-glow-pulse animate-float border-0 bg-transparent"
          />
        ) : (
          <div className="w-32 h-32 mb-8 rounded-full glass flex items-center justify-center ring-glow animate-float">
            <Sparkles className="h-12 w-12 text-accent text-glow" />
          </div>
        )}
        <h1 key={slide.title} className="font-display text-4xl mb-4 text-foreground text-glow animate-fade-in tracking-widest">
          {slide.title}
        </h1>
        <p key={slide.body} className="text-muted-foreground max-w-sm leading-relaxed animate-fade-in font-light">
          {slide.body}
        </p>
      </div>

      <div className="relative px-8 pb-12 space-y-6">
        <div className="flex justify-center gap-2">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-smooth ${
                idx === i ? "w-10 bg-accent shadow-glow" : "w-1.5 bg-accent/25"
              }`}
            />
          ))}
        </div>
        <Button
          onClick={next}
          size="lg"
          className="w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow hover:opacity-95 font-medium tracking-wider h-14"
        >
          {i === slides.length - 1 ? (
            <>Begin <Sparkles className="ml-2 h-4 w-4" /></>
          ) : (
            <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
};
