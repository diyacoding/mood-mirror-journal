import { Home, BarChart3, Clock, Settings as SettingsIcon, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export type Screen = "home" | "log" | "scan" | "history" | "insights" | "settings";

interface Props {
  active: Screen;
  onChange: (s: Screen) => void;
}

const items: { key: Screen; label: string; icon: any }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "history", label: "Timeline", icon: Clock },
  { key: "scan", label: "Scan", icon: Camera },
  { key: "insights", label: "Insights", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export const BottomNav = ({ active, onChange }: Props) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
      <div className="pointer-events-auto mx-3 mb-3 w-full max-w-md rounded-full border border-border bg-card/85 backdrop-blur-xl shadow-soft">
        <ul className="flex items-center justify-between px-2 py-2">
          {items.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            const isCenter = key === "scan";
            return (
              <li key={key} className="flex-1">
                <button
                  onClick={() => onChange(key)}
                  className={cn(
                    "group flex flex-col items-center justify-center w-full gap-0.5 transition-smooth",
                    isCenter && "relative"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full transition-smooth",
                      isCenter
                        ? "h-12 w-12 -mt-6 gradient-sky text-primary-foreground shadow-glow"
                        : "h-9 w-9",
                      !isCenter && isActive && "bg-primary/10 text-primary",
                      !isCenter && !isActive && "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon className={cn(isCenter ? "h-6 w-6" : "h-5 w-5")} />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
