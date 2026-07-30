import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, getInitialTheme } from "./hooks/useTheme";
import { applyPreferences, getInitialPreferences } from "./hooks/usePreferences";

applyTheme(getInitialTheme());
applyPreferences(getInitialPreferences());

createRoot(document.getElementById("root")!).render(<App />);
