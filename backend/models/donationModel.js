const db = require("../services/firebase");

const donationsCollection = db.collection("donations");

async function createDonation(donationData) {
    const donation = {
        food: donationData.food,
        route: donationData.route,
        quantity: donationData.quantity,
        location: donationData.location,
        sessionId:
            donationData.sessionId ?? null,
        finalAssessment:
            donationData.finalAssessment ?? null,

        animalFeedStatus:
            donationData.animalFeedStatus ?? null,

        validationRequired:
            donationData.validationRequired ?? false,

        validationStatus:
            donationData.validationStatus ??
            (
                donationData.validationRequired === true
                    ? "PENDING"
                    : "NOT_REQUIRED"
            ),

        validationDecision:
            donationData.validationDecision ?? null,

        assignedReceiverId:
            donationData.assignedReceiverId ?? null,

        assignedReceiverType:
            donationData.assignedReceiverType ?? null,

        allocationStatus:
            donationData.allocationStatus ??
            (
                donationData.validationRequired === true
                    ? "PENDING_VALIDATION"
                    : "PENDING_ALLOCATION"
            ),

        locked:
            donationData.locked ?? false,

        allocationDeadline:
            donationData.allocationDeadline ?? null,

        offerExpiresAt:
            donationData.offerExpiresAt ?? null,

        // Receivers that have already received an offer
        // for this donation.
        offeredReceiverIds:
            donationData.offeredReceiverIds ?? [],

        createdAt:
            new Date()
    };

    const document =
        await donationsCollection.add(donation);

    return {
        id: document.id,
        ...donation
    };
}

async function getDonations() {
    const snapshot =
        await donationsCollection.get();

    const donations = [];

    snapshot.forEach((doc) => {
        donations.push({
            id: doc.id,
            ...doc.data()
        });
    });

    return donations;
}

async function getDonationById(donationId) {
    const document =
        await donationsCollection.doc(donationId).get();

    if (!document.exists) {
        return null;
    }

    return {
        id: document.id,
        ...document.data()
    };
}

async function updateDonationValidation(
    donationId,
    validationDecision
) {
    const donationRef =
        donationsCollection.doc(donationId);

    const updateData = {
        validationDecision:
            validationDecision,

        validationStatus:
            "COMPLETED",

        updatedAt:
            new Date()
    };

    if (validationDecision === "HUMAN") {
        updateData.route = "HUMAN";
        updateData.allocationStatus =
            "PENDING_ALLOCATION";
    } else if (validationDecision === "ANIMAL") {
        updateData.route = "ANIMAL_FEED";
        updateData.allocationStatus =
            "PENDING_ALLOCATION";
    } else if (validationDecision === "BIOCOMPOST") {
        updateData.route = "BIOCOMPOST";
        updateData.allocationStatus =
            "PENDING_ALLOCATION";
    }

    await donationRef.update(updateData);

    return getDonationById(donationId);
}

async function updateDonationAllocation(
    donationId,
    allocationData
) {
    const donationRef =
        donationsCollection.doc(donationId);

    const updateData = {
        assignedReceiverId:
            allocationData.assignedReceiverId ?? null,

        assignedReceiverType:
            allocationData.assignedReceiverType ?? null,

        allocationStatus:
            allocationData.allocationStatus ??
            "OFFERED",

        locked:
            allocationData.locked ?? false,

        offeredAt:
            allocationData.offeredAt ??
            new Date(),

        offerExpiresAt:
            allocationData.offerExpiresAt ?? null,

        allocationDeadline:
            allocationData.allocationDeadline ?? null,

        offeredReceiverIds:
            allocationData.offeredReceiverIds ?? undefined,

        updatedAt:
            new Date()
    };

    // Firestore does not allow undefined fields.
    if (updateData.offeredReceiverIds === undefined) {
        delete updateData.offeredReceiverIds;
    }

    await donationRef.update(updateData);

    return getDonationById(donationId);
}

async function acceptDonation(
    donationId,
    receiverId
) {
    const donationRef =
        donationsCollection.doc(donationId);

    try {
        const acceptedDonation =
            await db.runTransaction(async (transaction) => {

                const donationSnapshot =
                    await transaction.get(donationRef);

                if (!donationSnapshot.exists) {
                    throw new Error(
                        "Donation not found"
                    );
                }

                const donation = {
                    id: donationSnapshot.id,
                    ...donationSnapshot.data()
                };

                // Donation must still be available
                if (
                    donation.allocationStatus !== "OFFERED"
                ) {
                    throw new Error(
                        "Donation is not currently available for acceptance"
                    );
                }

                // First successful acceptance locks the donation
                if (donation.locked === true) {
                    throw new Error(
                        "Donation is already locked"
                    );
                }

                // Verify receiver was one of the receivers
                // who received the donation offer
                const offeredIds =
                    Array.isArray(donation.offeredReceiverIds)
                        ? donation.offeredReceiverIds
                        : [];

                if (
                    !offeredIds.includes(receiverId) &&
                    donation.assignedReceiverId !== receiverId
                ) {
                    throw new Error(
                        "This donation was not offered to this receiver"
                    );
                }

                // Check the global 15-minute allocation deadline
                if (donation.allocationDeadline) {
                    const deadline =
                        typeof donation.allocationDeadline.toDate === "function"
                            ? donation.allocationDeadline.toDate()
                            : new Date(donation.allocationDeadline);

                    if (new Date() > deadline) {
                        throw new Error(
                            "Donation allocation deadline has expired"
                        );
                    }
                }

                const now = new Date();

                const updateData = {
                    assignedReceiverId: receiverId,

                    allocationStatus: "ACCEPTED",

                    locked: true,

                    acceptedAt: now,

                    updatedAt: now,

                    // No further acceptance should remain active
                    offerExpiresAt: null
                };

                transaction.update(
                    donationRef,
                    updateData
                );

                return {
                    ...donation,
                    ...updateData
                };
            });

        return acceptedDonation;

    } catch (error) {
        throw error;
    }
}

module.exports = {
    createDonation,
    getDonations,
    getDonationById,
    updateDonationValidation,
    updateDonationAllocation,
    acceptDonation
};