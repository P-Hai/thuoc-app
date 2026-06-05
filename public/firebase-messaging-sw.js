importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDLzLaOTLDxbIt9bSRGEelyGZUHwI-qOT0",
  authDomain: "thuoc-me.firebaseapp.com",
  databaseURL: "https://thuoc-me-default-rtdb.firebaseio.com",
  projectId: "thuoc-me",
  storageBucket: "thuoc-me.firebasestorage.app",
  messagingSenderId: "347234487546",
  appId: "1:347234487546:web:2a06a45ad27f2565fb0d43",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  const notificationTitle =
    payload.notification?.title || "💊 Nhắc uống thuốc";

  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/thuoc-app/icon-192.png",
    badge: "/thuoc-app/icon-192.png",
    tag: "medicine-reminder",
    renotify: true,
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("/thuoc-app/")
  );
});