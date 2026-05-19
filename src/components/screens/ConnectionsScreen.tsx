import { useEffect, useRef, useState } from "react";
import { signOut, User } from "firebase/auth";
import { Copy, LogOut, Pencil, Send, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import {
  acceptInvite,
  createInvite,
  disconnect,
  sendDrawingMessage,
  sendTextMessage,
  shareMood,
  subscribeMessages,
  subscribeSharedMoods,
} from "@/lib/connectionsApi";
import { useConnection } from "@/hooks/useConnection";
import type {
  ConnectionMessage,
  ConnectionMood,
} from "@/lib/connectionsTypes";
import { MOODS, moodMeta, type MoodKey } from "@/lib/moodTypes";
import { MessageItem } from "@/components/connections/MessageItem";
import { DrawingCanvas } from "@/components/connections/DrawingCanvas";
import { format } from "date-fns";

interface Props {
  user: User;
}

export const ConnectionsScreen = ({ user }: Props) => {
  const { connection, loading } = useConnection(user.uid);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ConnectionMessage[]>([]);
  const [moods, setMoods] = useState<ConnectionMood[]>([]);
  const [showDraw, setShowDraw] = useState(false);
  const [shareMoodOpen, setShareMoodOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const active = connection?.status === "active";
  const cid = connection?.id;

  // Live subscriptions only when active
  useEffect(() => {
    if (!cid || !active) {
      setMessages([]);
      setMoods([]);
      return;
    }
    const u1 = subscribeMessages(cid, setMessages);
    const u2 = subscribeSharedMoods(cid, setMoods);
    return () => {
      u1();
      u2();
    };
  }, [cid, active]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleInvite = async () => {
    setBusy(true);
    try {
      await createInvite(user.uid);
      toast.success("Invite created");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await acceptInvite(user.uid, code);
      toast.success("Connected ✨");
      setCode("");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!cid) return;
    if (!confirm("Disconnect? You will lose access to shared data immediately.")) return;
    await disconnect(cid);
    toast.success("Disconnected");
  };

  const send = async () => {
    if (!cid || !text.trim()) return;
    const t = text;
    setText("");
    try {
      await sendTextMessage(cid, user.uid, t);
    } catch (e: any) {
      toast.error("Failed to send");
      setText(t);
    }
  };

  const sendDrawing = async (dataUrl: string) => {
    if (!cid) return;
    try {
      await sendDrawingMessage(cid, user.uid, dataUrl);
      toast.success("Drawing sent");
    } catch (e: any) {
      console.error("Drawing send failed", e);
      toast.error(e?.message || "Upload failed");
      throw e;
    }
  };

  const share = async (mood: MoodKey) => {
    if (!cid) return;
    await shareMood(cid, user.uid, mood, 5);
    setShareMoodOpen(false);
    toast.success("Mood shared");
  };

  const copyCode = () => {
    if (!connection?.inviteCode) return;
    navigator.clipboard.writeText(connection.inviteCode);
    toast.success("Code copied");
  };

  return (
    <div className="px-5 pt-10 pb-32 space-y-6 animate-fade-in relative">
      <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />

      <header className="flex items-center justify-between relative">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Mood</p>
          <h1 className="font-display text-2xl mt-1 text-glow tracking-widest">Connections</h1>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="rounded-full h-10 w-10 flex items-center justify-center glass hover:ring-glow transition-smooth"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !connection ? (
        // No connection — show invite UI
        <div className="space-y-4">
          <div className="glass-strong rounded-3xl p-6 space-y-3 shadow-glow">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm tracking-[0.25em] uppercase">Invite someone</h2>
            </div>
            <p className="text-xs text-muted-foreground font-light">
              Generate a code and share it. They paste it in their app to connect.
            </p>
            <Button
              onClick={handleInvite}
              disabled={busy}
              className="w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-12"
            >
              Create invite
            </Button>
          </div>

          <div className="glass rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="font-display text-sm tracking-[0.25em] uppercase">Have a code?</h2>
            </div>
            <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">
              Invite code
            </Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="glass border-accent/20 rounded-xl tracking-[0.4em] text-center font-display"
            />
            <Button
              onClick={handleAccept}
              disabled={busy || code.length < 4}
              className="w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-12"
            >
              Connect
            </Button>
          </div>
        </div>
      ) : connection.status === "pending" ? (
        <div className="glass-strong rounded-3xl p-6 space-y-4 shadow-glow text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">
            Waiting for partner
          </p>
          <div className="font-display text-4xl tracking-[0.4em] text-glow py-4">
            {connection.inviteCode}
          </div>
          <p className="text-xs text-muted-foreground font-light">
            Share this code. The connection activates the moment they accept.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={copyCode}
              variant="outline"
              className="flex-1 rounded-full glass border-accent/30 h-11"
            >
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="flex-1 rounded-full glass border-accent/30 h-11"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        // ACTIVE
        <>
          <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
            <div className="text-xs">
              <p className="text-accent/80 uppercase tracking-[0.25em] text-[10px]">Connected</p>
              <p className="font-light mt-0.5 truncate max-w-[180px]">
                with {connection.userA === user.uid ? connection.userB : connection.userA}
              </p>
            </div>
            <Button
              onClick={handleDisconnect}
              size="sm"
              variant="ghost"
              className="rounded-full text-xs text-destructive hover:bg-destructive/10"
            >
              Disconnect
            </Button>
          </div>

          {moods.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-[0.25em] text-accent/80 mb-2">
                Recent shared moods
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {moods.map((m) => {
                  const meta = moodMeta(m.mood);
                  return (
                    <div
                      key={m.id}
                      className="glass rounded-2xl px-3 py-2 flex items-center gap-2 shrink-0"
                    >
                      <span className="text-xl">{meta.emoji}</span>
                      <div className="text-[10px]">
                        <div>{m.senderId === user.uid ? "You" : "Them"}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(m.createdAt), "MMM d")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div
            ref={feedRef}
            className="glass rounded-3xl p-4 space-y-3 h-[44vh] overflow-y-auto"
          >
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 font-light">
                Say hi — your messages stay between you two.
              </p>
            ) : (
              messages.map((m) => (
                <MessageItem
                  key={m.id}
                  connectionId={cid!}
                  msg={m}
                  selfId={user.uid}
                />
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShareMoodOpen((v) => !v)}
              variant="outline"
              className="h-12 w-12 rounded-full glass border-accent/30 p-0 text-xl"
              aria-label="Share mood"
            >
              😊
            </Button>
            <Button
              onClick={() => setShowDraw(true)}
              variant="outline"
              className="h-12 w-12 rounded-full glass border-accent/30 p-0"
              aria-label="Draw"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Send a note…"
              className="glass border-accent/20 rounded-full h-12"
            />
            <Button
              onClick={send}
              disabled={!text.trim()}
              className="h-12 w-12 rounded-full gradient-primary text-primary-foreground border-0 shadow-glow p-0"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {shareMoodOpen && (
            <div className="glass rounded-2xl p-3 flex gap-2 flex-wrap">
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => share(m.key)}
                  className="rounded-full glass px-3 py-2 text-sm hover:ring-glow transition-smooth"
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          )}

          {showDraw && (
            <DrawingCanvas onSend={sendDrawing} onClose={() => setShowDraw(false)} />
          )}
        </>
      )}
    </div>
  );
};
