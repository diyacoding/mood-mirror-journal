import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

let revision = 0;
let snapshot: { user: User | null; loading: boolean; revision: number } = {
  user: null, loading: true, revision,
};
const listeners = new Set<() => void>();
let installed = false;

export function installAccountLifecycle(activate: (uid: string | null) => void) {
  if (installed) return;
  installed = true;
  onAuthStateChanged(auth, (user) => {
    revision += 1;
    activate(user?.uid ?? null);
    snapshot = { user, loading: false, revision };
    listeners.forEach((notify) => notify());
  });
}

export const getAccountSnapshot = () => snapshot;
export function subscribeAccount(notify: () => void) {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
}

/** A captured operation expires even on A -> B -> A. */
export function captureAccount(uid: string) {
  const started = revision;
  return () => auth.currentUser?.uid === uid && revision === started;
}

export function assertAccount(uid: string) {
  if (auth.currentUser?.uid !== uid) throw new Error("Your account changed. Please try again.");
}