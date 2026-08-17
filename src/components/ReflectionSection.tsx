import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { MoodReflection } from "@/lib/moodTypes";

interface Prompt {
  key: keyof MoodReflection;
  icon: string;
  title: string;
  subtitle: string;
  placeholder: string;
}

const PROMPTS: Prompt[] = [
  {
    key: "biggestWin",
    icon: "🌟",
    title: "Today's Biggest Win",
    subtitle: "What is something you're proud of today, big or small?",
    placeholder: "e.g., finished a workout, had a good chat, made my bed...",
  },
  {
    key: "onMyMind",
    icon: "💭",
    title: "What Was On Your Mind?",
    subtitle: "Did anything happen today that affected how you were feeling?",
    placeholder: "e.g., a busy meeting, a kind message, a change of plans...",
  },
  {
    key: "highlight",
    icon: "✨",
    title: "Today's Highlight",
    subtitle: "What was your favorite or most meaningful moment today?",
    placeholder: "e.g., sunset walk, coffee with a friend, a quiet moment...",
  },
  {
    key: "difficult",
    icon: "🌧️",
    title: "Anything Difficult?",
    subtitle: "Was there anything frustrating, stressful, or upsetting today?",
    placeholder: "Only if you want to — no pressure to share.",
  },
  {
    key: "anythingElse",
    icon: "📝",
    title: "Anything Else?",
    subtitle: "Is there anything else you'd like to remember about today?",
    placeholder: "Anything at all — a thought, a plan, a reminder...",
  },
];

interface ReflectionSectionProps {
  value?: MoodReflection;
  onChange?: (value: MoodReflection) => void;
}

export function ReflectionSection({ value, onChange }: ReflectionSectionProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    PROMPTS.forEach((p) => {
      initial[p.key] = Boolean(value?.[p.key]?.trim());
    });
    return initial;
  });

  const update = (key: keyof MoodReflection, text: string) => {
    const next = { ...(value ?? {}), [key]: text };
    onChange?.(next);
  };

  const toggleOpen = (key: keyof MoodReflection) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">
          Want to reflect on your day?
        </p>
        <p className="text-xs text-muted-foreground">
          You can answer any of these, or skip them — it's completely up to you.
        </p>
      </div>

      <div className="space-y-2">
        {PROMPTS.map((prompt) => {
          const text = value?.[prompt.key] ?? "";
          const isOpen = openMap[prompt.key] ?? false;
          const hasText = text.trim().length > 0;

          return (
            <Collapsible
              key={prompt.key}
              open={isOpen}
              onOpenChange={() => toggleOpen(prompt.key)}
            >
              <div className="glass rounded-2xl p-3 transition-smooth hover:ring-glow/30">
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left flex items-start gap-3 focus:outline-none">
                    <span className="text-xl shrink-0" aria-hidden="true">
                      {prompt.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {prompt.title}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        {prompt.subtitle}
                      </p>
                      {!isOpen && hasText && (
                        <p className="text-xs text-accent/80 mt-1 truncate">
                          {text}
                        </p>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="overflow-hidden transition-all">
                  <div className="pt-3 pl-10">
                    <Textarea
                      value={text}
                      onChange={(e) => update(prompt.key, e.target.value)}
                      placeholder={prompt.placeholder}
                      rows={2}
                      className="glass border-accent/20 rounded-xl text-sm resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Optional — write as much or as little as you like.
                    </p>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </section>
  );
}
