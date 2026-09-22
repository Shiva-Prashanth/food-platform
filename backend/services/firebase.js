const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

const serviceAccount = require(
    path.join(
        __dirname,
        "..",
        "smart-surplus-food-recovery-firebase-adminsdk-fbsvc-52ef898338.json"
    )
);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

console.log("Firebase connected successfully");

module.exports = db;