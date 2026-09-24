const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const PYTHON_SERVICE_URL =
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
            error.response?.data ||
            error.message
        );

        throw new Error(
            "Unable to communicate with Python model service"
        );
    }
}


module.exports = {
    analyzeFood
};