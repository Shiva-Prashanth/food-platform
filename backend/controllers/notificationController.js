const {
    getNotificationsForRecipient
} = require("../services/notificationService");

// ============================================================
// GET NOTIFICATIONS FOR RECIPIENT
// ============================================================

async function getNotificationsController(req, res) {
    try {
        const recipientId = req.params.recipientId;

        if (!recipientId) {
            return res.status(400).json({
                success: false,
                message: "Recipient ID is required"
            });
        }

        const notifications =
            await getNotificationsForRecipient(recipientId);

        return res.status(200).json({
            success: true,
            notifications: notifications
        });
    } catch (error) {
        console.error("Get notifications error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get notifications",
            error: error.message
        });
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getNotificationsController
};
