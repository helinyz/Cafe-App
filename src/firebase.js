import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { getAuth } from "firebase/auth"; 
import { getStorage } from "firebase/storage"; // 1. Bunu ekledik aşkım ✨

const firebaseConfig = {
  apiKey: "AIzaSyDKS6BsMee0j9M0Xl2VhNwrUW5K3Dr5_L4",
  authDomain: "cafe-go-b47fe.firebaseapp.com",
  projectId: "cafe-go-b47fe",
  storageBucket: "cafe-go-b47fe.firebasestorage.app",
  messagingSenderId: "428112191604",
  appId: "1:428112191604:web:861d9baf027ad57fd2f121",
  measurementId: "G-RMCS23JQVT"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const auth = getAuth(app); 
export const storage = getStorage(app); // 2. İşte bunu da ekleyince hiçbir hata kalmayacak! ✨