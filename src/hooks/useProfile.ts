import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";

export interface Profile {
  displayName: string;
  photoDataUrl: string | null;
  username: string;
  joinedAt: number;
}

const key = (uid: string) => `mm.profile.${uid}`;

function read(uid: string, user?: User | null): Profile {
  let stored: Partial<Profile> = {};
  try {
    stored = JSON.parse(localStorage.getItem(key(uid)) ?? "{}");
  } catch {
    /* ignore */
  }
  const email = user?.email ?? "";
  return {
    displayName: stored.displayName || user?.displayName || email.split("@")[0] || "Friend",
    photoDataUrl: stored.photoDataUrl ?? null,
    username: stored.username || (email ? `@${email.split("@")[0]}` : ""),
    joinedAt:
      stored.joinedAt ??
      (user?.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now()),
  };
}

export function useProfile(user: User | null) {
  const uid = user?.uid ?? null;
  const [profile, setProfile] = useState<Profile>(() => (uid ? read(uid, user) : read("anon", user)));

  useEffect(() => {
    if (uid) setProfile(read(uid, user));
  }, [uid, user]);

  const update = useCallback(
    (patch: Partial<Profile>) => {
      if (!uid) return;
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(key(uid), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [uid],
  );

  return { profile, update };
}
