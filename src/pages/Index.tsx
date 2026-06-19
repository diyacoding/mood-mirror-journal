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
import { useMoodEntries } from "@/hooks/useMoodEntries";
import { useAuth } from "@/hooks/useAuth";
import { usePet } from "@/hooks/usePet";
import type { MoodKey } from "@/lib/moodTypes";
import type { MoodSaveResult } from "@/lib/moodApi";

const ONBOARD_KEY = "mm.onboarded";

const Index = () => {
  const [onboarded, setOnboarded] = useState<boolean>(
    () => localStorage.getItem(ONBOARD_KEY) === "1",
  );
  const [screen, setScreen] = useState<Screen>("home");
  const [prefilledMood, setPrefilledMood] = useState<MoodKey | undefined>();
  const [petHatchTrigger, setPetHatchTrigger] = useState(0);
  const { user, loading: authLoading } = useAuth();
  const { entries, loading } = useMoodEntries(user?.uid);
  const { owner: petOwner } = usePet(user?.uid ?? null);

  useEffect(() => {
    document.title = "Mood Mirror — Track moods, behaviors, and patterns";
    const desc = "A calming daily mood and behavior tracker, powered by Firebase.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARD_KEY, "1");
    setOnboarded(true);
  };

  const finishMoodSave = (result: MoodSaveResult) => {
    setPrefilledMood(undefined);
    if (result.petAward.pendingNewPet) setPetHatchTrigger(Date.now());
    setScreen(result.petAward.pendingNewPet ? "pet" : "home");
  };

  if (!onboarded) return <Onboarding onDone={finishOnboarding} />;
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0D001F] via-[#140028] to-black text-purple-100">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }
  if (!user) return <AuthScreen />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0D001F] via-[#140028] to-black text-purple-100">
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
