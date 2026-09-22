const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function runBroadcastTests() {
    console.log("==================================================");
    console.log("TESTING SIMULTANEOUS BROADCAST & 15-MIN DEADLINE");
    console.log("==================================================");

    const { createDonation, getDonationById } = require("./models/donationModel");
    const { allocateDonation, processExpiredAllocations } = require("./services/allocationService");
    const { getNotificationsForRecipient } = require("./services/notificationService");
    const { findMatchingReceivers } = require("./services/matchingService");

    // 1. Check matching orphanages
    const matchingOrphanages = await findMatchingReceivers({
        receiverType: "ORPHANAGE",
        quantity: "MEDIUM"
    });
    console.log(`\nFound ${matchingOrphanages.length} matching orphanages:`);
    matchingOrphanages.forEach((o, i) => console.log(`  ${i + 1}. ${o.name} (${o.id})`));

    if (matchingOrphanages.length < 2) {
        console.log("Adding a second test orphanage to ensure multi-receiver testing...");
        const db = require("./services/firebase");
        const docRef = await db.collection("receivers").add({
            name: "City Hope Orphanage",
            receiverType: "ORPHANAGE",
            location: "Central Zone",
            foodNeeded: "cooked food",
            quantityNeeded: "MEDIUM",
            available: true,
            createdAt: new Date()
        });
        matchingOrphanages.push({ id: docRef.id, name: "City Hope Orphanage", receiverType: "ORPHANAGE" });
    }

    // ==========================================================
    // TEST 1: Simultaneous Broadcast to ALL matching orphanages
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 1: Simultaneous Broadcast Notification");
    console.log("--------------------------------------------------");

    const donation = await createDonation({
        food: "vegetable_biryani",
        route: "HUMAN",
        quantity: "MEDIUM",
        location: "HOSTEL",
        finalAssessment: "low_concern",
        animalFeedStatus: "NOT_ALLOWED",
        validationRequired: false,
        validationStatus: "NOT_REQUIRED",
        allocationStatus: "PENDING_ALLOCATION",
        locked: false
    });

    console.log(`Created donation ${donation.id}`);
    const allocResult = await allocateDonation(donation.id);
    console.log(`Allocation Result: ${allocResult.message}`);
    console.log(`Offered to ${allocResult.receivers.length} receivers simultaneously.`);
    console.log(`Global Allocation Deadline: ${allocResult.allocationDeadline}`);

    // Verify EVERY matching receiver got the notification immediately
    for (const receiver of matchingOrphanages) {
        const notifs = await getNotificationsForRecipient(receiver.id);
        const offerNotif = notifs.find(n => n.donationId === donation.id && n.type === "DONATION_OFFER");
        console.log(`- Receiver ${receiver.name} (${receiver.id}): Notification received = ${!!offerNotif}, Action = ${offerNotif?.action}, Status = ${offerNotif?.status}`);
        if (!offerNotif || offerNotif.action !== "ACCEPT_DONATION") {
            throw new Error(`Receiver ${receiver.name} did not receive offer notification!`);
        }
    }

    // ==========================================================
    // TEST 2: First receiver accepts -> Donation locked
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 2: First Receiver Accepts");
    console.log("--------------------------------------------------");

    const winner = matchingOrphanages[0];
    const loser = matchingOrphanages[1];

    console.log(`Receiver 1 (${winner.name}) accepts donation...`);
    const acceptRes = await axios.post(`${BASE_URL}/allocations/${donation.id}/accept`, {
        receiverId: winner.id
    });
    console.log(`Accept API response: ${acceptRes.data.message}`);
    console.log(`Donation status: ${acceptRes.data.donation.allocationStatus}, locked: ${acceptRes.data.donation.locked}, assignedReceiverId: ${acceptRes.data.donation.assignedReceiverId}`);

    // Verify winner notification state
    const winnerNotifs = await getNotificationsForRecipient(winner.id);
    const winnerOfferNotif = winnerNotifs.find(n => n.donationId === donation.id && n.type === "DONATION_OFFER");
    const winnerAcceptNotif = winnerNotifs.find(n => n.donationId === donation.id && n.type === "DONATION_ACCEPTED");
    console.log(`Winner offer notification status: ${winnerOfferNotif?.status}, action: ${winnerOfferNotif?.action}`);
    console.log(`Winner acceptance confirmation exists: ${!!winnerAcceptNotif}`);

    if (winnerOfferNotif?.status !== "ACCEPTED" || winnerOfferNotif?.action !== null) {
        throw new Error("Winner offer notification not set to ACCEPTED / null action!");
    }

    // ==========================================================
    // TEST 3: Other receiver notification resolved to ACCEPTED_BY_OTHER
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 3: Other Receivers Resolved to ACCEPTED_BY_OTHER");
    console.log("--------------------------------------------------");

    const loserNotifs = await getNotificationsForRecipient(loser.id);
    const loserOfferNotif = loserNotifs.find(n => n.donationId === donation.id && n.type === "DONATION_OFFER");
    console.log(`Other receiver (${loser.name}) offer notification status: ${loserOfferNotif?.status}, action: ${loserOfferNotif?.action}`);

    if (loserOfferNotif?.status !== "ACCEPTED_BY_OTHER" || loserOfferNotif?.action !== null) {
        throw new Error("Loser offer notification not set to ACCEPTED_BY_OTHER / null action!");
    }

    // ==========================================================
    // TEST 4: Second receiver tries to accept -> Rejected with conflict error
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 4: Second Receiver Tries to Accept (Conflict)");
    console.log("--------------------------------------------------");

    try {
        await axios.post(`${BASE_URL}/allocations/${donation.id}/accept`, {
            receiverId: loser.id
        });
        throw new Error("Second accept should have failed but succeeded!");
    } catch (err) {
        console.log(`Second accept rejected correctly: HTTP ${err.response?.status} - ${err.response?.data?.message || err.message}`);
    }

    // ==========================================================
    // TEST 5: Global 15-minute deadline expired -> BIOCOMPOST fallback
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 5: Global 15-minute Deadline Expiry -> BIOCOMPOST");
    console.log("--------------------------------------------------");

    const expiredDonation = await createDonation({
        food: "leftover_rice",
        route: "HUMAN",
        quantity: "MEDIUM",
        location: "HOSTEL",
        finalAssessment: "low_concern",
        animalFeedStatus: "NOT_ALLOWED",
        validationRequired: false,
        validationStatus: "NOT_REQUIRED",
        allocationStatus: "OFFERED",
        locked: false,
        allocationDeadline: new Date(Date.now() - 60 * 1000) // 1 min in the past
    });

    console.log(`Created expired donation: ${expiredDonation.id}`);
    await processExpiredAllocations();

    const afterExpire = await getDonationById(expiredDonation.id);
    console.log(`After monitor check: route = ${afterExpire.route}, allocationStatus = ${afterExpire.allocationStatus}, locked = ${afterExpire.locked}`);

    if (afterExpire.route !== "BIOCOMPOST" || afterExpire.allocationStatus !== "ALLOCATED_TO_BIOGAS") {
        throw new Error("Expired donation did not fall back to BIOCOMPOST!");
    }

    console.log("\n==================================================");
    console.log("ALL BROADCAST & DEADLINE TESTS PASSED!");
    console.log("==================================================");
}

runBroadcastTests().catch(err => {
    console.error("Test failed:", err.message, err.response?.data || "");
    process.exit(1);
});
