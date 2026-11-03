import { useSyncExternalStore } from "react";
import { getAccountSnapshot, subscribeAccount } from "@/lib/accountSession";

export function useAuth() {
  return useSyncExternalStore(subscribeAccount, getAccountSnapshot, getAccountSnapshot);
}
