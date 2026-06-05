import type { MoodKey } from "./moodTypes";

export type ConnectionStatus = "pending" | "active" | "ended" | "blocked";

export interface Connection {
  id: string;
  userA: string;
  userB: string | null;
  status: ConnectionStatus;
  inviteCode: string;
  createdAt: number;
  acceptedAt?: number | null;
}

export interface ConnectionMood {
  id: string;
  senderId: string;
  mood: MoodKey;
  intensity: number;
  note?: string;
  createdAt: number;
}

export type ConnectionMessageType = "text" | "drawing";

export interface ConnectionMessage {
  id: string;
  senderId: string;
  type: ConnectionMessageType;
  content?: string;
  drawingUrl?: string;
  createdAt: number;
  opened?: boolean;
  openedAt?: number | null;
}

export interface ConnectionReaction {
  id: string;
  userId: string;
  emoji: string;
  createdAt: number;
}
