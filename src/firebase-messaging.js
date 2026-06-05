import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDLzLaOTLDxbIt9bSRGEelyGZUHwI-qOT0",
  authDomain: "thuoc-me.firebaseapp.com",
  databaseURL: "https://thuoc-me-default-rtdb.firebaseio.com",
  projectId: "thuoc-me",
  storageBucket: "thuoc-me.firebasestorage.app",
  messagingSenderId: "347234487546",
  appId: "1:347234487546:web:2a06a45ad27f2565fb0d43",
};

const app = initializeApp(firebaseConfig);

export const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  console.log("STEP 1");

  const permission = await Notification.requestPermission();

  console.log("STEP 2", permission);

  const registration = await navigator.serviceWorker.ready;

  console.log("STEP 3", registration);

  const token = await getToken(messaging, {
    vapidKey:
      "BPesQiRbdDzxaVe4aIMr5mP_i29YwsGPvhVFs5dqrvuxape_NcOgah-4vuaF363-1uVwtPNKd6itMqAi653HbgM",
    serviceWorkerRegistration: registration,
  });

  console.log("STEP 4 TOKEN =", token);

  return token;
}
export function listenForMessages() {
  onMessage(messaging, (payload) => {
    console.log("Message received:", payload);
  });
}