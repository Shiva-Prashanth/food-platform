const path = require("path");

const {
    createDonationSession,
    getDonationSession,
    addSessionItem,
    updateSessionItem,
    deleteSessionItem,
    updateDonationSession,
    getSessionItem
} = require("../models/donationSessionModel");

const { analyzeFood } = require("../services/pythonService");
const { createDonation } = require("../models/donationModel");
const {
    allocateDonation,
    allocateDonationBatch
} = require("../services/allocationService");
function normalizeStorage(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeSmell(value) {
    return String(value || "").trim().toLowerCase();
}

function routeAllowedForItem(item, route) {
    const routes = Array.isArray(item.analysis?.recovery_routes)
        ? item.analysis.recovery_routes.map((r) => String(r).toUpperCase())
        : [];

    if (route === "HUMAN") return routes.includes("HUMAN");
    if (route === "ANIMAL_FEED") {
        return item.analysis?.animal_feed_status === "ALLOWED" && routes.includes("ANIMAL_FEED");
    }
    if (route === "BIOCOMPOST") return routes.includes("BIOCOMPOST") || routes.includes("BIOGAS");
    return false;
}

function needsHumanValidation(item, route) {
    if (route !== "HUMAN") return false;
    return item.analysis?.final_assessment === "moderate_concern" ||
        item.analysis?.final_assessment === "manual_verification";
}

async function createSession(req, res) {
    try {
        const session = await createDonationSession({
            donorType: "HOSTEL",
            location: req.body?.location || "HOSTEL"
        });
        res.status(201).json({ success: true, session });
    } catch (error) {
        console.error("Create donation session error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getSession(req, res) {
    try {
        const session = await getDonationSession(req.params.sessionId);
        if (!session) return res.status(404).json({ success: false, message: "Donation session not found" });
        res.json({ success: true, session });
    } catch (error) {
        console.error("Get donation session error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function addItem(req, res) {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Food image is required" });

        const { preparationTime, temperature, storage, smell, quantity } = req.body;
        if (!preparationTime || temperature === undefined || !storage || !smell || !quantity) {
            return res.status(400).json({ success: false, message: "preparationTime, temperature, storage, smell and quantity are required" });
        }

        const item = await addSessionItem(req.params.sessionId, {
            imagePath: path.resolve(req.file.path),
            preparationTime,
            temperature,
            storage: normalizeStorage(storage),
            smell: normalizeSmell(smell),
            quantity
        });

        res.status(201).json({ success: true, item });
    } catch (error) {
        console.error("Add donation session item error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function editItem(req, res) {
    try {
        const item = await getSessionItem(req.params.sessionId, req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: "Food item not found" });
        if (item.status !== "PENDING") return res.status(400).json({ success: false, message: "Only pending items can be edited" });

        const update = {};
        const allowed = ["preparationTime", "temperature", "storage", "smell", "quantity"];
        for (const field of allowed) {
            if (req.body[field] !== undefined) update[field] = field === "temperature" ? Number(req.body[field]) : req.body[field];
        }
        if (update.storage !== undefined) update.storage = normalizeStorage(update.storage);
        if (update.smell !== undefined) update.smell = normalizeSmell(update.smell);

        const updatedItem = await updateSessionItem(req.params.sessionId, req.params.itemId, update);
        res.json({ success: true, item: updatedItem });
    } catch (error) {
        console.error("Edit donation session item error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function removeItem(req, res) {
    try {
        const item = await getSessionItem(req.params.sessionId, req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: "Food item not found" });
        if (item.status !== "PENDING") return res.status(400).json({ success: false, message: "Only pending items can be removed" });

        await deleteSessionItem(req.params.sessionId, req.params.itemId);
        res.json({ success: true, message: "Food item removed" });
    } catch (error) {
        console.error("Remove donation session item error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function analyzeSession(req, res) {
    try {
        const session = await getDonationSession(req.params.sessionId);
        if (!session) return res.status(404).json({ success: false, message: "Donation session not found" });
        if (!session.items.length) return res.status(400).json({ success: false, message: "Add at least one food item before analysis" });
        if (session.status === "READY_FOR_ALLOCATION" || session.status === "COMPLETED") {
            return res.status(400).json({ success: false, message: "This donation session has already been confirmed" });
        }

        await updateDonationSession(req.params.sessionId, { status: "ASSESSING" });

        const analyzedItems = [];
        for (const item of session.items) {
            if (item.status !== "PENDING") {
                analyzedItems.push(item);
                continue;
            }

            const pythonResult = await analyzeFood({
                imagePath: item.imagePath,
                preparationTime: item.preparationTime,
                temperature: Number(item.temperature),
                storage: item.storage,
                smell: item.smell
            });

            if (!pythonResult?.success || !pythonResult.result) {
                throw new Error(`Python analysis failed for item ${item.id}`);
            }

            const analysis = pythonResult.result;
            const updatedItem = await updateSessionItem(req.params.sessionId, item.id, {
                status: "ASSESSED",
                food: analysis.food_name,
                analysis
            });
            analyzedItems.push(updatedItem);
        }

        const updatedSession = await updateDonationSession(req.params.sessionId, {
            status: "ASSESSMENT_COMPLETED"
        });

        res.json({ success: true, session: updatedSession });
    } catch (error) {
        console.error("Analyze donation session error:", error);
        await updateDonationSession(req.params.sessionId, { status: "DRAFT" }).catch(() => { });
        res.status(500).json({ success: false, message: error.message });
    }
}

async function confirmSession(req, res) {
    try {
        const session = await getDonationSession(req.params.sessionId);
        if (!session) return res.status(404).json({ success: false, message: "Donation session not found" });
        if (session.status !== "ASSESSMENT_COMPLETED" && session.status !== "WAITING_FOR_DONOR_SELECTION") {
            return res.status(400).json({ success: false, message: "Complete assessment before confirming donations" });
        }

        const selections = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!selections.length) return res.status(400).json({ success: false, message: "Select at least one food item for donation" });

        const selectedIds = new Set(selections.map((item) => item.itemId));
        const validatedSelections = [];

        // Validate the complete donor selection before creating any real donations.
        // This prevents a partially-created batch when one later selection is invalid.
        for (const selection of selections) {
            const item = session.items.find((entry) => entry.id === selection.itemId);
            if (!item) throw new Error(`Food item ${selection.itemId} not found in this session`);
            if (item.status !== "ASSESSED") throw new Error(`Food item ${item.id} is not available for selection`);

            const route = String(selection.route || "").trim().toUpperCase();
            if (!routeAllowedForItem(item, route)) throw new Error(`Selected destination ${route} is not available for ${item.food}`);

            validatedSelections.push({
                item,
                route,
                validationRequired: needsHumanValidation(item, route)
            });
        }

        const donations = [];
        const donationsReadyForAllocation = [];

        for (const selection of validatedSelections) {
            const { item, route, validationRequired } = selection;

            const donation = await createDonation({
                food: item.food,
                route: validationRequired
                    ? "PENDING_HUMAN_VALIDATION"
                    : route,
                quantity: item.quantity,
                location: session.location || "HOSTEL",
                sessionId: session.id,
                finalAssessment: item.analysis.final_assessment,
                animalFeedStatus: item.analysis.animal_feed_status,
                validationRequired,
                validationStatus: validationRequired
                    ? "PENDING"
                    : "NOT_REQUIRED",
                allocationStatus: validationRequired
                    ? "PENDING_VALIDATION"
                    : "PENDING_ALLOCATION",
                locked: false
            });

            if (!validationRequired) {
                donationsReadyForAllocation.push(donation);
            }

            await updateSessionItem(
                req.params.sessionId,
                item.id,
                {
                    status: "DONOR_SELECTED",
                    donorDecision: "DONATE",
                    selectedRoute: route,
                    donationId: donation.id
                }
            );

            donations.push({
                donation,
                allocation: null
            });
        }
        let batchAllocation = null;

        if (donationsReadyForAllocation.length > 0) {
            batchAllocation =
                await allocateDonationBatch(
                    donationsReadyForAllocation
                );

            if (
                batchAllocation &&
                Array.isArray(batchAllocation.allocations)
            ) {
                const allocationByDonationId =
                    new Map(
                        batchAllocation.allocations.map(
                            (allocation) => [
                                allocation?.donation?.id,
                                allocation
                            ]
                        )
                    );

                for (const entry of donations) {

                    if (!entry.donation?.id) {
                        continue;
                    }

                    entry.allocation =
                        allocationByDonationId.get(
                            entry.donation.id
                        ) || null;
                }
            }
        }

        for (const item of session.items) {
            if (!selectedIds.has(item.id) && item.status === "ASSESSED") {
                await updateSessionItem(req.params.sessionId, item.id, {
                    status: "DONOR_DECLINED",
                    donorDecision: "DO_NOT_DONATE"
                });
            }
        }

        const finalSession = await updateDonationSession(req.params.sessionId, {
            status: "READY_FOR_ALLOCATION",
            confirmedAt: new Date()
        });

        res.json({ success: true, session: finalSession, donations });
    } catch (error) {
        console.error("Confirm donation session error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    createSession,
    getSession,
    addItem,
    editItem,
    removeItem,
    analyzeSession,
    confirmSession
};
