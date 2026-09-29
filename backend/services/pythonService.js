const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const PYTHON_SERVICE_URL =
    process.env.PYTHON_SERVICE_URL ||
    process.env.PYTHON_API_URL ||
    "http://localhost:8000";


async function analyzeFood(foodData) {

    try {

        if (!foodData?.imagePath) {
            throw new Error("Image path is required");
        }

        if (!fs.existsSync(foodData.imagePath)) {
            throw new Error(
                `Image file not found: ${foodData.imagePath}`
            );
        }

        const form = new FormData();

        form.append(
            "image",
            fs.createReadStream(foodData.imagePath)
        );

        form.append(
            "preparationTime",
            String(foodData.preparationTime || "")
        );

        form.append(
            "temperature",
            String(foodData.temperature ?? "")
        );

        form.append(
            "storage",
            String(foodData.storage || "")
        );

        form.append(
            "smell",
            String(foodData.smell || "")
        );

        const response = await axios.post(
            `${PYTHON_SERVICE_URL}/analyze-food`,
            form,
            {
                headers: {
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );

        return response.data;

    } catch (error) {
        console.error(
            "Python service error:",
            error.response?.data || error.message
        );

        const detail = error.response?.data?.message || error.response?.data?.error;
        if (detail) {
            throw new Error(`Python model error: ${detail}`);
        }

        throw new Error(
            `Unable to communicate with Python model service at ${PYTHON_SERVICE_URL}. Please ensure the Python backend is running on port 8000.`
        );
    }
}


module.exports = {
    analyzeFood
};