const path = require("path");

const {
    createDonation,
    getDonations,
    getDonationById,
    updateDonationValidation
} = require("../models/donationModel");
const {
    getDonationSession
} = require("../models/donationSessionModel");
const {
    findMatchingReceivers
} = require("../services/matchingService");

const {
    allocateDonation,
    allocateDonationBatch
} = require("../services/allocationService");

const { analyzeFood } = require("../services/pythonService");


// ============================================================
// CREATE DONATION DIRECTLY
// ============================================================

async function addDonation(req, res) {

    try {

        const {
            food,
            route,
            quantity,
            location
        } = req.body;


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!food || !route || !quantity || !location) {

            return res.status(400).json({
                success: false,
                message:
                    "food, route, quantity and location are required"
            });
        }


        // ----------------------------------------------------
        // CREATE DONATION
        // ----------------------------------------------------

        const donation =
            await createDonation({

                food: food,

                // FIX:
                // selectedRoute does not exist in this function.
                route: route,

                quantity: quantity,

                location: location || "HOSTEL"

            });


        // ----------------------------------------------------
        // FIND MATCHING RECEIVERS
        // ----------------------------------------------------

        const matches =
            await findMatchingReceivers({

                food: food,

                route: route,

                quantity: quantity

            });


        // ----------------------------------------------------
        // RETURN RESULT
        // ----------------------------------------------------

        res.status(201).json({

            success: true,

            donation: donation,

            matchCount: matches.length,

            matches: matches

        });

    } catch (error) {

        console.error(
            "Create donation error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to create donation",

            error:
                error.message

        });
    }
}


// ============================================================
// ANALYZE FOOD + CREATE DONATION
// ============================================================
//
// Decision rules:
//
// LOW_CONCERN
//     -> ORPHANAGE
//
// MODERATE_CONCERN
//     -> HUMAN VALIDATION REQUIRED
//     -> HUMAN / ANIMAL / BIOCOMPOST
//
// HIGH_CONCERN
//     -> BIOCOMPOST
//
// IMPORTANT:
// This step does not yet implement receiver acceptance,
// notification, timeout or donation locking.
// ============================================================

