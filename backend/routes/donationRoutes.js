const express = require("express");
const multer = require("multer");
const path = require("path");

const {
    addDonation,
    analyzeAndCreateDonation,
    analyzeAndMatchDonation,
    validateDonation,
    listDonations
} = require("../controllers/donationController");

const router = express.Router();
router.get(
    "/test-animal-matches",
    async (req, res) => {
        try {
            const {
                findMatchingReceivers
            } = require("../services/matchingService");

            const matches =
                await findMatchingReceivers({
                    receiverType: "ANIMAL_FARM",
                    quantity: "MEDIUM",
                    animalFeedStatus: "ALLOWED"
                });

            res.json({
                success: true,
                targetReceiverType: "ANIMAL_FARM",
                quantity: "MEDIUM",
                animalFeedStatus: "ALLOWED",
                matchCount: matches.length,
                matches: matches
            });
        } catch (error) {
            console.error(
                "Test animal matching error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to test animal matching",
                error: error.message
            });
        }
    }
);
router.post(
    "/test-allocation/:id",
    async (req, res) => {
        try {
            const {
                updateDonationAllocation
            } = require("../models/donationModel");

            const {
                assignedReceiverId,
                assignedReceiverType
            } = req.body;

            const donation =
                await updateDonationAllocation(
                    req.params.id,
                    {
                        assignedReceiverId,
                        assignedReceiverType,
                        allocationStatus: "OFFERED",
                        locked: false
                    }
                );

            res.json({
                success: true,
                message: "Donation allocation test successful",
                donation: donation
            });

        } catch (error) {
            console.error(
                "Test allocation error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to test donation allocation",
                error: error.message
            });
        }
    }
);
router.post("/:id/validate", validateDonation);
// ============================================================
// MULTER CONFIGURATION
// ============================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        const uploadPath = path.join(
            __dirname,
            "..",
            "uploads"
        );

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});


const upload = multer({
    storage: storage,

    fileFilter: function (req, file, cb) {

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    }
});


// ============================================================
// COMPLETE HOSTEL FOOD FLOW
// ============================================================

router.post(
    "/analyze-and-match",
    upload.single("image"),
    analyzeAndCreateDonation
);


// ============================================================
// EXISTING ROUTES
// ============================================================

router.post(
    "/analyze-and-create",
    analyzeAndCreateDonation
);

router.post(
    "/",
    addDonation
);

router.get(
    "/",
    listDonations
);


module.exports = router;