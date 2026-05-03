import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {

  apiKey: "AIzaSyB-STHda83VFZMWKvflXwo8hpQOwlyqpjE",

  authDomain: "mood-mirror-a7f96.firebaseapp.com",

  projectId: "mood-mirror-a7f96",

  storageBucket: "mood-mirror-a7f96.firebasestorage.app",

  messagingSenderId: "53212967337",

  appId: "1:53212967337:web:fda0b4222948c3b2ff94b8"

};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
