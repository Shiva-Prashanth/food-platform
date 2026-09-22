const express = require("express");

const {
    getNotificationsController
} = require("../controllers/notificationController");

const router = express.Router();

// ============================================================
// GET NOTIFICATIONS FOR RECIPIENT
// ============================================================

router.get(
    "/:recipientId",
    getNotificationsController
);

module.exports = router;