async function analyzeAndCreateDonation(req, res) {

    try {

        // ----------------------------------------------------
        // GET HOSTEL FOOD INFORMATION
        // ----------------------------------------------------

        const imagePath = req.file
            ? path.resolve(req.file.path)
            : req.body.imagePath;

        const {
            preparationTime,
            temperature,
            storage,
            smell,
            quantity,
            location
        } = req.body;


        // ----------------------------------------------------
        // VALIDATE INPUT
        // ----------------------------------------------------

        if (
            !imagePath ||
            !preparationTime ||
            temperature === undefined ||
            !storage ||
            !smell ||
            !quantity
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "imagePath, preparationTime, temperature, storage, smell and quantity are required"

            });
        }


        // ----------------------------------------------------
        // SEND FOOD INFORMATION TO PYTHON
        // ----------------------------------------------------

        console.log(
            "\nSending food information to Python:"
        );

        console.log({

            imagePath,

            preparationTime,

            temperature,

            storage,

            smell

        });


        const pythonResult =
            await analyzeFood({

                imagePath,

                preparationTime,

                temperature: Number(temperature),

                storage,

                smell

            });


        // ----------------------------------------------------
        // CHECK PYTHON RESPONSE
        // ----------------------------------------------------

        if (!pythonResult || !pythonResult.success) {

            return res.status(500).json({

                success: false,

                message:
                    "Python food analysis failed"

            });
        }


        // ----------------------------------------------------
        // GET MODEL RESULT
        // ----------------------------------------------------

        const modelResult =
            pythonResult.result;


        if (!modelResult) {

            return res.status(500).json({

                success: false,

                message:
                    "Python model did not return a result"

            });
        }


        // ====================================================
        // MODEL 1
        // FOOD DETECTION
        // ====================================================

        const food =
            modelResult.food_name;


        if (!food) {

            return res.status(500).json({

                success: false,

                message:
                    "Food was not detected by Model 1"

            });
        }


        // ====================================================
        // MODEL 2
        // FOOD CONDITION
        // ====================================================

        const finalAssessment =
            String(
                modelResult.final_assessment || ""
            )
                .trim()
                .toLowerCase();


        const verificationRequired =
            modelResult.verification_required;


        // ====================================================
        // MODEL 3 INFORMATION
        // ====================================================

        const animalFeedStatus =
            modelResult.animal_feed_status || null;


        const recoveryRoutes =
            Array.isArray(
                modelResult.recovery_routes
            )
                ? modelResult.recovery_routes
                : [];


        const primaryRoute =
            modelResult.primary_route || null;


        console.log(
            "\nModel analysis information:"
        );

        console.log({

            food,

            finalAssessment,

            animalFeedStatus,

            primaryRoute,

            recoveryRoutes,

            verificationRequired

        });


        // ====================================================
        // DETERMINE ALLOCATION CATEGORY
        // ====================================================

        let selectedRoute = null;

        let requiresHumanValidation = false;

        let matches = [];


        // ====================================================
        // LOW CONCERN
        // ====================================================

        if (finalAssessment === "low_concern") {

            selectedRoute = "HUMAN";

            console.log(
                "\nLOW_CONCERN -> targeting ORPHANAGE"
            );


            matches =
                await findMatchingReceivers({

                    receiverType: "ORPHANAGE",

                    quantity: quantity

                });


            console.log(
                `Orphanage matches: ${matches.length}`
            );
        }


        // ====================================================
        // MODERATE CONCERN
        // ====================================================

        else if (
            finalAssessment === "moderate_concern"
        ) {

            requiresHumanValidation = true;

            console.log(
                "\nMODERATE_CONCERN -> human validation required"
            );


            selectedRoute =
                "PENDING_HUMAN_VALIDATION";

            matches = [];
        }


        // ====================================================
        // HIGH CONCERN
        // ====================================================

        else if (
            finalAssessment === "high_concern"
        ) {

            selectedRoute = "BIOCOMPOST";

            console.log(
                "\nHIGH_CONCERN -> targeting BIOCOMPOST"
            );


            matches =
                await findMatchingReceivers({

                    receiverType: "BIOGAS",

                    quantity: quantity

                });


            console.log(
                `Bio destination matches: ${matches.length}`
            );
        }


        // ====================================================
        // MANUAL VERIFICATION
        // ====================================================

        else if (
            finalAssessment === "manual_verification"
        ) {

            requiresHumanValidation = true;

            selectedRoute =
                "PENDING_HUMAN_VALIDATION";

            matches = [];

            console.log(
                "\nMANUAL_VERIFICATION -> human validation required"
            );
        }


        // ====================================================
        // UNKNOWN ASSESSMENT
        // ====================================================

        else {

            return res.status(500).json({

                success: false,

                message:
                    `Unknown final assessment returned by Python: ${modelResult.final_assessment}`

            });
        }


        // ====================================================
        // CREATE DONATION
        // ====================================================

        const donation =
            await createDonation({

                food: food,

                route: selectedRoute,

                quantity: quantity,

                location: location || "HOSTEL",

                finalAssessment:
                    finalAssessment,

                animalFeedStatus:
                    animalFeedStatus,

                validationRequired:
                    requiresHumanValidation,

                validationStatus:
                    requiresHumanValidation
                        ? "PENDING"
                        : "NOT_REQUIRED",

                validationDecision:
                    null,

                assignedReceiverId:
                    null,

                assignedReceiverType:
                    null,

                allocationStatus:
                    requiresHumanValidation
                        ? "PENDING_VALIDATION"
                        : "PENDING_ALLOCATION",

                locked:
                    false

            });


        // ====================================================
        // AUTOMATIC ALLOCATION (WHEN HUMAN VALIDATION NOT REQUIRED)
        // ====================================================

        let allocationResult = null;

        if (requiresHumanValidation === false) {

            try {

                allocationResult =
                    await allocateDonation(
                        donation.id
                    );

                console.log(
                    `\nAutomatic allocation result for donation ${donation.id}:`,
                    allocationResult
                );

            } catch (allocationError) {

                console.error(
                    `\nAutomatic allocation failed for donation ${donation.id}:`,
                    allocationError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Donation created but automatic allocation failed",

                    error:
                        allocationError.message,

                    donation:
                        donation

                });
            }
        }


        // ====================================================
        // RETURN COMPLETE RESULT
        // ====================================================

        res.status(201).json({

            success: true,

            donation:
                allocationResult?.donation || donation,

            allocation:
                allocationResult,

            allocationResult:
                allocationResult,

            matchCount:
                matches.length,

            matches:
                matches,

            selectedRoute:
                selectedRoute,

            requiresHumanValidation:
                requiresHumanValidation,

            validationOptions:
                requiresHumanValidation
                    ? recoveryRoutes
                        .filter((route) =>
                            ["HUMAN", "ANIMAL_FEED", "BIOCOMPOST"].includes(route)
                        )
                        .map((route) =>
                            route === "ANIMAL_FEED"
                                ? "ANIMAL"
                                : route
                        )
                    : [],

            modelResult: {

                food:
                    modelResult.food_name,

                foodConfidence:
                    modelResult.food_confidence,

                visualAssessment:
                    modelResult.visual_assessment,

                goodPercentage:
                    modelResult.good_percentage,

                badPercentage:
                    modelResult.bad_percentage,

                finalAssessment:
                    modelResult.final_assessment,

                animalFeed:
                    modelResult.animal_feed_status,

                primaryRoute:
                    modelResult.primary_route,

                recoveryRoutes:
                    modelResult.recovery_routes,

                verificationRequired:
                    modelResult.verification_required

            }

        });

    } catch (error) {

        console.error(
            "\nAnalyze and create donation error:"
        );

        console.error(error);


        res.status(500).json({

            success: false,

            message:
                "Failed to analyze food and create donation",

            error:
                error.message

        });
    }
}


