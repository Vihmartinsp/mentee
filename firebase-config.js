const firebaseConfig = {
  apiKey: "AIzaSyAPEGuqMUeKWqnbrndJRm3cgfwob9MtPX8",
  authDomain: "mentee-25d69.firebaseapp.com",
  projectId: "mentee-25d69",
  storageBucket: "mentee-25d69.firebasestorage.app",
  messagingSenderId: "105989858054",
  appId: "1:105989858054:web:08174c80d6f8d3b0103487",
  measurementId: "G-SK3H7YJQEJ"
};

firebase.initializeApp(firebaseConfig);

const fbAuth = firebase.auth();
const fbDB  = firebase.firestore();
