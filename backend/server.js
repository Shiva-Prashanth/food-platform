const express = require("express");
const cors = require("cors");
const {
    startAllocationMonitor
} = require("./services/allocationService");
const receiverRoutes = require("./routes/receiverRoutes");
const donationRoutes = require("./routes/donationRoutes");
const matchingRoutes = require("./routes/matchingRoutes");
const modelRoutes = require("./routes/modelRoutes");
const allocationRoutes = require("./routes/allocationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const donationSessionRoutes = require("./routes/donationSessionRoutes");

const db = require("./services/firebase");

const app = express();

const PORT = 5000;

// ===============================
// Middleware
// ===============================

app.use(cors());
app.use(express.json());


// ===============================
// Routes
// ===============================

app.use("/api/receivers", receiverRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/donation-sessions", donationSessionRoutes);
startAllocationMonitor();

// ===============================
// Root route
// ===============================

app.get("/", (req, res) => {
    res.send("Smart Surplus Food Recovery Backend is running");
});


// ===============================
// Firebase test
// ===============================

app.get("/test-firebase", async (req, res) => {

    try {

        await db.collection("test").doc("connection").set({
            message: "Firebase connection successful",
            createdAt: new Date()
        });

        res.json({
            success: true,
            message: "Firebase Firestore connection successful"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Firebase connection failed"
        });
    }
});


// ===============================
// Start server
// ===============================

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});