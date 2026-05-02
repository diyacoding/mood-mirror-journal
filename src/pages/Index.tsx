import { useEffect, useState } from "react";
import { BottomNav, Screen } from "@/components/BottomNav";
import { Onboarding } from "@/components/Onboarding";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { LogScreen } from "@/components/screens/LogScreen";
import { ScanScreen } from "@/components/screens/ScanScreen";
import { HistoryScreen } from "@/components/screens/HistoryScreen";
import { InsightsScreen } from "@/components/screens/InsightsScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { isOnboarded, loadEntries, MoodEntry, MoodKey, setOnboarded } from "@/lib/moodStore";

const Index = () => {
  const [onboarded, setOnboardedState] = useState<boolean>(() => isOnboarded());
  const [screen, setScreen] = useState<Screen>("home");
  const [entries, setEntries] = useState<MoodEntry[]>(() => loadEntries());
  const [prefilledMood, setPrefilledMood] = useState<MoodKey | undefined>();

  // Set page title for SEO
  useEffect(() => {
    document.title = "Mood Mirror — Track moods, behaviors, and patterns";
    const desc = "A calming daily mood and behavior tracker with private, on-device insights.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const refresh = () => setEntries(loadEntries());

  if (!onboarded) {
    return <Onboarding onDone={() => { setOnboarded(); setOnboardedState(true); }} />;
  }

  return (
    <main className="min-h-screen gradient-soft">
      <div className="max-w-md mx-auto relative">
        {screen === "home" && (
          <HomeScreen
            entries={entries}
            onNavigate={setScreen}
            onLogToday={() => { setPrefilledMood(undefined); setScreen("log"); }}
          />
        )}
        {screen === "log" && (
          <LogScreen
            initialMood={prefilledMood}
            onBack={() => setScreen("home")}
            onSaved={() => { refresh(); setPrefilledMood(undefined); setScreen("home"); }}
          />
        )}
        {screen === "scan" && (
          <ScanScreen
            onBack={() => setScreen("home")}
            onConfirm={(m) => { setPrefilledMood(m); setScreen("log"); }}
          />
        )}
        {screen === "history" && <HistoryScreen entries={entries} />}
        {screen === "insights" && <InsightsScreen entries={entries} />}
        {screen === "settings" && <SettingsScreen onCleared={() => { refresh(); setOnboardedState(false); }} />}

        <BottomNav active={screen} onChange={setScreen} />
      </div>
    </main>
  );
};

export default Index;
