import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/mood-mirror-logo.png";

export const AuthScreen = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) {
      toast.error("Enter a valid email and a 6+ character password");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Welcome ✨");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      toast.error(err?.message?.replace("Firebase: ", "") || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden bg-gradient-to-b from-[#0D001F] via-[#140028] to-black text-purple-100">
      <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full gradient-glow blur-3xl opacity-60" />
      <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full gradient-glow blur-3xl opacity-40" />

      <img src={logo} alt="Mood Mirror" className="w-28 h-28 mb-6 animate-glow-pulse relative" />
      <h1 className="font-display text-3xl tracking-widest text-glow mb-1 relative">Mood Mirror</h1>
      <p className="text-xs uppercase tracking-[0.25em] text-accent/80 mb-8 relative">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </p>

      <form onSubmit={submit} className="w-full max-w-sm space-y-4 glass-strong rounded-3xl p-6 relative shadow-glow">
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="glass border-accent/20 rounded-xl"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="glass border-accent/20 rounded-xl"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-12 tracking-wider"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-xs text-accent/80 hover:text-accent transition-smooth"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
};
