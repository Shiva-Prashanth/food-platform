const axios = require("axios");

const PYTHON_SERVICE_URL = "http://localhost:8000";


async function analyzeFood(foodData) {

    try {

        const response = await axios.post(
            `${PYTHON_SERVICE_URL}/analyze-food`,
            foodData
        );

        return response.data;

    } catch (error) {

        console.error(
            "Python service error:",
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