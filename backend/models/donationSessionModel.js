const db = require("../services/firebase");

const sessionsCollection = db.collection("donationSessions");

function cleanItem(item) {
    return {
        id: item.id,
        food: item.food ?? null,
        imagePath: item.imagePath ?? null,
        preparationTime: item.preparationTime ?? null,
        temperature: item.temperature ?? null,
        storage: item.storage ?? null,
        smell: item.smell ?? null,
        quantity: item.quantity ?? null,
        status: item.status ?? "PENDING",
        analysis: item.analysis ?? null,
        donorDecision: item.donorDecision ?? null,
        selectedRoute: item.selectedRoute ?? null,
        donationId: item.donationId ?? null,
        updatedAt: item.updatedAt ?? null,
        createdAt: item.createdAt ?? null
    };
}

async function createDonationSession(sessionData = {}) {
    const session = {
        donorType: sessionData.donorType ?? "HOSTEL",
        location: sessionData.location ?? "HOSTEL",
        status: "DRAFT",
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const document = await sessionsCollection.add(session);
    return { id: document.id, ...session };
}

async function getDonationSession(sessionId) {
    const sessionRef = sessionsCollection.doc(sessionId);
    const document = await sessionRef.get();

    if (!document.exists) return null;

    const itemsSnapshot = await sessionRef.collection("items").orderBy("createdAt", "asc").get();
    const items = [];
    itemsSnapshot.forEach((doc) => {
        items.push(cleanItem({ id: doc.id, ...doc.data() }));
    });

    return {
        id: document.id,
        ...document.data(),
        items
    };
}

async function addSessionItem(sessionId, itemData) {
    const sessionRef = sessionsCollection.doc(sessionId);
    const session = await sessionRef.get();
    if (!session.exists) throw new Error("Donation session not found");

    const now = new Date();
    const item = {
        food: itemData.food ?? null,
        imagePath: itemData.imagePath ?? null,
        preparationTime: itemData.preparationTime,
        temperature: Number(itemData.temperature),
        storage: itemData.storage,
        smell: itemData.smell,
        quantity: itemData.quantity,
        status: "PENDING",
        analysis: null,
        donorDecision: null,
        selectedRoute: null,
        donationId: null,
        createdAt: now,
        updatedAt: now
    };

    const itemRef = await sessionRef.collection("items").add(item);
    await sessionRef.update({
        itemCount: (session.data().itemCount || 0) + 1,
        updatedAt: now
    });

    return { id: itemRef.id, ...item };
}

async function updateSessionItem(sessionId, itemId, updateData) {
    const itemRef = sessionsCollection.doc(sessionId).collection("items").doc(itemId);
    const item = await itemRef.get();
    if (!item.exists) throw new Error("Food item not found");

    const update = { ...updateData, updatedAt: new Date() };
    await itemRef.update(update);
    await sessionsCollection.doc(sessionId).update({ updatedAt: new Date() });

    const updated = await itemRef.get();
    return cleanItem({ id: updated.id, ...updated.data() });
}

async function deleteSessionItem(sessionId, itemId) {
    const sessionRef = sessionsCollection.doc(sessionId);
    const itemRef = sessionRef.collection("items").doc(itemId);
    const item = await itemRef.get();
    if (!item.exists) throw new Error("Food item not found");

    await itemRef.delete();
    const session = await sessionRef.get();
    await sessionRef.update({
        itemCount: Math.max(0, (session.data().itemCount || 1) - 1),
        updatedAt: new Date()
    });
}

async function updateDonationSession(sessionId, updateData) {
    const sessionRef = sessionsCollection.doc(sessionId);
    const session = await sessionRef.get();
    if (!session.exists) throw new Error("Donation session not found");

    await sessionRef.update({ ...updateData, updatedAt: new Date() });
    return getDonationSession(sessionId);
}

async function getSessionItem(sessionId, itemId) {
    const itemRef = sessionsCollection.doc(sessionId).collection("items").doc(itemId);
    const item = await itemRef.get();
    if (!item.exists) return null;
    return cleanItem({ id: item.id, ...item.data() });
}

module.exports = {
    createDonationSession,
    getDonationSession,
    addSessionItem,
    updateSessionItem,
    deleteSessionItem,
    updateDonationSession,
    getSessionItem
};
