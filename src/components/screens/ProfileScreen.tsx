import { useRef, useState } from "react";
import { format } from "date-fns";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import {
  Camera,
  Pencil,
  BarChart3,
  Users,
  Settings as SettingsIcon,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auth } from "@/lib/firebase";
import { useProfile } from "@/hooks/useProfile";
import { usePreferences, STICKER_SETS } from "@/hooks/usePreferences";
import { useTheme } from "@/hooks/useTheme";
import { computeStreak } from "@/lib/moodAnalytics";
import type { MoodEntry } from "@/lib/moodTypes";
import type { PetItem } from "@/lib/petTypes";
import type { AchievementState } from "@/hooks/useAchievements";
import type { Screen } from "@/components/BottomNav";
import { toast } from "sonner";

interface Props {
  user: User;
  entries: MoodEntry[];
  pets: PetItem[];
  currentPet: PetItem | null;
  achievements: AchievementState[];
  onNavigate: (s: Screen) => void;
}

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl glass p-4 text-center">
    <div className="font-display text-2xl text-glow leading-none">{value}</div>
    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">{label}</div>
  </div>
);

export const ProfileScreen = ({ user, entries, pets, currentPet, achievements, onNavigate }: Props) => {
  const { profile, update } = useProfile(user);
  const { prefs } = usePreferences();
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.displayName);
  const fileRef = useRef<HTMLInputElement>(null);

  const streak = computeStreak(entries);
  const reflections = entries.filter((e) => (e.note ?? "").trim().length > 0).length;
  const earned = achievements.filter((a) => a.unlocked);
  const stickerLabel = STICKER_SETS.find((s) => s.id === prefs.stickerSet)?.label ?? "Classic";

  const pickPhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 3_000_000) {
      toast.error("Please choose an image under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update({ photoDataUrl: String(reader.result) });
      toast.success("Profile picture updated");
    };
    reader.readAsDataURL(file);
  };

  const saveName = () => {
    const n = draftName.trim();
    if (!n) return;
    update({ displayName: n });
    setEditing(false);
    toast.success("Profile updated");
  };

  return (
    <div className="px-5 pt-10 pb-32 space-y-6 animate-fade-in relative">
      <div className="absolute -top-20 -left-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />

      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Your journey</p>
        <h1 className="font-display text-2xl mt-1 text-glow tracking-widest">Profile</h1>
      </header>

      <section className="rounded-3xl glass-strong p-6 shadow-glow flex flex-col items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative h-24 w-24 rounded-full overflow-hidden gradient-primary flex items-center justify-center ring-glow transition-smooth hover:scale-105"
          aria-label="Change profile picture"
        >
          {profile.photoDataUrl ? (
            <img src={profile.photoDataUrl} alt={`${profile.displayName} profile`} className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-3xl text-primary-foreground">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="absolute bottom-0 inset-x-0 bg-black/40 py-1 flex items-center justify-center">
            <Camera className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
        <div className="text-center">
          <div className="font-display text-xl tracking-widest">{profile.displayName}</div>
          {profile.username && <div className="text-xs text-accent/80">{profile.username}</div>}
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
            Joined {format(new Date(profile.joinedAt), "MMM yyyy")}
          </div>
        </div>
        <Button
          onClick={() => {
            setDraftName(profile.displayName);
            setEditing(true);
          }}
          variant="outline"
          className="rounded-full glass border-accent/30 h-10"
        >
          <Pencil className="h-4 w-4 mr-1" /> Edit profile
        </Button>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Day streak" value={streak} />
        <Stat label="Moods logged" value={entries.length} />
        <Stat label="Reflections" value={reflections} />
        <Stat label="Pets created" value={pets.length} />
      </div>

      <section className="rounded-3xl glass p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl glass flex items-center justify-center overflow-hidden">
          {currentPet ? (
            <img src={currentPet.imageDataUrl} alt="Current pet" className="h-full w-full object-contain" />
          ) : (
            <span className="text-3xl">🥚</span>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent/80">Current pet</div>
          <div className="font-display text-lg tracking-wider">
            {currentPet ? currentPet.name ?? "Companion" : "Unhatched"}
          </div>
        </div>
      </section>

      <section className="rounded-3xl glass p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Achievements</h3>
          <button onClick={() => onNavigate("achievements")} className="text-xs text-accent tracking-wider">
            See all
          </button>
        </div>
        {earned.length ? (
          <div className="flex flex-wrap gap-2">
            {earned.map((a) => (
              <span key={a.id} className="rounded-full glass px-3 py-1.5 text-sm" title={a.name}>
                {a.badge} <span className="text-xs">{a.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-light">No badges yet — log a mood to begin.</p>
        )}
      </section>

      <section className="rounded-3xl glass p-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-light">Sticker set</span>
          <span>{stickerLabel}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-light">Theme</span>
          <span>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</span>
        </div>
      </section>

      <section className="rounded-3xl glass p-2">
        {[
          { key: "achievements" as Screen, label: "Badges", icon: Trophy },
          { key: "calendar" as Screen, label: "Calendar", icon: CalendarDays },
          { key: "settings" as Screen, label: "Settings", icon: SettingsIcon },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-smooth hover:bg-accent/10"
          >
            <Icon className="h-4 w-4 text-accent" />
            <span className="flex-1 text-left text-sm">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
        <button
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-smooth hover:bg-destructive/10 text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="flex-1 text-left text-sm">Sign out</span>
        </button>
      </section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest">Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Display name</label>
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="rounded-full" />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-full glass border-accent/30"
            >
              <Camera className="h-4 w-4 mr-1" /> Change profile picture
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={saveName} className="rounded-full gradient-primary text-primary-foreground border-0 w-full">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
