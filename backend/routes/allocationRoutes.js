const express = require("express");

const {
    allocateDonationController,
    acceptDonationController
} = require("../controllers/allocationController");

const router = express.Router();


// ============================================================
// ALLOCATE / OFFER DONATION
// ============================================================

router.post(
    "/:donationId",
    allocateDonationController
);


// ============================================================
// ACCEPT DONATION
// ============================================================

router.post(
    "/:donationId/accept",
    acceptDonationController
);


module.exports = router;