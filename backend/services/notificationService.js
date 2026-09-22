const db = require("./firebase");

const notificationsCollection =
    db.collection("notifications");


/*
 * Create a notification
 */
async function createNotification(notificationData) {
    const notification = {
        recipientId:
            notificationData.recipientId ?? null,

        recipientName:
            notificationData.recipientName ?? null,

        recipientType:
            notificationData.recipientType ?? null,

        donationId:
            notificationData.donationId ?? null,
        sessionId:
            notificationData.sessionId ?? null,

        donationIds:
            notificationData.donationIds ?? [],

        items:
            notificationData.items ?? [],

        foodName:
            notificationData.foodName ?? null,

        quantity:
            notificationData.quantity ?? null,

        type:
            notificationData.type ?? "GENERAL",

        title:
            notificationData.title ?? "",

        message:
            notificationData.message ?? "",

        action:
            notificationData.action ?? null,

        status:
            notificationData.status ?? "UNREAD",

        expiresAt:
            notificationData.expiresAt ?? null,

        createdAt:
            new Date()
    };

    const document =
        await notificationsCollection.add(
            notification
        );

    return {
        id: document.id,
        ...notification
    };
}


/*
 * Notify a receiver that a donation
 * has been offered to them.
 */
async function notifyDonationOffer({
    receiver,
    donation,
    offerExpiresAt
}) {
    if (!receiver || !receiver.id) {
        throw new Error(
            "Receiver information is required"
        );
    }

    if (!donation || !donation.id) {
        throw new Error(
            "Donation information is required"
        );
    }

    return createNotification({
        recipientId:
            receiver.id,

        recipientName:
            receiver.name ?? null,

        recipientType:
            receiver.receiverType,

        donationId:
            donation.id,

        foodName:
            donation.food ?? null,

        quantity:
            donation.quantity ?? null,

        type:
            "DONATION_OFFER",

        title:
            "New Food Donation Available",

        message:
            `A ${donation.quantity} quantity of ${donation.food} is available for your organization.`,

        action:
            "ACCEPT_DONATION",

        status:
            "UNREAD",

        expiresAt:
            offerExpiresAt
    });
}
/*
 * Notify a receiver about multiple food donations
 * from the same hostel donation session.
 *
 * One notification is created for the receiver,
 * containing all matching food items.
 */
async function notifyGroupedDonationOffer({
    receiver,
    donations,
    offerExpiresAt
}) {
    if (!receiver || !receiver.id) {
        throw new Error(
            "Receiver information is required"
        );
    }

    if (!Array.isArray(donations) || donations.length === 0) {
        throw new Error(
            "At least one donation is required"
        );
    }

    const sessionId = donations[0].sessionId ?? null;

    const items = donations.map((donation) => ({
        donationId: donation.id,
        foodName: donation.food ?? null,
        quantity: donation.quantity ?? null
    }));

    const donationIds = donations.map(
        (donation) => donation.id
    );

    const itemCount = items.length;

    const itemText = items
        .map(
            (item) =>
                `${item.foodName} (${item.quantity})`
        )
        .join(", ");

    return createNotification({
        recipientId:
            receiver.id,

        recipientName:
            receiver.name ?? null,

        recipientType:
            receiver.receiverType,

        donationId:
            itemCount === 1
                ? donationIds[0]
                : null,

        sessionId,

        donationIds,

        items,

        foodName:
            itemCount === 1
                ? items[0].foodName
                : null,

        quantity:
            itemCount === 1
                ? items[0].quantity
                : null,

        type:
            "DONATION_OFFER",

        title:
            "New Food Donation Available",

        message:
            `${itemCount} food item${itemCount > 1 ? "s are" : " is"} available for ${receiver.name ?? "your organization"}: ${itemText}.`,

        action:
            "ACCEPT_DONATION",

        status:
            "UNREAD",

        expiresAt:
            offerExpiresAt
    });
}

/*
 * Notify a receiver when a donation
 * has been accepted.
 */
async function notifyDonationAccepted({
    receiver,
    donation
}) {
    if (!receiver || !receiver.id) {
        throw new Error(
            "Receiver information is required"
        );
    }

    if (!donation || !donation.id) {
        throw new Error(
            "Donation information is required"
        );
    }

    return createNotification({
        recipientId:
            receiver.id,

        recipientName:
            receiver.name ?? null,

        recipientType:
            receiver.receiverType,

        donationId:
            donation.id,

        foodName:
            donation.food ?? null,

        quantity:
            donation.quantity ?? null,

        type:
            "DONATION_ACCEPTED",

        title:
            "Food Donation Accepted",

        message:
            `The ${donation.food} donation has been successfully accepted and locked for your organization.`,

        action:
            null,

        status:
            "UNREAD"
    });
}


/*
 * Notify a receiver that their offer
 * has expired.
 */
async function notifyOfferExpired({
    receiver,
    donation
}) {
    if (!receiver || !receiver.id) {
        throw new Error(
            "Receiver information is required"
        );
    }

    if (!donation || !donation.id) {
        throw new Error(
            "Donation information is required"
        );
    }

    return createNotification({
        recipientId:
            receiver.id,

        recipientName:
            receiver.name ?? null,

        recipientType:
            receiver.receiverType,

        donationId:
            donation.id,

        foodName:
            donation.food ?? null,

        quantity:
            donation.quantity ?? null,

        type:
            "OFFER_EXPIRED",

        title:
            "Food Donation Offer Expired",

        message:
            `The offer for the ${donation.food} donation has expired because it was not accepted within the offer time.`,

        action:
            null,

        status:
            "UNREAD"
    });
}


