import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
} from "firebase/firestore";

export const MOOD_COLLECTION = "mood_entries";

/* ---------- GET ALL ENTRIES ---------- */
export const fetchEntries = async () => {
  const q = query(
    collection(db, MOOD_COLLECTION),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/* ---------- ADD ENTRY ---------- */
export const addEntry = async (entry: any) => {
  return await addDoc(collection(db, MOOD_COLLECTION), entry);
};