// ============================================================
// HUMAN VALIDATION + MATCHING
// ============================================================
//
// Used for donations with:
//
// finalAssessment = moderate_concern
// validationRequired = true
// validationStatus = PENDING
//
// Decision:
//
// HUMAN
// ANIMAL
// BIOCOMPOST
//
// After validation:
// 1. Updates the donation.
// 2. Finds matching receivers.
// 3. Automatically allocates the donation.
// 4. Sends the normal donation offer notifications.
//
// For batch donations, the donation already contains sessionId,
// so the notification/allocation system can use that sessionId.
// ============================================================

async function validateDonation(req, res) {
    try {
        const { id } = req.params;
        const { validationDecision, selectedRoute } = req.body;

        const decision = validationDecision || selectedRoute;

        if (!decision) {
            return res.status(400).json({
                success: false,
                message: "Validation decision is required"
            });
        }

        const normalizedDecision =
            decision === "ANIMAL_FEED"
                ? "ANIMAL"
                : decision;

        const allowedDecisions = [
            "HUMAN",
            "ANIMAL",
            "BIOCOMPOST"
        ];

        if (!allowedDecisions.includes(normalizedDecision)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid validation decision. Allowed values: HUMAN, ANIMAL, BIOCOMPOST"
            });
        }

        const donation = await getDonationById(id);

        if (!donation) {
            return res.status(404).json({
                success: false,
                message: "Donation not found"
            });
        }

        if (donation.validationRequired !== true) {
            return res.status(400).json({
                success: false,
                message: "This donation does not require human validation"
            });
        }

        if (donation.validationStatus !== "PENDING") {
            return res.status(400).json({
                success: false,
                message:
                    `Validation cannot be completed because the current status is ${donation.validationStatus}`
            });
        }

        if (
            normalizedDecision === "ANIMAL" &&
            donation.animalFeedStatus !== "ALLOWED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "This food is not eligible for animal feed"
            });
        }

        const updatedDonation = await updateDonationValidation(
            id,
            normalizedDecision
        );

        let allocation = null;
        let matching = null;

        /*
         * --------------------------------------------------------
         * SESSION-BASED VALIDATION
         * --------------------------------------------------------
         *
         * If this donation belongs to a donation session, do not
         * allocate it immediately.
         *
         * Wait until every selected donation in the same session
         * that requires human validation has been validated.
         *
         * Once all required validations are completed, allocate
         * all eligible donations together using batch allocation.
         */
        if (donation.sessionId) {
            const session = await getDonationSession(
                donation.sessionId
            );

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Donation session not found"
                });
            }

            const sessionDonations = [];

            for (const item of session.items || []) {
                if (!item.donationId) {
                    continue;
                }

                const sessionDonation =
                    await getDonationById(item.donationId);

                if (sessionDonation) {
                    sessionDonations.push(
                        sessionDonation
                    );
                }
            }

            /*
             * Donations that were actually selected by the donor
             * and require human validation.
             */
            const validationRequiredDonations =
                sessionDonations.filter(
                    (sessionDonation) =>
                        sessionDonation.validationRequired === true
                );

            /*
             * Check whether every validation-required donation
             * has completed validation.
             */
            const allValidationsCompleted =
                validationRequiredDonations.every(
                    (sessionDonation) =>
                        sessionDonation.validationStatus ===
                        "COMPLETED"
                );

            if (!allValidationsCompleted) {
                /*
                 * At least one item in this session is still
                 * waiting for human validation.
                 *
                 * Do NOT allocate the current donation yet.
                 */
                return res.json({
                    success: true,
                    message:
                        `Human validation completed: ${normalizedDecision}. Waiting for validation of the remaining session items.`,
                    donation: updatedDonation,
                    allocation: null,
                    allocationResult: null,
                    matching: null,
                    waitingForSessionValidation: true,
                    sessionId: donation.sessionId
                });
            }

            /*
             * All validation-required donations are now complete.
             *
             * Only donations that are ready for allocation should
             * be passed to the batch allocator.
             */
            const donationsReadyForAllocation =
                sessionDonations.filter(
                    (sessionDonation) =>
                        sessionDonation.validationStatus ===
                        "COMPLETED" &&
                        sessionDonation.allocationStatus ===
                        "PENDING_ALLOCATION"
                );

            if (donationsReadyForAllocation.length > 0) {
                allocation =
                    await allocateDonationBatch(
                        donationsReadyForAllocation
                    );

                /*
                 * Find the allocation result corresponding to the
                 * donation that was just validated.
                 */
                const currentAllocation =
                    allocation?.allocations?.find(
                        (result) =>
                            result?.donation?.id === id
                    );

                if (currentAllocation) {
                    matching = {
                        targetReceiverType:
                            currentAllocation.receivers?.[0]
                                ?.receiverType ?? null,
                        matchCount:
                            currentAllocation.receivers?.length ?? 0,
                        matches:
                            currentAllocation.receivers ?? []
                    };
                }
            }
        } else {
            /*
             * ----------------------------------------------------
             * INDIVIDUAL DONATION
             * ----------------------------------------------------
             *
             * Donations that do not belong to a session keep the
             * existing individual allocation behavior.
             */
            allocation =
                await allocateDonation(id);

            if (allocation) {
                matching = {
                    targetReceiverType:
                        allocation.receivers?.[0]
                            ?.receiverType ?? null,
                    matchCount:
                        allocation.receivers?.length ?? 0,
                    matches:
                        allocation.receivers ?? []
                };
            }
        }

        return res.json({
            success: true,
            message:
                `Human validation completed: ${normalizedDecision}`,
            donation: allocation?.donation ?? updatedDonation,
            allocation,
            allocationResult: allocation,
            matching,
            waitingForSessionValidation: false,
            sessionId: donation.sessionId ?? null
        });

    } catch (error) {
        console.error(
            "Error validating donation:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to validate donation",
            error: error.message
        });
    }
}
// ============================================================
// GET ALL DONATIONS
// ============================================================

async function listDonations(req, res) {

    try {

        const donations =
            await getDonations();


        res.json({

            success: true,

            donations:
                donations

        });

    } catch (error) {

        console.error(
            "Get donations error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to get donations",

            error:
                error.message

        });

    }
}


// ============================================================
// EXPORT CONTROLLERS
// ============================================================

module.exports = {

    addDonation,

    analyzeAndCreateDonation,

    analyzeAndMatchDonation:
        analyzeAndCreateDonation,

    validateDonation,

    listDonations

};