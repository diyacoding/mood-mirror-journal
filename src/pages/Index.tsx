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

const onboardKey = (uid: string) => `mm.onboarded.${uid}`;

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [prefilledMood, setPrefilledMood] = useState<MoodKey | undefined>();
  const [petHatchTrigger, setPetHatchTrigger] = useState(0);
  const { user, loading: authLoading } = useAuth();
  const { entries, loading } = useMoodEntries(user?.uid);
  const { owner: petOwner, items: pets, currentPet } = usePet(user?.uid ?? null);
  const { achievements } = useAchievements({
    uid: user?.uid,
    entries,
    owner: petOwner,
    items: pets,
  });

  const [onboarded, setOnboarded] = useState(false);
  useEffect(() => {
    if (!user) return;
    setOnboarded(localStorage.getItem(onboardKey(user.uid)) === "1");
  }, [user]);

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
    if (user) localStorage.setItem(onboardKey(user.uid), "1");
    setOnboarded(true);
  };

  const finishMoodSave = (result: MoodSaveResult) => {
    setPrefilledMood(undefined);
    if (entries.length === 0) celebrate("first-mood");
    if (result.petAward.pendingNewPet) {
      setPetHatchTrigger(Date.now());
      celebrate("new-pet");
    }
    setScreen(result.petAward.pendingNewPet ? "pet" : "home");
  };

  if (authLoading) {
    return (
      <main className="app-shell min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }
  if (!user) return <AuthScreen />;
  if (!onboarded) return <Onboarding onDone={finishOnboarding} />;

  return (
    <main className="app-shell min-h-screen">
      <div className="max-w-md mx-auto relative">
        {screen === "home" && (
          <HomeScreen
            entries={entries}
            loading={loading}
            onNavigate={setScreen}
            onLogToday={() => { setPrefilledMood(undefined); setScreen("log"); }}
          />
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
          <ProfileScreen
            user={user}
            entries={entries}
            pets={pets}
            currentPet={currentPet}
            achievements={achievements}
            onNavigate={setScreen}
          />
        )}
        {screen === "insights" && <InsightsScreen entries={entries} petOwner={petOwner} />}
        {screen === "connections" && <ConnectionsScreen user={user} />}
        {screen === "pet" && <PetScreen user={user} hatchTrigger={petHatchTrigger} />}
        {screen === "settings" && <SettingsScreen entries={entries} />}

        <BottomNav active={screen} onChange={setScreen} />
      </div>
    </main>
  );
};

export default Index;
