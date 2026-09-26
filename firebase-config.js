// Menggunakan Firebase SDK v9/v10 Compat agar sesuai dengan kredensial bawaan Anda
import "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js";

// Konfigurasi asli yang diambil langsung dari file HTML Anda
const firebaseConfig = {
  apiKey: "AIzaSyBDQ_MP1QFVA0PFvQck8E3MxG1vDbOcizI",
  authDomain: "spx-paket-gaskeun.firebaseapp.com",
  databaseURL: "https://spx-paket-gaskeun-default-rtdb.firebaseio.com",
  projectId: "spx-paket-gaskeun",
  storageBucket: "spx-paket-gaskeun.firebasestorage.app",
  messagingSenderId: "350727183650",
  appId: "1:350727183650:web:2dcb8283ef128f9a87997b"
};

// Inisialisasi Firebase Realtime Database
firebase.initializeApp(firebaseConfig);
export const db = firebase.database();
