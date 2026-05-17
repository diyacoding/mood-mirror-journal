// Mood Connections — isolated Firestore module. Does NOT touch mood_entries.

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type {
  Connection,
  ConnectionMessage,
  ConnectionMessageType,
  ConnectionMood,
  ConnectionReaction,
} from "./connectionsTypes";
import type { MoodKey } from "./moodTypes";

const CONNECTIONS = "connections";

const connectionRef = (id: string) => doc(db, CONNECTIONS, id);
const moodsRef = (id: string) => collection(db, CONNECTIONS, id, "moods");
const messagesRef = (id: string) => collection(db, CONNECTIONS, id, "messages");
const reactionsRef = (cid: string, mid: string) =>
  collection(db, CONNECTIONS, cid, "messages", mid, "reactions");

const generateInviteCode = () => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
};

// ─── Connection lifecycle ──────────────────────────────────────────────

export async function createInvite(uid: string): Promise<Connection> {
  // Prevent multiple active/pending invites by this user
  const existing = await findMyConnection(uid);
  if (existing && (existing.status === "active" || existing.status === "pending")) {
    return existing;
  }

  const inviteCode = generateInviteCode();
  const payload = {
    userA: uid,
    userB: null,
    status: "pending" as const,
    inviteCode,
    createdAt: Date.now(),
    acceptedAt: null,
    serverCreatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, CONNECTIONS), payload);
  return { id: ref.id, ...payload };
}

export async function acceptInvite(uid: string, code: string): Promise<Connection> {
  const trimmed = code.trim().toUpperCase();
  // Reject if user already has an active connection
  const mine = await findMyConnection(uid);
  if (mine && mine.status === "active") {
    throw new Error("You already have an active connection. Disconnect first.");
  }

  const q = query(
    collection(db, CONNECTIONS),
    where("inviteCode", "==", trimmed),
    where("status", "==", "pending"),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid or expired invite code");
  const d = snap.docs[0];
  const data = d.data() as any;
  if (data.userA === uid) throw new Error("You cannot accept your own invite");

  await updateDoc(d.ref, {
    userB: uid,
    status: "active",
    acceptedAt: Date.now(),
  });

  return {
    id: d.id,
    userA: data.userA,
    userB: uid,
    status: "active",
    inviteCode: data.inviteCode,
    createdAt: data.createdAt,
    acceptedAt: Date.now(),
  };
}

export async function disconnect(connectionId: string): Promise<void> {
  await updateDoc(connectionRef(connectionId), { status: "ended" });
}

export async function findMyConnection(uid: string): Promise<Connection | null> {
  const col = collection(db, CONNECTIONS);
  const [aSnap, bSnap] = await Promise.all([
    getDocs(query(col, where("userA", "==", uid))),
    getDocs(query(col, where("userB", "==", uid))),
  ]);
  const docs = [...aSnap.docs, ...bSnap.docs];
  // Prefer active, then pending, ignore ended/blocked
  const mapped = docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Connection[];
  return (
    mapped.find((c) => c.status === "active") ??
    mapped.find((c) => c.status === "pending") ??
    null
  );
}

export function subscribeMyConnection(
  uid: string,
  cb: (c: Connection | null) => void,
): () => void {
  // Listen to both userA and userB queries; merge results.
  const col = collection(db, CONNECTIONS);
  let aList: Connection[] = [];
  let bList: Connection[] = [];

  const emit = () => {
    const all = [...aList, ...bList];
    const active = all.find((c) => c.status === "active");
    const pending = all.find((c) => c.status === "pending");
    cb(active ?? pending ?? null);
  };

  const unsubA = onSnapshot(query(col, where("userA", "==", uid)), (snap) => {
    aList = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Connection[];
    emit();
  });
  const unsubB = onSnapshot(query(col, where("userB", "==", uid)), (snap) => {
    bList = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Connection[];
    emit();
  });

  return () => {
    unsubA();
    unsubB();
  };
}

// ─── Messages ──────────────────────────────────────────────────────────

export async function sendTextMessage(
  connectionId: string,
  uid: string,
  text: string,
): Promise<void> {
  const content = text.trim();
  if (!content) return;
  await addDoc(messagesRef(connectionId), {
    senderId: uid,
    type: "text" as ConnectionMessageType,
    content,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
}

export async function sendDrawingMessage(
  connectionId: string,
  uid: string,
  dataUrl: string,
): Promise<void> {
  // Upload to Storage: connections/{cid}/{uid}-{ts}.png
  const path = `connections/${connectionId}/${uid}-${Date.now()}.png`;
  const ref = storageRef(storage, path);
  await uploadString(ref, dataUrl, "data_url");
  const drawingUrl = await getDownloadURL(ref);
  await addDoc(messagesRef(connectionId), {
    senderId: uid,
    type: "drawing" as ConnectionMessageType,
    drawingUrl,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
}

export function subscribeMessages(
  connectionId: string,
  cb: (msgs: ConnectionMessage[]) => void,
): () => void {
  const q = query(messagesRef(connectionId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ConnectionMessage[],
    );
  });
}

// ─── Reactions ─────────────────────────────────────────────────────────

export async function addReaction(
  connectionId: string,
  messageId: string,
  uid: string,
  emoji: string,
): Promise<void> {
  // Upsert one reaction per user per message (deterministic id = uid)
  const ref = doc(reactionsRef(connectionId, messageId), uid);
  await setDoc(ref, {
    userId: uid,
    emoji,
    createdAt: Date.now(),
  });
}

export function subscribeReactions(
  connectionId: string,
  messageId: string,
  cb: (r: ConnectionReaction[]) => void,
): () => void {
  return onSnapshot(reactionsRef(connectionId, messageId), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ConnectionReaction[]);
  });
}

// ─── Moods ─────────────────────────────────────────────────────────────

export async function shareMood(
  connectionId: string,
  uid: string,
  mood: MoodKey,
  intensity: number,
  note?: string,
): Promise<void> {
  await addDoc(moodsRef(connectionId), {
    senderId: uid,
    mood,
    intensity,
    note: note ?? "",
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
}

export function subscribeSharedMoods(
  connectionId: string,
  cb: (m: ConnectionMood[]) => void,
): () => void {
  const q = query(moodsRef(connectionId), orderBy("createdAt", "desc"), limit(20));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ConnectionMood[]);
  });
}
