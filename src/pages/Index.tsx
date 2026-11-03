import { useEffect, useState } from "react";
import { BottomNav, Screen } from "@/components/BottomNav";
import { Onboarding } from "@/components/Onboarding";
import { AuthScreen } from "@/components/AuthScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { LogScreen } from "@/components/screens/LogScreen";
import { ScanScreen } from "@/components/screens/ScanScreen";
import { HistoryScreen } from "@/components/screens/HistoryScreen";
import { InsightsScreen } from "@/components/screens/InsightsScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { ConnectionsScreen } from "@/components/screens/ConnectionsScreen";
import { PetScreen } from "@/components/screens/PetScreen";
import { CalendarScreen } from "@/components/screens/CalendarScreen";
import { AchievementsScreen } from "@/components/screens/AchievementsScreen";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { useMoodEntries } from "@/hooks/useMoodEntries";
import { useAuth } from "@/hooks/useAuth";
import { usePet } from "@/hooks/usePet";
import { useAchievements } from "@/hooks/useAchievements";
import { celebrate } from "@/lib/celebrate";
import type { MoodKey } from "@/lib/moodTypes";
import type { MoodSaveResult } from "@/lib/moodApi";
import type { User } from "firebase/auth";
import { captureAccount } from "@/lib/accountSession";

const onboardKey = (uid: string) => `mm.onboarded.${uid}`;

const Index = () => {
  const { user, loading, revision } = useAuth();
  if (loading) return <main className="app-shell min-h-screen flex items-center justify-center"><p className="text-sm text-muted-foreground">Loading…</p></main>;
  if (!user) return <AuthScreen />;
  return <AccountExperience key={`${user.uid}:${revision}`} user={user} />;
};

const AccountExperience = ({ user }: { user: User }) => {
  const isCurrent = captureAccount(user.uid);
  const [screen, setScreen] = useState<Screen>("home");
  const [prefilledMood, setPrefilledMood] = useState<MoodKey | undefined>();
  const [petHatchTrigger, setPetHatchTrigger] = useState(0);
  const { entries, loading, error: moodError } = useMoodEntries(user?.uid);
  const { owner: petOwner, items: pets, currentPet, loading: petLoading, itemsLoading, error: petError } = usePet(user?.uid ?? null);
  const { achievements } = useAchievements({
    uid: user?.uid,
    entries,
    owner: petOwner,
    items: pets,
    ready: !loading && !moodError && !petLoading && !itemsLoading && !petError,
  });

  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(onboardKey(user.uid)) === "1");

  useEffect(() => {
    document.title = "Mood Mirror — Track moods, behaviors, and patterns";
    const desc = "A calming daily mood and behavior tracker with journaling, insights, and a growing pet.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const finishOnboarding = () => {
    if (!isCurrent()) return;
    if (user) localStorage.setItem(onboardKey(user.uid), "1");
    setOnboarded(true);
  };

  const finishMoodSave = (result: MoodSaveResult) => {
    if (!isCurrent()) return;
    setPrefilledMood(undefined);
    if (entries.length === 0) celebrate("first-mood");
    if (result.petAward.pendingNewPet) {
      setPetHatchTrigger(Date.now());
      celebrate("new-pet");
    }
    setScreen(result.petAward.pendingNewPet ? "pet" : "home");
  };

  if (!onboarded) return <Onboarding onDone={finishOnboarding} />;

  return (
    <main className="app-shell min-h-screen">
      {/* Keyed by account: switching users remounts every screen, wiping all per-account UI state. */}
      <div key={user.uid} className="max-w-md mx-auto relative">
        {screen === "home" && (
          <div className="notebook-scope">
            <HomeScreen
              entries={entries}
              loading={loading}
              onNavigate={setScreen}
              onLogToday={() => { setPrefilledMood(undefined); setScreen("log"); }}
            />
          </div>
        )}
        {screen === "log" && (
          <LogScreen
            initialMood={prefilledMood}
            onBack={() => setScreen("home")}
            onSaved={finishMoodSave}
          />
        )}
        {screen === "scan" && (
          <ScanScreen
            onBack={() => setScreen("home")}
            onConfirm={finishMoodSave}
          />
        )}
        {screen === "history" && <HistoryScreen entries={entries} loading={loading} />}
        {screen === "calendar" && <CalendarScreen entries={entries} />}
        {screen === "achievements" && <AchievementsScreen achievements={achievements} />}
        {screen === "profile" && (
          <div className="notebook-scope">
            <ProfileScreen
              user={user}
              entries={entries}
              pets={pets}
              currentPet={currentPet}
              achievements={achievements}
              onNavigate={setScreen}
            />
          </div>
        )}
        {screen === "insights" && (
          <div className="notebook-scope">
            <InsightsScreen entries={entries} petOwner={petOwner} />
          </div>
        )}
        {screen === "connections" && <ConnectionsScreen user={user} />}
        {screen === "pet" && (
          <PetScreen
            user={user}
            hatchTrigger={petHatchTrigger}
            onLogMood={() => { setPrefilledMood(undefined); setScreen("log"); }}
          />
        )}
        {screen === "settings" && <SettingsScreen entries={entries} />}

        <BottomNav active={screen} onChange={setScreen} />
      </div>
    </main>
  );
};

export default Index;
