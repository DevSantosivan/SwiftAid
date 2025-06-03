// firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDsAmK16ca-nkJGd-N9k7mG_kk8bKzONKM",
  authDomain: "sj-302d6.firebaseapp.com",
  databaseURL: "https://sj-302d6-default-rtdb.firebaseio.com",
  projectId: "sj-302d6",
  storageBucket: "sj-302d6.appspot.com",
  messagingSenderId: "474676350358",
  appId: "1:474676350358:web:643afeb8dca7eee95e61b7",
  measurementId: "G-TQTRELP8XG",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
