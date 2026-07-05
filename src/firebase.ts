import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDocFromServer 
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";

// Read config (it is matching firebase-applet-config.json)
const firebaseConfig = {
  apiKey: "AIzaSyBmqcjctgO74H5YSpQH3q9tQhtRKFaEm-U",
  authDomain: "gen-lang-client-0356442172.firebaseapp.com",
  projectId: "gen-lang-client-0356442172",
  storageBucket: "gen-lang-client-0356442172.firebasestorage.app",
  messagingSenderId: "964894975099",
  appId: "1:964894975099:web:bf7ff84bbdf26cd9e3aede"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Test Connection on load
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase Connection verified successfully.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firebase client is currently offline or pending configuration.");
    } else {
      console.log("Firebase connection response:", error.message);
    }
  }
}

// Automatically sign in anonymously if not logged in, falling back to a safe guest UID if restricted
export function ensureUserSignedIn(onUserReady: (user: User) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      onUserReady(user);
    } else {
      try {
        const credential = await signInAnonymously(auth);
        onUserReady(credential.user);
      } catch (err) {
        console.warn("Anonymous authentication failed or is restricted. Falling back to safe guest session:", err);
        
        // Define a robust, safe fallback user object that mimics User
        const fallbackUser = {
          uid: "shopper_guest_user_brl",
          isAnonymous: true,
          email: "guest@shopper-receipts.io",
          emailVerified: false,
          displayName: "Shopper Guest",
          phoneNumber: null,
          photoURL: null,
          providerId: "firebase",
          metadata: {},
          providerData: [],
          refreshToken: "",
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => "",
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
        } as User;
        
        onUserReady(fallbackUser);
      }
    }
  });
}
