const express = require("express");
const multer = require("multer");
const path = require("path");

const {
    createSession,
    getSession,
    addItem,
    editItem,
    removeItem,
    analyzeSession,
    confirmSession
} = require("../controllers/donationSessionController");

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "..", "uploads"));
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only image files are allowed"));
    }
});

router.post("/", createSession);
router.get("/:sessionId", getSession);
router.post("/:sessionId/items", upload.single("image"), addItem);
router.put("/:sessionId/items/:itemId", editItem);
router.delete("/:sessionId/items/:itemId", removeItem);
router.post("/:sessionId/analyze", analyzeSession);
router.post("/:sessionId/confirm", confirmSession);

module.exports = router;
