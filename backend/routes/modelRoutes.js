const express = require("express");
const multer = require("multer");
const path = require("path");

const { analyzeFood } = require("../services/pythonService");

const router = express.Router();


// ============================================================
// MULTER CONFIGURATION
// ============================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        const uploadPath = path.join(__dirname, "..", "uploads");

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
// TEST PYTHON MODEL
// ============================================================

router.post("/test", async (req, res) => {

    try {

        const result = await analyzeFood(req.body);

        res.json({
            success: true,
            pythonResult: result
        });

    } catch (error) {

        console.error("Model test error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// ============================================================
// ANALYZE FOOD IMAGE
// ============================================================

router.post("/analyze", upload.single("image"), async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "Food image is required"
            });
        }


        const imagePath = path.resolve(req.file.path);


        const foodData = {

            imagePath: imagePath,

            preparationTime: req.body.preparationTime,

            temperature: Number(req.body.temperature),

            storage: req.body.storage,

            smell: req.body.smell

        };


        console.log("Sending food information to Python:");
        console.log(foodData);


        const pythonResult = await analyzeFood(foodData);


        res.json({

            success: true,

            image: {
                originalName: req.file.originalname,
                savedName: req.file.filename,
                path: imagePath
            },

            result: pythonResult

        });


    } catch (error) {

        console.error("Food analysis error:", error);


        res.status(500).json({

            success: false,
            message: "Failed to analyze food",
            error: error.message

        });

    }

});


module.exports = router;