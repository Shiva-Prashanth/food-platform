const express = require("express");

const {
    createReceiver,
    getReceivers
} = require("../models/receiverModel");

const router = express.Router();

// Create a receiver
router.post("/", async (req, res) => {
    try {
        const receiver = await createReceiver(req.body);

        res.status(201).json({
            success: true,
            message: "Receiver created successfully",
            receiver: receiver
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create receiver"
        });
    }
});

// Get all receivers
router.get("/", async (req, res) => {
    try {
        const receivers = await getReceivers();

        res.json({
            success: true,
            receivers: receivers
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get receivers"
        });
    }
});

module.exports = router;