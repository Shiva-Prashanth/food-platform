const {
    getDonationById,
    getDonations,
    updateDonationAllocation,
    acceptDonation
} = require("../models/donationModel");

const {
    findMatchingReceivers
} = require("./matchingService");

const {
    notifyDonationOffer,
    notifyGroupedDonationOffer,
    notifyDonationAccepted,
    notifyNextReceiver,
    notifyBiocompostFallback,
    resolveDonationOfferNotification
} = require("./notificationService");


// ============================================================
// ALLOCATION TIME SETTINGS
// ============================================================

const ALLOCATION_WINDOW_MINUTES = 15;


// ============================================================
// HELPER — CONVERT FIRESTORE DATE / JS DATE
// ============================================================

function toDate(value) {
    if (!value) {
        return null;
    }

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    return new Date(value);
}


// ============================================================
// FIND RECEIVERS FOR A DONATION
// ============================================================

async function findReceiversForDonation(donation) {

    const criteria = {
        quantity: donation.quantity
    };


    // HUMAN → ORPHANAGE

    if (donation.route === "HUMAN") {

        criteria.receiverType =
            "ORPHANAGE";

    }


    // ANIMAL FEED → ANIMAL FARM

    else if (
        donation.route === "ANIMAL_FEED"
    ) {

        criteria.receiverType =
            "ANIMAL_FARM";

        criteria.animalFeedStatus =
            donation.animalFeedStatus;

    }


    // BIOCOMPOST → BIOGAS

    else if (
        donation.route === "BIOCOMPOST"
    ) {

        criteria.receiverType =
            "BIOGAS";

    }


    else {

        throw new Error(
            `Unsupported allocation route: ${donation.route}`
        );

    }

    const receivers =
        await findMatchingReceivers(
            criteria
        );

    return receivers;
}


// ============================================================
// OFFER DONATION TO RECEIVER
// ============================================================

async function offerDonationToReceiver(
    donationId,
    receiver,
    allocationDeadline
) {

    const now =
        new Date();

    const offerExpiresAt =
        new Date(
            now.getTime() +
            OFFER_WINDOW_MINUTES *
            60 *
            1000
        );

    const donation =
        await getDonationById(
            donationId
        );

    if (!donation) {
        throw new Error(
            "Donation not found"
        );
    }

    const existingOfferedIds =
        Array.isArray(
            donation.offeredReceiverIds
        )
            ? donation.offeredReceiverIds
            : [];

    const offeredReceiverIds = [
        ...existingOfferedIds,
        receiver.id
    ];

    // --------------------------------------------------------
    // UPDATE DONATION
    // --------------------------------------------------------

    const updatedDonation =
        await updateDonationAllocation(
            donationId,
            {
                assignedReceiverId:
                    receiver.id,

                assignedReceiverType:
                    receiver.receiverType,

                allocationStatus:
                    "OFFERED",

                locked:
                    false,

                offeredAt:
                    now,

                offerExpiresAt:
                    offerExpiresAt,

                allocationDeadline:
                    allocationDeadline,

                offeredReceiverIds:
                    offeredReceiverIds
            }
        );


    // --------------------------------------------------------
    // CREATE NOTIFICATION
    // --------------------------------------------------------

    try {

        await notifyDonationOffer({
            receiver:
                receiver,

            donation:
                updatedDonation,

            offerExpiresAt:
                offerExpiresAt
        });

        console.log(
            `Notification sent to receiver ${receiver.id} for donation ${donationId}`
        );

    } catch (notificationError) {

        /*
         * The donation allocation has already been saved.
         * Therefore notification failure should not undo
         * the allocation.
         */
        console.error(
            `Failed to create donation offer notification for ${donationId}:`,
            notificationError.message
        );
    }


    return updatedDonation;
}


// ============================================================
// FIND NEXT RECEIVER
// ============================================================

async function findNextReceiver(
    donation
) {

    const receivers =
        await findReceiversForDonation(
            donation
        );

    const offeredReceiverIds =
        Array.isArray(
            donation.offeredReceiverIds
        )
            ? donation.offeredReceiverIds
            : [];

    const availableReceivers =
        receivers.filter(
            receiver =>
                !offeredReceiverIds.includes(
                    receiver.id
                )
        );

    return availableReceivers;
}


// ============================================================
// ALLOCATE DONATION (BROADCAST TO ALL MATCHING RECEIVERS)
// ============================================================

