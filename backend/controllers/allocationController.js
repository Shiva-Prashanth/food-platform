const {
    allocateDonation,
    acceptDonationOffer
} = require("../services/allocationService");


// ============================================================
// ALLOCATE DONATION
// ============================================================

async function allocateDonationController(req, res) {

    try {

        const donationId =
            req.params.donationId;

        if (!donationId) {
            return res.status(400).json({
                success: false,
                message: "Donation ID is required"
            });
        }

        const result =
            await allocateDonation(
                donationId
            );

        if (!result.success) {
            return res.status(404).json(
                result
            );
        }

        return res.status(200).json(
            result
        );

    } catch (error) {

        console.error(
            "Allocation controller error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to allocate donation",
            error:
                error.message
        });
    }
}


// ============================================================
// ACCEPT DONATION
// ============================================================

async function acceptDonationController(
    req,
    res
) {

    try {

        const donationId =
            req.params.donationId;

        const receiverId =
            req.body.receiverId;

        if (!donationId) {
            return res.status(400).json({
                success: false,
                message:
                    "Donation ID is required"
            });
        }

        if (!receiverId) {
            return res.status(400).json({
                success: false,
                message:
                    "Receiver ID is required"
            });
        }

        const result =
            await acceptDonationOffer(
                donationId,
                receiverId
            );

        return res.status(200).json(
            result
        );

    } catch (error) {

        console.error(
            "Accept donation controller error:",
            error
        );

        return res.status(400).json({
            success: false,
            message:
                error.message
        });
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    allocateDonationController,
    acceptDonationController
};