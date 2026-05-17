import { useEffect, useState } from "react";
import { format } from "date-fns";
import { subscribeReactions, addReaction } from "@/lib/connectionsApi";
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
  const mine = msg.senderId === selfId;

  useEffect(() => {
    const unsub = subscribeReactions(connectionId, msg.id, setReactions);
    return () => unsub();
  }, [connectionId, msg.id]);

  const react = async (emoji: string) => {
    setPickerOpen(false);
    await addReaction(connectionId, msg.id, selfId, emoji);
  };

  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-card",
          mine ? "gradient-primary text-primary-foreground" : "glass",
        )}
      >
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
          <span key={r.id} className="text-sm">
            {r.emoji}
          </span>
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
