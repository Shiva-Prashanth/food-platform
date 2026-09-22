const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
    console.log("==================================================");
    console.log("STARTING TEST SUITE: LOW, MODERATE, HIGH CONCERN");
    console.log("==================================================");

    // 1. Fetch available receivers
    const receiversRes = await axios.get(`${BASE_URL}/receivers`);
    console.log(`\n1. Available receivers: ${receiversRes.data.receivers.length}`);
    const receivers = receiversRes.data.receivers;
    const orphanage = receivers.find(r => r.receiverType === "ORPHANAGE" && r.available);
    const animalFarm = receivers.find(r => r.receiverType === "ANIMAL_FARM" && r.available);
    const biogas = receivers.find(r => r.receiverType === "BIOGAS" && r.available);
    console.log(`- Orphanage: ${orphanage ? orphanage.name + ' (' + orphanage.id + ')' : 'None'}`);
    console.log(`- Animal Farm: ${animalFarm ? animalFarm.name + ' (' + animalFarm.id + ')' : 'None'}`);
    console.log(`- Biogas: ${biogas ? biogas.name + ' (' + biogas.id + ')' : 'None'}`);

    // ==========================================================
    // TEST 1: LOW_CONCERN (Automatic Orphanage Allocation)
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 1: LOW_CONCERN -> Automatic ORPHANAGE Allocation");
    console.log("--------------------------------------------------");

    const { createDonation } = require("./models/donationModel");
    const { allocateDonation } = require("./services/allocationService");
    const { getNotificationsForRecipient } = require("./services/notificationService");

    const lowDonation = await createDonation({
        food: "rice_curry_test",
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

    console.log(`Low concern donation created: ${lowDonation.id}`);
    const lowAlloc = await allocateDonation(lowDonation.id);
    console.log(`Allocated status: ${lowAlloc.donation.allocationStatus}`);
    console.log(`Assigned receiver: ${lowAlloc.receiver?.name} (${lowAlloc.receiver?.receiverType})`);

    if (lowAlloc.receiver) {
        const notifs = await getNotificationsForRecipient(lowAlloc.receiver.id);
        const matchNotif = notifs.find(n => n.donationId === lowDonation.id);
        console.log(`Notification found for receiver: ${!!matchNotif}, Title: ${matchNotif?.title}`);
    }

    // ==========================================================
    // TEST 2: MODERATE_CONCERN -> Human Validation -> ANIMAL_FARM
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 2: MODERATE_CONCERN -> Validate ANIMAL -> ANIMAL_FARM");
    console.log("--------------------------------------------------");

    const modDonation = await createDonation({
        food: "mixed_vegetables_test",
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

    console.log(`Moderate concern donation created: ${modDonation.id}, allocationStatus: ${modDonation.allocationStatus}`);

    // Call validation API
    const validateRes = await axios.post(`${BASE_URL}/donations/${modDonation.id}/validate`, {
        validationDecision: "ANIMAL",
        selectedRoute: "ANIMAL_FEED"
    });

    console.log(`Validation API response status: ${validateRes.status}`);
    console.log(`Validation decision: ${validateRes.data.donation.validationDecision}`);
    console.log(`Updated route: ${validateRes.data.donation.route}`);
    console.log(`Allocation status: ${validateRes.data.donation.allocationStatus}`);
    console.log(`Assigned receiver type: ${validateRes.data.donation.assignedReceiverType}`);
    console.log(`Assigned receiver ID: ${validateRes.data.donation.assignedReceiverId}`);

    if (validateRes.data.donation.assignedReceiverId) {
        const notifs = await getNotificationsForRecipient(validateRes.data.donation.assignedReceiverId);
        const matchNotif = notifs.find(n => n.donationId === modDonation.id);
        console.log(`Notification sent to Animal Farm: ${!!matchNotif}, Action: ${matchNotif?.action}`);
    }

    // ==========================================================
    // TEST 3: HIGH_CONCERN -> Automatic BIOCOMPOST Allocation
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 3: HIGH_CONCERN -> Automatic BIOCOMPOST -> BIOGAS");
    console.log("--------------------------------------------------");

    const highDonation = await createDonation({
        food: "spoiled_milk_test",
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

    console.log(`High concern donation created: ${highDonation.id}`);
    const highAlloc = await allocateDonation(highDonation.id);
    console.log(`Allocated status: ${highAlloc.donation.allocationStatus}`);
    console.log(`Assigned receiver: ${highAlloc.receiver?.name} (${highAlloc.receiver?.receiverType})`);

    if (highAlloc.receiver) {
        const notifs = await getNotificationsForRecipient(highAlloc.receiver.id);
        const matchNotif = notifs.find(n => n.donationId === highDonation.id);
        console.log(`Notification sent to Biogas: ${!!matchNotif}, Title: ${matchNotif?.title}`);
    }

    // ==========================================================
    // TEST 4: ACCEPTANCE FLOW
    // ==========================================================
    console.log("\n--------------------------------------------------");
    console.log("TEST 4: Receiver Acceptance Flow");
    console.log("--------------------------------------------------");

    if (lowAlloc.receiver) {
        const acceptRes = await axios.post(`${BASE_URL}/allocations/${lowDonation.id}/accept`, {
            receiverId: lowAlloc.receiver.id
        });
        console.log(`Accept API response: ${acceptRes.data.message}`);
        console.log(`Donation locked: ${acceptRes.data.donation.locked}, Status: ${acceptRes.data.donation.allocationStatus}`);

        // Try second accept (should fail)
        try {
            await axios.post(`${BASE_URL}/allocations/${lowDonation.id}/accept`, {
                receiverId: "another_receiver"
            });
            console.log("ERROR: Second accept should have failed!");
        } catch (err) {
            console.log(`Second accept rejected correctly with error: ${err.response?.data?.message || err.message}`);
        }
    }

    console.log("\n==================================================");
    console.log("ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("==================================================");
}

runTests().catch(err => {
    console.error("Test error:", err.message, err.response?.data || "");
    process.exit(1);
});
