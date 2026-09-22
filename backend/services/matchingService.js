const db = require("./firebase");

const receiversCollection = db.collection("receivers");


// ============================================================
// QUANTITY MATCHING
// ============================================================

function quantityMatches(donationQuantity, receiverQuantity) {

    const levels = {
        SMALL: 1,
        MEDIUM: 2,
        LARGE: 3
    };

    const donationLevel =
        levels[String(donationQuantity).toUpperCase()];

    const receiverLevel =
        levels[String(receiverQuantity).toUpperCase()];

    if (!donationLevel || !receiverLevel) {
        return false;
    }

    return donationLevel >= receiverLevel;
}


// ============================================================
// FIND MATCHING RECEIVERS
// ============================================================

async function findMatchingReceivers(criteria = {}) {

    let targetReceiverType = criteria.receiverType
        ? String(criteria.receiverType).trim().toUpperCase()
        : null;

    // Fallback for route-based inputs if receiverType is not explicitly passed
    if (!targetReceiverType && criteria.route) {
        const route = String(criteria.route).trim().toUpperCase();
        if (route === "HUMAN") {
            targetReceiverType = "ORPHANAGE";
        } else if (route === "ANIMAL_FEED") {
            targetReceiverType = "ANIMAL_FARM";
        } else if (route === "BIOGAS" || route === "BIOCOMPOST") {
            targetReceiverType = "BIOGAS";
        }
    }

    // ANIMAL_FARM requires animal_feed_status to be "ALLOWED"
    if (targetReceiverType === "ANIMAL_FARM") {
        const feedStatus = String(
            criteria.animalFeedStatus || criteria.animal_feed_status || ""
        )
            .trim()
            .toUpperCase();

        if (feedStatus !== "ALLOWED") {
            return [];
        }
    }

    const snapshot = await receiversCollection.get();

    const matches = [];

    snapshot.forEach((doc) => {

        const receiver = {
            id: doc.id,
            ...doc.data()
        };


        // --------------------------------
        // 1. Receiver must be available
        // --------------------------------

        if (receiver.available !== true) {
            return;
        }


        // --------------------------------
        // 2. Receiver type must match
        // --------------------------------

        const receiverType =
            String(receiver.receiverType || "")
                .trim()
                .toUpperCase();

        if (targetReceiverType && receiverType !== targetReceiverType) {
            return;
        }


        // --------------------------------
        // 3. Quantity must match
        // --------------------------------

        if (
            !quantityMatches(
                criteria.quantity,
                receiver.quantityNeeded
            )
        ) {
            return;
        }


        // --------------------------------
        // MATCH FOUND
        // --------------------------------

        matches.push(receiver);

    });

    return matches;
}


module.exports = {
    findMatchingReceivers
};