async function allocateDonation(
    donationId,
    options = {}
) {

    let donation =
        await getDonationById(
            donationId
        );

    if (!donation) {
        throw new Error(
            "Donation not found"
        );
    }


    if (donation.locked === true) {
        throw new Error(
            "Donation is already locked"
        );
    }


    if (
        donation.allocationStatus ===
        "ACCEPTED"
    ) {
        throw new Error(
            "Donation has already been accepted"
        );
    }


    // Validation must be completed first.
    if (
        donation.validationRequired === true &&
        donation.validationStatus !==
        "COMPLETED"
    ) {
        throw new Error(
            "Donation requires human validation before allocation"
        );
    }


    // --------------------------------------------------------
    // DETERMINE GLOBAL 15-MINUTE ALLOCATION DEADLINE
    // --------------------------------------------------------

    let allocationDeadline =
        donation.allocationDeadline
            ? toDate(
                donation.allocationDeadline
            )
            : null;


    if (!allocationDeadline) {

        allocationDeadline =
            new Date(
                Date.now() +
                ALLOCATION_WINDOW_MINUTES *
                60 *
                1000
            );
    }


    // --------------------------------------------------------
    // OVERALL DEADLINE EXPIRED
    // --------------------------------------------------------

    if (
        new Date() >
        allocationDeadline
    ) {

        console.log(
            `Allocation deadline expired for donation ${donationId}. Moving to BIOCOMPOST.`
        );

        return moveDonationToBiogas(
            donationId
        );
    }


    // --------------------------------------------------------
    // FIND ALL MATCHING RECEIVERS (SIMULTANEOUS BROADCAST)
    // --------------------------------------------------------

    const receivers =
        await findReceiversForDonation(
            donation
        );


    // --------------------------------------------------------
    // NO MATCHING RECEIVERS
    // --------------------------------------------------------

    if (!receivers.length) {

        console.log(
            `No matching receivers currently available for donation ${donationId}`
        );

        const updatedDonation =
            await updateDonationAllocation(
                donationId,
                {
                    assignedReceiverId:
                        null,

                    assignedReceiverType:
                        null,

                    allocationStatus:
                        "WAITING_FOR_RECEIVER",

                    locked:
                        false,

                    offerExpiresAt:
                        null,

                    allocationDeadline:
                        allocationDeadline,

                    offeredReceiverIds:
                        donation.offeredReceiverIds || []
                }
            );

        return {
            success: false,

            message:
                "No matching receivers currently available",

            donation:
                updatedDonation,

            receivers:
                []
        };
    }


    // --------------------------------------------------------
    // OFFER TO ALL MATCHING RECEIVERS SIMULTANEOUSLY
    // --------------------------------------------------------

    const offeredReceiverIds =
        receivers.map(r => r.id);

    const updatedDonation =
        await updateDonationAllocation(
            donationId,
            {
                assignedReceiverId:
                    null,

                assignedReceiverType:
                    receivers[0]?.receiverType || null,

                allocationStatus:
                    "OFFERED",

                locked:
                    false,

                offeredAt:
                    new Date(),

                offerExpiresAt:
                    null,

                allocationDeadline:
                    allocationDeadline,

                offeredReceiverIds:
                    offeredReceiverIds
            }
        );


    // --------------------------------------------------------
    // NOTIFY EVERY MATCHING RECEIVER
    // --------------------------------------------------------
    // Normal single-donation allocation sends individual
    // notifications.
    //
    // Batch allocation passes { notify: false } so that
    // allocateDonationBatch() can send one grouped notification
    // per receiver instead.

    if (options.notify !== false) {

        for (const receiver of receivers) {

            try {

                await notifyDonationOffer({
                    receiver:
                        receiver,

                    donation:
                        updatedDonation,

                    offerExpiresAt:
                        allocationDeadline
                });

                console.log(
                    `Notification sent to receiver ${receiver.id} (${receiver.name}) for donation ${donationId}`
                );

            } catch (notificationError) {

                console.error(
                    `Failed to create donation offer notification for receiver ${receiver.id}:`,
                    notificationError.message
                );
            }
        }
    }


    return {
        success: true,

        message:
            "Donation offered to all matching receivers",

        donation:
            updatedDonation,

        receivers:
            receivers,

        allocationDeadline:
            allocationDeadline
    };
}
// ============================================================
// ALLOCATE MULTIPLE DONATIONS FROM ONE HOSTEL SESSION
// AND GROUP NOTIFICATIONS BY RECEIVER
// ============================================================