/*
 * Notify a receiver that the donation
 * has been offered to them after a
 * previous receiver did not accept it.
 */
async function notifyNextReceiver({
    receiver,
    donation,
    offerExpiresAt
}) {
    if (!receiver || !receiver.id) {
        throw new Error(
            "Receiver information is required"
        );
    }

    if (!donation || !donation.id) {
        throw new Error(
            "Donation information is required"
        );
    }

    return createNotification({
        recipientId:
            receiver.id,

        recipientName:
            receiver.name ?? null,

        recipientType:
            receiver.receiverType,

        donationId:
            donation.id,

        foodName:
            donation.food ?? null,

        quantity:
            donation.quantity ?? null,

        type:
            "NEXT_RECEIVER_OFFER",

        title:
            "Food Donation Available",

        message:
            `A ${donation.quantity} quantity of ${donation.food} is now available for your organization after the previous offer expired.`,

        action:
            "ACCEPT_DONATION",

        status:
            "UNREAD",

        expiresAt:
            offerExpiresAt
    });
}


/*
 * Notify about BIOCOMPOST fallback.
 *
 * This notification can be sent to a
 * system/admin receiver later when that
 * recipient is available.
 */
async function notifyBiocompostFallback({
    recipientId = null,
    recipientType = "SYSTEM",
    donation
}) {
    if (!donation || !donation.id) {
        throw new Error(
            "Donation information is required"
        );
    }

    return createNotification({
        recipientId:
            recipientId,

        recipientType:
            recipientType,

        donationId:
            donation.id,

        foodName:
            donation.food ?? null,

        quantity:
            donation.quantity ?? null,

        type:
            "BIOCOMPOST_FALLBACK",

        title:
            "Donation Moved to BIOCOMPOST",

        message:
            `The ${donation.food} donation was not accepted before the allocation deadline and has been moved to BIOCOMPOST.`,

        action:
            null,

        status:
            "UNREAD"
    });
}


/*
 * Get all notifications for a receiver.
 */
async function getNotificationsForRecipient(
    recipientId
) {
    if (!recipientId) {
        throw new Error(
            "Recipient ID is required"
        );
    }

    const snapshot =
        await notificationsCollection
            .where(
                "recipientId",
                "==",
                recipientId
            )
            .get();

    const notifications = [];

    snapshot.forEach((doc) => {
        notifications.push({
            id: doc.id,
            ...doc.data()
        });
    });

    notifications.sort(
        (a, b) => {
            const dateA =
                a.createdAt?.toDate
                    ? a.createdAt.toDate()
                    : new Date(a.createdAt);

            const dateB =
                b.createdAt?.toDate
                    ? b.createdAt.toDate()
                    : new Date(b.createdAt);

            return dateB - dateA;
        }
    );

    return notifications;
}


/*
 * Mark one notification as read.
 */
async function markNotificationAsRead(
    notificationId
) {
    if (!notificationId) {
        throw new Error(
            "Notification ID is required"
        );
    }

    const notificationRef =
        notificationsCollection.doc(
            notificationId
        );

    const document =
        await notificationRef.get();

    if (!document.exists) {
        throw new Error(
            "Notification not found"
        );
    }

    await notificationRef.update({
        status:
            "READ",

        readAt:
            new Date()
    });

    const updatedDocument =
        await notificationRef.get();

    return {
        id: updatedDocument.id,
        ...updatedDocument.data()
    };
}


/*
 * Resolve original DONATION_OFFER notifications after
 * the donation has been accepted by one receiver.
 * - Accepting receiver's offer notification -> status: "ACCEPTED", action: null
 * - Other receivers' offer notifications -> status: "ACCEPTED_BY_OTHER", action: null
 */
async function resolveDonationOfferNotification(
    donationId,
    acceptingReceiverId
) {
    if (!donationId) {
        return;
    }

    const snapshot =
        await notificationsCollection
            .where("donationId", "==", donationId)
            .get();

    const batch = db.batch();
    let hasUpdates = false;

    snapshot.forEach((doc) => {
        const data = doc.data();

        // Only resolve actual donation offer notifications.
        if (
            data.type !== "DONATION_OFFER" &&
            data.type !== "NEXT_RECEIVER_OFFER"
        ) {
            return;
        }

        // Already-resolved notifications do not need to be changed.
        if (
            data.action !== "ACCEPT_DONATION"
        ) {
            return;
        }

        const isAcceptingReceiver =
            acceptingReceiverId &&
            data.recipientId === acceptingReceiverId;

        batch.update(doc.ref, {
            status:
                isAcceptingReceiver
                    ? "ACCEPTED"
                    : "ACCEPTED_BY_OTHER",

            action:
                null,

            updatedAt:
                new Date()
        });

        hasUpdates = true;
    });

    if (hasUpdates) {
        await batch.commit();

        console.log(
            `Resolved all active offer notifications for donation ${donationId}. Accepted by: ${acceptingReceiverId}`
        );
    }
}

module.exports = {
    createNotification,
    notifyDonationOffer,
    notifyGroupedDonationOffer,
    notifyDonationAccepted,
    notifyOfferExpired,
    notifyNextReceiver,
    notifyBiocompostFallback,
    getNotificationsForRecipient,
    markNotificationAsRead,
    resolveDonationOfferNotification
};