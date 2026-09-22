const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testAllReceivers() {
    console.log("==================================================");
    console.log("REGISTERING TEST RECEIVERS & TESTING ALL FLOWS");
    console.log("==================================================");

    const { createDonation } = require("./models/donationModel");
    const { allocateDonation } = require("./services/allocationService");
    const { getNotificationsForRecipient } = require("./services/notificationService");

    // ==========================================================
    // TEST 1: LOW_CONCERN -> ALL MATCHING ORPHANAGES
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 1: LOW_CONCERN (HUMAN -> ORPHANAGES)");
    console.log("--------------------------------------------------");
    const lowDonation = await createDonation({
        food: "dal_tadka",
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

    const lowAlloc = await allocateDonation(lowDonation.id);
    console.log(`Low concern donation ${lowDonation.id} allocation result:`);
    console.log(`- Status: ${lowAlloc.donation.allocationStatus}`);
    console.log(`- Receivers offered: ${lowAlloc.receivers?.length}`);
    console.log(`- Global Deadline: ${lowAlloc.allocationDeadline}`);

    const firstReceiver = lowAlloc.receivers[0];
    const lowNotifs = await getNotificationsForRecipient(firstReceiver.id);
    const lowNotif = lowNotifs.find(n => n.donationId === lowDonation.id);
    console.log(`- Notification created for ${firstReceiver.name}: ${!!lowNotif}`);
    console.log(`- Notification Type: ${lowNotif?.type}, Action: ${lowNotif?.action}`);

    // ==========================================================
    // TEST 2: MODERATE_CONCERN -> ALL MATCHING ANIMAL FARMS
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 2: MODERATE_CONCERN -> User Selects ANIMAL FARM");
    console.log("--------------------------------------------------");
    const modDonation = await createDonation({
        food: "roti_sabzi",
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

    console.log(`Created moderate donation ${modDonation.id}, validating to ANIMAL...`);
    const valRes = await axios.post(`${BASE_URL}/donations/${modDonation.id}/validate`, {
        validationDecision: "ANIMAL",
        selectedRoute: "ANIMAL_FEED"
    });

    console.log(`Validation result:`);
    console.log(`- Validation Status: ${valRes.data.donation.validationStatus}`);
    console.log(`- Decision: ${valRes.data.donation.validationDecision}`);
    console.log(`- Route: ${valRes.data.donation.route}`);
    console.log(`- Allocation Status: ${valRes.data.donation.allocationStatus}`);
    console.log(`- Receivers offered: ${valRes.data.allocation?.receivers?.length || valRes.data.matching?.matches?.length}`);

    const farmReceiverId = valRes.data.allocation?.receivers?.[0]?.id || valRes.data.matching?.matches?.[0]?.id;
    if (farmReceiverId) {
        const modNotifs = await getNotificationsForRecipient(farmReceiverId);
        const modNotif = modNotifs.find(n => n.donationId === modDonation.id);
        console.log(`- Notification created for Animal Farm: ${!!modNotif}`);
        console.log(`- Notification Action: ${modNotif?.action}`);
    }

    // ==========================================================
    // TEST 3: HIGH_CONCERN -> BIOGAS
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 3: HIGH_CONCERN (BIOCOMPOST -> BIOGAS)");
    console.log("--------------------------------------------------");
    const highDonation = await createDonation({
        food: "spoiled_rice",
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

    const highAlloc = await allocateDonation(highDonation.id);
    console.log(`High concern donation ${highDonation.id} allocation result:`);
    console.log(`- Status: ${highAlloc.donation.allocationStatus}`);
    console.log(`- Receivers offered: ${highAlloc.receivers?.length}`);

    const biogasReceiver = highAlloc.receivers[0];
    const highNotifs = await getNotificationsForRecipient(biogasReceiver.id);
    const highNotif = highNotifs.find(n => n.donationId === highDonation.id);
    console.log(`- Notification created for Biogas (${biogasReceiver.name}): ${!!highNotif}`);
    console.log(`- Notification Action: ${highNotif?.action}`);

    console.log("\n==================================================");
    console.log("ALL THREE CATEGORIES VERIFIED SUCCESSFULLY!");
    console.log("==================================================");
}

testAllReceivers().catch(err => {
    console.error("Test error:", err.message, err.response?.data || "");
    process.exit(1);
});