async function allocateDonationBatch(donations) {

    if (!Array.isArray(donations) || donations.length === 0) {
        throw new Error("At least one donation is required");
    }

    // --------------------------------------------------------
    // Store donations grouped by receiver
    // --------------------------------------------------------

    const receiverGroups = new Map();

    const allocationResults = [];

    // --------------------------------------------------------
    // Allocate each donation without changing the existing
    // allocation logic
    // --------------------------------------------------------

    for (const donation of donations) {

        if (!donation || !donation.id) {
            continue;
        }

        const result =
            await allocateDonation(
                donation.id,
                {
                    notify: false
                }
            );

        allocationResults.push(result);

        // ----------------------------------------------------
        // Group matching receivers
        // ----------------------------------------------------

        if (
            result &&
            Array.isArray(result.receivers)
        ) {

            for (const receiver of result.receivers) {

                if (!receiver || !receiver.id) {
                    continue;
                }

                if (!receiverGroups.has(receiver.id)) {

                    receiverGroups.set(
                        receiver.id,
                        {
                            receiver,
                            donations: []
                        }
                    );
                }

                receiverGroups
                    .get(receiver.id)
                    .donations
                    .push(
                        result.donation
                    );
            }
        }
    }

    // --------------------------------------------------------
    // Create ONE notification per receiver
    // --------------------------------------------------------

    for (const group of receiverGroups.values()) {

        try {

            await notifyGroupedDonationOffer({
                receiver:
                    group.receiver,

                donations:
                    group.donations,

                offerExpiresAt:
                    group.donations
                        .map(
                            donation =>
                                donation.allocationDeadline
                        )
                        .filter(Boolean)
                        .sort(
                            (a, b) =>
                                new Date(a) -
                                new Date(b)
                        )[0] || null
            });

            console.log(
                `Grouped donation notification sent to ${group.receiver.id} for ${group.donations.length} donation(s)`
            );

        } catch (notificationError) {

            console.error(
                `Failed to create grouped notification for receiver ${group.receiver.id}:`,
                notificationError.message
            );
        }
    }

    return {
        success: true,
        allocations: allocationResults
    };
}

async function moveDonationToBiogas(
    donationId
) {

    const db =
        require("./firebase");

    const donationRef =
        db.collection("donations").doc(donationId);


    // ========================================================
    // 1. READ DONATION BEFORE TRANSACTION
    // ========================================================

    const donation =
        await getDonationById(
            donationId
        );

    if (!donation) {
        throw new Error(
            "Donation not found"
        );
    }


    // ========================================================
    // 2. IF ALREADY LOCKED, DO NOT MOVE TO BIOCOMPOST
    // ========================================================

    if (
        donation.locked === true ||
        donation.allocationStatus === "ACCEPTED"
    ) {

        return {
            success: false,

            message:
                "Donation was already accepted or locked",

            donation:
                donation
        };
    }


    // ========================================================
    // 3. FIND BIOGAS RECEIVER OUTSIDE TRANSACTION
    // ========================================================

    const receivers =
        await findMatchingReceivers({
            receiverType:
                "BIOGAS",

            quantity:
                donation.quantity
        });


    if (!receivers.length) {

        throw new Error(
            "BIOGAS receiver expected to be available, but none was found"
        );
    }


    const biogasReceiver =
        receivers[0];


    // ========================================================
    // 4. TRANSACTION — RACE-SAFE FINAL DECISION
    // ========================================================

    const transactionResult =
        await db.runTransaction(
            async (transaction) => {

                const snapshot =
                    await transaction.get(
                        donationRef
                    );


                if (!snapshot.exists) {

                    throw new Error(
                        "Donation not found"
                    );
                }


                const currentDonation = {
                    id:
                        snapshot.id,

                    ...snapshot.data()
                };


                // ------------------------------------------------
                // ANOTHER RECEIVER WON THE RACE
                // ------------------------------------------------

                if (
                    currentDonation.locked === true ||
                    currentDonation.allocationStatus ===
                    "ACCEPTED"
                ) {

                    return null;
                }


                const now =
                    new Date();


                // ------------------------------------------------
                // BIOCOMPOST WINS THE RACE
                // ------------------------------------------------

                transaction.update(
                    donationRef,
                    {
                        assignedReceiverId:
                            biogasReceiver.id,

                        assignedReceiverType:
                            biogasReceiver.receiverType,

                        allocationStatus:
                            "ALLOCATED_TO_BIOGAS",

                        locked:
                            true,

                        offeredAt:
                            null,

                        offerExpiresAt:
                            null,

                        allocationDeadline:
                            null,

                        route:
                            "BIOCOMPOST",

                        updatedAt:
                            now
                    }
                );


                return {
                    ...currentDonation,

                    assignedReceiverId:
                        biogasReceiver.id,

                    assignedReceiverType:
                        biogasReceiver.receiverType,

                    allocationStatus:
                        "ALLOCATED_TO_BIOGAS",

                    locked:
                        true,

                    offeredAt:
                        null,

                    offerExpiresAt:
                        null,

                    allocationDeadline:
                        null,

                    route:
                        "BIOCOMPOST",

                    updatedAt:
                        now,

                    _biogasReceiver:
                        biogasReceiver
                };
            }
        );


    // ========================================================
    // 5. RECEIVER ACCEPTANCE WON THE RACE
    // ========================================================

    if (!transactionResult) {

        const currentDonation =
            await getDonationById(
                donationId
            );

        return {
            success: false,

            message:
                "Donation was already accepted or locked",

            donation:
                currentDonation
        };
    }


    // ========================================================
    // 6. GET FINAL DONATION
    // ========================================================

    const finalDonation =
        await getDonationById(
            donationId
        );


    // ========================================================
    // 7. CREATE BIOCOMPOST NOTIFICATION
    // ========================================================

    try {

        await notifyBiocompostFallback({
            recipientId:
                null,

            recipientType:
                "SYSTEM",

            donation:
                finalDonation
        });


        console.log(
            `BIOCOMPOST notification created for donation ${donationId}`
        );

    } catch (notificationError) {

        console.error(
            `Failed to create BIOCOMPOST notification for ${donationId}:`,
            notificationError.message
        );
    }


    // ========================================================
    // 8. RETURN RESULT
    // ========================================================

    return {
        success: true,

        message:
            "Allocation deadline expired. Donation sent to BIOCOMPOST.",

        donation:
            finalDonation,

        receiver:
            transactionResult._biogasReceiver,

        fallbackRoute:
            "BIOCOMPOST"
    };
}
// ============================================================
// ACCEPT DONATION
// ============================================================

