import { useState } from "react";
import {
  Bell,
  Trash2,
  Shield,
  Heart,
  Cloud,
  Moon,
  Sun,
  Palette,
  Accessibility,
  Download,
  FileText,
  Info,
  Mail,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteMoodEntry } from "@/lib/moodApi";
import type { MoodEntry } from "@/lib/moodTypes";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { LIGHT_HUES, DARK_HUES, type HueOption } from "@/lib/themeHue";
import { usePreferences, STICKER_SETS } from "@/hooks/usePreferences";
import { cn } from "@/lib/utils";

interface Props {
  entries: MoodEntry[];
}

const APP_VERSION = "1.4.0";
const CONTACT_EMAIL = "diyasrinivasan9@gmail.com";

const Card = ({
  icon,
  title,
  subtitle,
  children,
  tone = "accent",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  tone?: "accent" | "destructive";
}) => (
  <section className="rounded-3xl glass p-5 shadow-card">
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ring-1",
          tone === "accent"
            ? "bg-accent/15 text-accent ring-accent/30"
            : "bg-destructive/10 text-destructive ring-destructive/30",
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium tracking-wide">{title}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 font-light">{subtitle}</p>}
        {children}
      </div>
    </div>
  </section>
);

const ToggleRow = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <div className="min-w-0">
      <div className="text-sm">{label}</div>
      <p className="text-xs text-muted-foreground font-light">{hint}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
  </div>
);

