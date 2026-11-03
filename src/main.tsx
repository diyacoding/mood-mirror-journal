import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, getInitialTheme } from "./hooks/useTheme";
import { activateAccountPreferences, applyPreferences, getInitialPreferences } from "./hooks/usePreferences";
import { installAccountLifecycle } from "./lib/accountSession";
import { installAudioUnlockListener, installClickSoundListener } from "./lib/audioEngine";

applyTheme(getInitialTheme());
applyPreferences(getInitialPreferences());
installAudioUnlockListener();
installClickSoundListener();
installAccountLifecycle(activateAccountPreferences);

createRoot(document.getElementById("root")!).render(<App />);
