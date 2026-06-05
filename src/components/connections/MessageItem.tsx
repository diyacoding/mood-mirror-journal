import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Mail, MailOpen } from "lucide-react";
import {
  subscribeReactions,
  addReaction,
  markMessageOpened,
} from "@/lib/connectionsApi";
import type { ConnectionMessage, ConnectionReaction } from "@/lib/connectionsTypes";
import { cn } from "@/lib/utils";

const QUICK = ["❤️", "😊", "😂", "😢", "🔥", "🙏"];

interface Props {
  connectionId: string;
  msg: ConnectionMessage;
  selfId: string;
}

export const MessageItem = ({ connectionId, msg, selfId }: Props) => {
  const [reactions, setReactions] = useState<ConnectionReaction[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const mine = msg.senderId === selfId;
  const opened = !!msg.opened || mine; // sender always sees own letter as open

  useEffect(() => {
    const unsub = subscribeReactions(connectionId, msg.id, setReactions);
    return () => unsub();
  }, [connectionId, msg.id]);

  const react = async (emoji: string) => {
    setPickerOpen(false);
    await addReaction(connectionId, msg.id, selfId, emoji);
  };

  const openLetter = async () => {
    if (opened || revealing) return;
    setRevealing(true);
    setTimeout(async () => {
      try {
        await markMessageOpened(connectionId, msg.id);
      } catch (e) {
        console.warn("mark opened failed", e);
        setRevealing(false);
      }
    }, 600);
  };

  // ── Unopened (letter from other user) ──
  if (!opened && !revealing) {
    return (
      <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
        <button
          onClick={openLetter}
          className="group relative w-44 h-28 rounded-xl glass-strong shadow-glow border border-accent/40 overflow-hidden transition-smooth hover:scale-[1.03]"
          aria-label="Open letter"
        >
          {/* envelope flap */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-primary/60 to-primary/20"
               style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Mail className="h-7 w-7 text-accent drop-shadow-[0_0_12px_hsl(270_96%_75%/0.7)] animate-glow-pulse" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-accent/90">
              New letter — tap to open
            </span>
          </div>
        </button>
        <span className="text-[10px] text-muted-foreground px-1">
          {format(new Date(msg.createdAt), "p")}
        </span>
      </div>
    );
  }

  // ── Reveal animation ──
  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-card relative overflow-hidden",
          mine ? "gradient-primary text-primary-foreground" : "glass",
          revealing && "animate-scale-in",
        )}
      >
        {!mine && (
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-accent/80 mb-1.5">
            <MailOpen className="h-3 w-3" /> Letter
          </div>
        )}
        {msg.type === "text" ? (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        ) : msg.drawingUrl ? (
          <img src={msg.drawingUrl} alt="drawing" className="rounded-xl max-w-full" />
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
        <span>{format(new Date(msg.createdAt), "p")}</span>
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="opacity-60 hover:opacity-100 transition-smooth"
        >
          + react
        </button>
        {reactions.map((r) => (
          <span key={r.id} className="text-sm">{r.emoji}</span>
        ))}
      </div>

      {pickerOpen && (
        <div className="flex gap-1 glass rounded-full px-2 py-1 shadow-glow">
          {QUICK.map((e) => (
            <button
              key={e}
              onClick={() => react(e)}
              className="text-xl hover:scale-125 transition-smooth"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
