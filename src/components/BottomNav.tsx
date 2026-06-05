import { Home, BarChart3, Settings as SettingsIcon, Camera, Users, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

export type Screen = "home" | "log" | "scan" | "history" | "insights" | "settings" | "connections" | "pet";

interface Props {
  active: Screen;
  onChange: (s: Screen) => void;
}

const items: { key: Screen; label: string; icon: any }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "pet", label: "Pet", icon: PawPrint },
  { key: "scan", label: "Scan", icon: Camera },
  { key: "connections", label: "Connect", icon: Users },
  { key: "insights", label: "Insights", icon: BarChart3 },
];

export const BottomNav = ({ active, onChange }: Props) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
      <div className="pointer-events-auto mx-3 mb-4 w-full max-w-md rounded-full glass-strong shadow-glow">
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
                        ? "h-14 w-14 -mt-7 gradient-primary text-primary-foreground shadow-glow ring-2 ring-accent/40"
                        : "h-9 w-9",
                      !isCenter && isActive && "bg-accent/15 text-accent ring-glow",
                      !isCenter && !isActive && "text-muted-foreground group-hover:text-accent"
                    )}
                  >
                    <Icon className={cn(isCenter ? "h-6 w-6" : "h-5 w-5")} />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium tracking-wider uppercase",
                      isActive ? "text-accent" : "text-muted-foreground"
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
