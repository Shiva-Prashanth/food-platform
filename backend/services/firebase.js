const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps, getApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
require("dotenv").config();

let db;

function initFirebase() {
    if (getApps().length > 0) {
        return getFirestore(getApp());
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (serviceAccountPath) {
        const resolvedPath = path.isAbsolute(serviceAccountPath)
            ? serviceAccountPath
            : path.resolve(process.cwd(), serviceAccountPath);

        if (fs.existsSync(resolvedPath)) {
            try {
                const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
                initializeApp({
                    credential: cert(serviceAccount),
                });
                console.log(`Firebase connected successfully using service account file: ${path.basename(resolvedPath)}`);
                return getFirestore();
            } catch (err) {
                console.error(`Failed to load Firebase service account file at ${resolvedPath}:`, err.message);
            }
        } else {
            console.warn(`Firebase service account file not found at ${resolvedPath}, falling back to environment variables.`);
        }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
        privateKey = privateKey.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, "\n").trim();
    }

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Missing Firebase environment variables. Please provide either FIREBASE_SERVICE_ACCOUNT_PATH (path to service account JSON) or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
        );
    }

    initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });

    console.log("Firebase connected successfully using environment variables");
    return getFirestore();
}

db = initFirebase();

module.exports = db;