const HuePicker = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: HueOption[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <div>
    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          title={o.label}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-2 text-xs min-h-11 transition-smooth",
            value === o.id
              ? "bg-primary/20 border-accent/50 ring-1 ring-accent/40 text-foreground"
              : "glass border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className="h-4 w-4 rounded-full border border-border"
            style={{ background: o.swatch }}
          />
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export const SettingsScreen = ({ entries }: Props) => {
  const [confirming, setConfirming] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [doc, setDoc] = useState<null | "privacy" | "terms">(null);
  const { theme, setTheme } = useTheme();
  const { prefs, update } = usePreferences();

  const toggleReminders = async (val: boolean) => {
    if (val && "Notification" in window && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Notifications blocked. Enable them in browser settings.");
        return;
      }
    }
    update({ reminders: val });
    localStorage.setItem("mm.reminders", val ? "1" : "0");
    toast.success(val ? "Reminders on" : "Reminders off");
  };

  const setTime = (t: string) => {
    update({ reminderTime: t });
    localStorage.setItem("mm.reminderTime", t);
  };

  const exportHistory = () => {
    if (!entries.length) {
      toast.error("No entries to export yet");
      return;
    }
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mood-mirror-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Mood history exported");
  };

  const erase = async () => {
    setErasing(true);
    try {
      await Promise.all(entries.map((e) => deleteMoodEntry(e.id)));
      toast.success("All entries removed from cloud");
    } catch {
      toast.error("Some entries could not be removed");
    } finally {
      setErasing(false);
      setConfirming(false);
    }
  };

  return (
    <div className="px-5 pt-10 pb-32 space-y-5 animate-fade-in relative">
      <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />
      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Preferences</p>
        <h1 className="font-display text-2xl mt-2 tracking-widest text-glow">Settings</h1>
      </header>

      {/* Appearance */}
      <Card icon={<Palette className="h-5 w-5" />} title="Appearance" subtitle="Choose how Mood Mirror looks.">
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm transition-smooth border min-h-11",
              theme === "dark"
                ? "bg-primary/20 border-accent/50 text-foreground ring-1 ring-accent/40"
                : "glass border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={theme === "dark"}
          >
            <Moon className="h-4 w-4" /> Dark Mode
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm transition-smooth border min-h-11",
              theme === "light"
                ? "bg-primary/20 border-accent/50 text-foreground ring-1 ring-accent/40"
                : "glass border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={theme === "light"}
          >
            <Sun className="h-4 w-4" /> Light Mode
          </button>
        </div>
      </Card>

      {/* Theme hue */}
      <Card
        icon={<Palette className="h-5 w-5" />}
        title="Theme colour"
        subtitle={`Colours available for ${theme === "dark" ? "Dark" : "Light"} Mode.`}
      >
        <div className="mt-4 space-y-5">
          {theme === "dark" ? (
            <HuePicker
              key="dark"
              label="Dark Mode hue"
              options={DARK_HUES}
              value={activeHueId}
              onChange={(id) => update({ darkHue: id })}
            />
          ) : (
            <HuePicker
              key="light"
              label="Light Mode hue"
              options={LIGHT_HUES}
              value={activeHueId}
              onChange={(id) => update({ lightHue: id })}
            />
          )}
          <div className="flex items-center gap-3">
            <div
              className="h-10 flex-1 rounded-2xl border border-border"
              style={{ background: "var(--gradient-primary)" }}
              aria-label="Current theme preview"
            />
            <div className="h-10 w-10 rounded-2xl border border-border bg-card" />
            <div className="h-10 w-10 rounded-2xl border border-border bg-accent" />
            <button
              type="button"
              onClick={() => {
                update(theme === "dark" ? { darkHue: "default" } : { lightHue: "default" });
                toast.success("Theme colour reset");
              }}
              className="rounded-2xl glass px-3 py-2 text-xs min-h-11 text-muted-foreground hover:text-foreground transition-smooth"
            >
              Reset
            </button>
          </div>
        </div>
      </Card>

      {/* Sticker Set */}
      <Card icon={null} title="Sticker set" subtitle="Pick the icon style for your moods.">
        <div className="mt-4 grid grid-cols-2 gap-2">
          {STICKER_SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => update({ stickerSet: s.id })}
              aria-pressed={prefs.stickerSet === s.id}
              className={cn(
                "rounded-2xl px-3 py-3 text-left transition-smooth border min-h-11",
                prefs.stickerSet === s.id
                  ? "bg-primary/20 border-accent/50 ring-1 ring-accent/40"
                  : "glass border-transparent hover:text-foreground",
              )}
            >
              <div className="text-base leading-none tracking-widest">{s.preview.join(" ")}</div>
              <div className="text-xs text-muted-foreground mt-2">{s.label}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card icon={<Bell className="h-5 w-5" />} title="Notifications" subtitle="A gentle nudge to reflect.">
        <div className="mt-2 divide-y divide-border/40">
          <ToggleRow
            label="Daily reminder"
            hint="Get reminded to log your mood."
            checked={prefs.reminders}
            onChange={toggleReminders}
          />
          {prefs.reminders && (
            <div className="flex items-center gap-3 py-3">
              <span className="text-sm text-muted-foreground">Remind me at</span>
              <Input
                type="time"
                aria-label="Reminder time"
                value={prefs.reminderTime}
                onChange={(e) => setTime(e.target.value)}
                className="w-32 rounded-xl glass border-accent/20"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Accessibility */}
      <Card icon={<Accessibility className="h-5 w-5" />} title="Accessibility" subtitle="Adjust readability and motion.">
        <div className="mt-2 divide-y divide-border/40">
          <ToggleRow
            label="Larger text"
            hint="Increase text size across the app."
            checked={prefs.largerText}
            onChange={(v) => update({ largerText: v })}
          />
          <ToggleRow
            label="Reduce motion"
            hint="Minimise animations and transitions."
            checked={prefs.reduceMotion}
            onChange={(v) => update({ reduceMotion: v })}
          />
          <ToggleRow
            label="High contrast"
            hint="Stronger text and border contrast."
            checked={prefs.highContrast}
            onChange={(v) => update({ highContrast: v })}
          />
        </div>
      </Card>

      {/* Cloud sync */}
      <Card icon={<Cloud className="h-5 w-5" />} title="Cloud sync" subtitle="Entries are synced securely in real time across your devices.">
        <p className="text-[10px] text-accent/70 mt-2 uppercase tracking-[0.2em]">{entries.length} entries in cloud</p>
      </Card>

      {/* Privacy */}
      <Card icon={<Shield className="h-5 w-5" />} title="Privacy" subtitle="Camera frames for mood scans are processed locally and never uploaded.">
        <div className="mt-3 divide-y divide-border/40">
          <button
            type="button"
            onClick={() => setDoc("privacy")}
            className="w-full flex items-center justify-between gap-3 py-3 text-sm min-h-11 hover:text-accent transition-smooth"
          >
            <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Privacy Policy</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setDoc("terms")}
            className="w-full flex items-center justify-between gap-3 py-3 text-sm min-h-11 hover:text-accent transition-smooth"
          >
            <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Terms of Service</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={exportHistory}
            className="w-full flex items-center justify-between gap-3 py-3 text-sm min-h-11 hover:text-accent transition-smooth"
          >
            <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Export mood history</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => toast("Account deletion is coming soon", { description: `Email ${CONTACT_EMAIL} to request removal.` })}
            className="w-full flex items-center justify-between gap-3 py-3 text-sm min-h-11 text-destructive hover:opacity-80 transition-smooth"
          >
            <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete account</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
          </button>
        </div>
      </Card>

      {/* Erase all data */}
      <Card
        icon={<Trash2 className="h-5 w-5" />}
        tone="destructive"
        title="Erase all data"
        subtitle="Delete every entry from the cloud. Cannot be undone."
      >
        {!confirming ? (
          <Button onClick={() => setConfirming(true)} variant="outline" className="mt-3 rounded-full text-destructive border-destructive/30 hover:bg-destructive/10">
            Erase data
          </Button>
        ) : (
          <div className="flex gap-2 mt-3">
            <Button onClick={() => setConfirming(false)} variant="outline" className="rounded-full flex-1 glass border-accent/20">Cancel</Button>
            <Button onClick={erase} disabled={erasing} className="rounded-full flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {erasing ? "Erasing..." : "Yes, erase"}
            </Button>
          </div>
        )}
      </Card>

      {/* About */}
      <Card icon={<Info className="h-5 w-5" />} title="About" subtitle="Mood Mirror Journal">
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">App</dt>
            <dd>Mood Mirror</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Version</dt>
            <dd>{APP_VERSION}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Developer</dt>
            <dd>Diya Srinivasan</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Contact</dt>
            <dd>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {CONTACT_EMAIL}
              </a>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Credits</dt>
            <dd className="text-right">Icons by Lucide · Face analysis by MediaPipe</dd>
          </div>
        </dl>
      </Card>

      <footer className="text-center text-[11px] text-muted-foreground pt-2 flex items-center justify-center gap-1.5 tracking-wider uppercase">
        Made with <Heart className="h-3 w-3 text-accent fill-accent" /> · Mood Mirror
      </footer>

      <Dialog open={doc !== null} onOpenChange={(o) => !o && setDoc(null)}>
        <DialogContent className="glass-strong rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest">
              {doc === "terms" ? "Terms of Service" : "Privacy Policy"}
            </DialogTitle>
            <DialogDescription className="text-left text-xs leading-relaxed pt-2 space-y-3">
              {doc === "terms" ? (
                <>
                  Mood Mirror is provided for personal reflection and wellbeing journaling. It is not a
                  medical device and does not provide diagnosis or treatment. You are responsible for the
                  content you log and share with connections. Continued use means you accept these terms.
                </>
              ) : (
                <>
                  Your mood entries are stored in your private account and are only visible to you, plus any
                  connection you explicitly invite. Camera frames used for mood scans are processed on your
                  device and never uploaded. You may export or erase your data at any time from this page.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};
