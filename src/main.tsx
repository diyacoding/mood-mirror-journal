import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, getInitialTheme } from "./hooks/useTheme";
import { applyPreferences, getInitialPreferences } from "./hooks/usePreferences";
import { installAudioUnlockListener } from "./lib/audioEngine";

applyTheme(getInitialTheme());
applyPreferences(getInitialPreferences());
installAudioUnlockListener();

createRoot(document.getElementById("root")!).render(<App />);