async function acceptDonationOffer(
    donationId,
    receiverId
) {

    if (!receiverId) {
        throw new Error(
            "Receiver ID is required"
        );
    }


    // --------------------------------------------------------
    // ACCEPT AND LOCK DONATION
    // --------------------------------------------------------

    const updatedDonation =
        await acceptDonation(
            donationId,
            receiverId
        );


    // --------------------------------------------------------
    // RESOLVE ORIGINAL DONATION OFFER NOTIFICATION
    // --------------------------------------------------------

    try {

        await resolveDonationOfferNotification(
            donationId,
            receiverId
        );

    } catch (resolveError) {

        console.error(
            `Failed to resolve donation offer notification for ${donationId}:`,
            resolveError.message
        );
    }


    // --------------------------------------------------------
    // CREATE ACCEPTANCE NOTIFICATION
    // --------------------------------------------------------

    try {

        await notifyDonationAccepted({
            receiver: {
                id:
                    receiverId,

                receiverType:
                    updatedDonation.assignedReceiverType
            },

            donation:
                updatedDonation
        });

        console.log(
            `Acceptance notification created for donation ${donationId}`
        );

    } catch (notificationError) {

        console.error(
            `Failed to create acceptance notification for ${donationId}:`,
            notificationError.message
        );
    }


    return {
        success: true,

        message:
            "Donation accepted by receiver",

        donation:
            updatedDonation
    };
}


// ============================================================
// CHECK EXPIRED ALLOCATIONS (GLOBAL 15-MINUTE DEADLINE)
// ============================================================

async function processExpiredAllocations() {

    const donations =
        await getDonations();


    for (const donation of donations) {

        try {

            if (
                donation.locked === true
            ) {
                continue;
            }


            const allocationDeadline =
                toDate(
                    donation.allocationDeadline
                );


            // ------------------------------------------------
            // 1. OVERALL 15-MINUTE DEADLINE EXPIRED -> BIOCOMPOST
            // ------------------------------------------------

            if (
                allocationDeadline &&
                new Date() >
                allocationDeadline
            ) {

                console.log(
                    `Allocation deadline expired for donation ${donation.id}. Moving to BIOCOMPOST.`
                );

                await moveDonationToBiogas(
                    donation.id
                );

                continue;
            }


            // ------------------------------------------------
            // 2. RETRY WAITING DONATIONS IF RECEIVERS AVAILABLE
            // ------------------------------------------------

            if (
                donation.allocationStatus ===
                "WAITING_FOR_RECEIVER"
            ) {

                const receivers =
                    await findReceiversForDonation(
                        donation
                    );

                if (receivers.length > 0) {

                    console.log(
                        `New matching receivers found for waiting donation ${donation.id}. Offering donation...`
                    );

                    await allocateDonation(
                        donation.id
                    );
                }

                continue;
            }

        } catch (error) {

            console.error(
                `Expired allocation processing failed for ${donation.id}:`,
                error.message
            );
        }
    }
}


// ============================================================
// START ALLOCATION MONITOR
// ============================================================

function startAllocationMonitor() {

    console.log(
        "Allocation expiry monitor started"
    );


    // Check every 30 seconds.

    setInterval(
        async () => {

            try {

                await processExpiredAllocations();

            } catch (error) {

                console.error(
                    "Allocation monitor error:",
                    error.message
                );
            }

        },
        30 * 1000
    );
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    findReceiversForDonation,

    offerDonationToReceiver,

    allocateDonation,

    allocateDonationBatch,

    acceptDonationOffer,

    processExpiredAllocations,

    startAllocationMonitor,

    moveDonationToBiogas
};