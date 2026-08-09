import { useState } from "react";
import { Sparkles, ArrowRight, Moon, Sun, Bell, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BrandLogo } from "@/components/BrandLogo";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences, STICKER_SETS } from "@/hooks/usePreferences";
import { cn } from "@/lib/utils";

interface Props {
  onDone: () => void;
}

const FUTURE_PACKS = ["Pusheen", "Chiikawa", "Usagi"];

export const Onboarding = ({ onDone }: Props) => {
  const [i, setI] = useState(0);
  const { theme, setTheme } = useTheme();
  const { prefs, update } = usePreferences();

  const next = () => (i < 3 ? setI(i + 1) : onDone());

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 gradient-aurora" />
      <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full gradient-glow blur-3xl opacity-70" />
      <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full gradient-glow blur-3xl opacity-50" />

      <div className="relative flex-1 overflow-y-auto px-7 pt-14 pb-6 max-w-md w-full mx-auto">
        {i === 0 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <img
              src={logo}
              alt="Mood Mirror Journal"
              className="w-44 h-44 object-contain mb-4 animate-glow-pulse animate-float border-0 bg-transparent"
            />
            <h1 className="font-display text-3xl mb-3 text-glow tracking-widest">Mood Mirror Journal</h1>
            <p className="text-muted-foreground font-light mb-6">
              A cozy daily companion for how you feel — and why.
            </p>
            <ul className="space-y-2 text-sm text-left w-full">
              {[
                ["📝", "Track your moods in seconds"],
                ["🪞", "Reflect through journaling"],
                ["🐣", "Grow a pet — solo or with a friend"],
                ["📊", "Discover mood insights & patterns"],
                ["💌", "Stay connected through letters"],
              ].map(([emoji, text]) => (
                <li key={text} className="rounded-2xl glass px-4 py-3 flex items-center gap-3">
                  <span className="text-xl">{emoji}</span>
                  <span className="font-light">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {i === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center">
              <h1 className="font-display text-2xl text-glow tracking-widest">Make it yours</h1>
              <p className="text-sm text-muted-foreground font-light mt-1">You can change this any time in Settings.</p>
            </div>

            <section className="rounded-3xl glass p-5 space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Appearance</h2>
              <div className="grid grid-cols-2 gap-3">
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      "rounded-2xl glass py-3 flex flex-col items-center gap-1 transition-smooth",
                      theme === t ? "ring-glow border-accent/60" : "hover:scale-[1.02]",
                    )}
                  >
                    {t === "dark" ? <Moon className="h-5 w-5 text-accent" /> : <Sun className="h-5 w-5 text-accent" />}
                    <span className="text-sm">{t === "dark" ? "Dark Mode" : "Light Mode"}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl glass p-5 space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Sticker set</h2>
              <div className="grid grid-cols-2 gap-3">
                {STICKER_SETS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update({ stickerSet: s.id })}
                    className={cn(
                      "rounded-2xl glass p-3 text-left transition-smooth",
                      prefs.stickerSet === s.id ? "ring-glow border-accent/60" : "hover:scale-[1.02]",
                    )}
                  >
                    <div className="text-lg leading-none">{s.preview.join(" ")}</div>
                    <div className="text-xs mt-2">{s.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground font-light">
                Coming soon: {FUTURE_PACKS.join(", ")} packs.
              </p>
            </section>

            <section className="rounded-3xl glass p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-accent" />
                  <span className="text-sm">Daily reminder</span>
                </div>
                <Switch
                  checked={prefs.reminders}
                  onCheckedChange={(v) => update({ reminders: v })}
                  aria-label="Daily reminder"
                />
              </div>
              {prefs.reminders && (
                <Input
                  type="time"
                  value={prefs.reminderTime}
                  onChange={(e) => update({ reminderTime: e.target.value })}
                  className="rounded-full"
                />
              )}
            </section>
          </div>
        )}

        {i === 2 && (
          <div className="space-y-5 animate-fade-in text-center">
            <h1 className="font-display text-2xl text-glow tracking-widest">Meet your pet</h1>
            <div className="flex items-center justify-center gap-3 text-4xl">
              <span className="animate-float">🥚</span>
              <ArrowRight className="h-5 w-5 text-accent" />
              <span className="animate-float">🐣</span>
              <ArrowRight className="h-5 w-5 text-accent" />
              <span className="animate-float">🐾</span>
            </div>
            <ul className="space-y-2 text-left">
              {[
                ["+10", "Log a mood to earn 10 Pet Points"],
                ["50", "Every 50 points spins the prize wheel for an accessory"],
                ["100", "Every 100 points hatches a brand-new pet"],
              ].map(([badge, text]) => (
                <li key={badge} className="rounded-2xl glass px-4 py-3 flex items-center gap-3">
                  <span className="h-10 w-10 shrink-0 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    {badge}
                  </span>
                  <span className="text-sm font-light">{text}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground font-light flex items-center justify-center gap-1">
              <PawPrint className="h-3.5 w-3.5" /> Connect with a friend to raise a pet together.
            </p>
          </div>
        )}

        {i === 3 && (
          <div className="flex flex-col items-center text-center animate-fade-in pt-10">
            <div className="w-32 h-32 mb-8 rounded-full glass flex items-center justify-center ring-glow animate-float">
              <Sparkles className="h-12 w-12 text-accent text-glow" />
            </div>
            <h1 className="font-display text-3xl mb-3 text-glow tracking-widest">You're ready</h1>
            <p className="text-muted-foreground font-light max-w-sm">
              You're ready to begin your Mood Mirror journey.
            </p>
          </div>
        )}
      </div>

      <div className="relative px-8 pb-10 space-y-5 max-w-md w-full mx-auto">
        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3].map((idx) => (
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
          {i === 0 && <>Get Started <ArrowRight className="ml-2 h-4 w-4" /></>}
          {i === 1 && <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
          {i === 2 && <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
          {i === 3 && <>Start Logging Moods <Sparkles className="ml-2 h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  );
};
