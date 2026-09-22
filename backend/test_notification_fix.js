const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function verifyNotificationStateFix() {
    console.log("==================================================");
    console.log("VERIFYING NOTIFICATION STATE FIX ON ACCEPTANCE");
    console.log("==================================================");

    const { createDonation, getDonationById } = require("./models/donationModel");
    const { allocateDonation } = require("./services/allocationService");
    const { getNotificationsForRecipient } = require("./services/notificationService");

    // 1. Create a LOW_CONCERN donation
    const donation = await createDonation({
        food: "pongal_test",
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

    console.log(`\n1. Created donation: ${donation.id}`);
    const allocResult = await allocateDonation(donation.id);
    const receiverId = allocResult.receiver.id;
    console.log(`Offered to receiver: ${allocResult.receiver.name} (${receiverId})`);

    // Check notifications BEFORE accept
    let notifsBefore = await getNotificationsForRecipient(receiverId);
    let offerNotifBefore = notifsBefore.find(n => n.donationId === donation.id && (n.type === "DONATION_OFFER" || n.type === "NEXT_RECEIVER_OFFER"));
    console.log("\nBefore acceptance:");
    console.log(`- Offer notification ID: ${offerNotifBefore?.id}`);
    console.log(`- Status: ${offerNotifBefore?.status}`);
    console.log(`- Action: ${offerNotifBefore?.action}`);

    if (offerNotifBefore?.action !== "ACCEPT_DONATION") {
        throw new Error("Expected action to be ACCEPT_DONATION before accept");
    }

    // 2. Accept the donation via API
    console.log("\n2. Accepting donation via API...");
    const acceptRes = await axios.post(`${BASE_URL}/allocations/${donation.id}/accept`, {
        receiverId: receiverId
    });
    console.log(`Accept API response: ${acceptRes.data.message}`);

    // Check notifications AFTER accept
    let notifsAfter = await getNotificationsForRecipient(receiverId);
    let offerNotifAfter = notifsAfter.find(n => n.id === offerNotifBefore.id);
    let acceptNotif = notifsAfter.find(n => n.donationId === donation.id && n.type === "DONATION_ACCEPTED");

    console.log("\nAfter acceptance:");
    console.log(`- Original Offer notification status: ${offerNotifAfter?.status}`);
    console.log(`- Original Offer notification action: ${offerNotifAfter?.action}`);
    console.log(`- New Acceptance notification exists: ${!!acceptNotif}`);
    console.log(`- New Acceptance notification title: ${acceptNotif?.title}`);

    if (offerNotifAfter?.status !== "ACCEPTED" || offerNotifAfter?.action !== null) {
        throw new Error(`Offer notification not properly resolved! status: ${offerNotifAfter?.status}, action: ${offerNotifAfter?.action}`);
    }

    console.log("\n==================================================");
    console.log("NOTIFICATION RESOLUTION VERIFIED SUCCESSFULLY!");
    console.log("==================================================");
}

verifyNotificationStateFix().catch(err => {
    console.error("Verification error:", err.message, err.response?.data || "");
    process.exit(1);
});
