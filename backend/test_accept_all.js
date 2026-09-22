const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testAcceptAll() {
    console.log("==================================================");
    console.log("TESTING ACCEPTANCE FOR ALL THREE CATEGORIES");
    console.log("==================================================");

    const { createDonation, getDonationById } = require("./models/donationModel");
    const { allocateDonation } = require("./services/allocationService");
    const { getNotificationsForRecipient } = require("./services/notificationService");

    // 1. ORPHANAGE ACCEPT
    const low = await createDonation({
        food: "sambar_rice",
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
    const lowAlloc = await allocateDonation(low.id);
    console.log(`\n1. Orphanage Offered: ${lowAlloc.receiver?.name}`);
    const lowAccept = await axios.post(`${BASE_URL}/allocations/${low.id}/accept`, {
        receiverId: lowAlloc.receiver.id
    });
    console.log(`Orphanage Accepted: ${lowAccept.data.message}, locked: ${lowAccept.data.donation.locked}, status: ${lowAccept.data.donation.allocationStatus}`);

    // 2. ANIMAL FARM ACCEPT
    const mod = await createDonation({
        food: "bread_crusts",
        route: "PENDING_HUMAN_VALIDATION",
        quantity: "MEDIUM",
        location: "HOSTEL",
        finalAssessment: "moderate_concern",
        animalFeedStatus: "ALLOWED",
        validationRequired: true,
        validationStatus: "PENDING",
        allocationStatus: "PENDING_VALIDATION",
        locked: false
    });
    const valRes = await axios.post(`${BASE_URL}/donations/${mod.id}/validate`, {
        validationDecision: "ANIMAL",
        selectedRoute: "ANIMAL_FEED"
    });
    console.log(`\n2. Animal Farm Offered: ${valRes.data.allocation?.receiver?.name || valRes.data.donation.assignedReceiverId}`);
    const farmAccept = await axios.post(`${BASE_URL}/allocations/${mod.id}/accept`, {
        receiverId: valRes.data.donation.assignedReceiverId
    });
    console.log(`Animal Farm Accepted: ${farmAccept.data.message}, locked: ${farmAccept.data.donation.locked}, status: ${farmAccept.data.donation.allocationStatus}`);

    // 3. BIOGAS ACCEPT
    const high = await createDonation({
        food: "spoiled_curry",
        route: "BIOCOMPOST",
        quantity: "MEDIUM",
        location: "HOSTEL",
        finalAssessment: "high_concern",
        animalFeedStatus: "NOT_ALLOWED",
        validationRequired: false,
        validationStatus: "NOT_REQUIRED",
        allocationStatus: "PENDING_ALLOCATION",
        locked: false
    });
    const highAlloc = await allocateDonation(high.id);
    console.log(`\n3. Biogas Offered: ${highAlloc.receiver?.name}`);
    const biogasAccept = await axios.post(`${BASE_URL}/allocations/${high.id}/accept`, {
        receiverId: highAlloc.receiver.id
    });
    console.log(`Biogas Accepted: ${biogasAccept.data.message}, locked: ${biogasAccept.data.donation.locked}, status: ${biogasAccept.data.donation.allocationStatus}`);

    console.log("\n==================================================");
    console.log("ALL THREE ACCEPTANCE FLOWS VERIFIED SUCCESSFULLY!");
    console.log("==================================================");
}

testAcceptAll().catch(err => {
    console.error("Acceptance test error:", err.message, err.response?.data || "");
    process.exit(1);
});
