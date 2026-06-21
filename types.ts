import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

try {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore offline persistence failed:", err.message);
  });
} catch (err: any) {
  console.warn("Firestore offline persistence skipped:", err.message);
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export { app, signInWithPopup, signOut };
export default app;
