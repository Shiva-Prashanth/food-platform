const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
require("dotenv").config();

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();

const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").trim()
    : undefined;

if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
        "Missing Firebase environment variables. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
}

initializeApp({
    credential: cert({
        projectId,
        clientEmail,
        privateKey,
    }),
});

const db = getFirestore();

console.log("Firebase connected successfully");

module.exports = db;