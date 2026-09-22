const express = require("express");
const router = express.Router();

const { findMatchingReceivers } = require("../services/matchingService");

router.post("/", async (req, res) => {
    try {
        const donation = req.body;

        const matches = await findMatchingReceivers(donation);

        res.json({
            success: true,
            donation: donation,
            matchCount: matches.length,
            matches: matches
        });

    } catch (error) {
        console.error("Matching error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to find matching receivers"
        });
    }
});

module.exports = router;