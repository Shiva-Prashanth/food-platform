from flask import Flask, request, jsonify
import os
import sys

def make_json_serializable(value):
    """
    Convert NumPy / TensorFlow values into
    normal Python JSON-compatible values.
    """

    if hasattr(value, "item"):
        return value.item()

    if isinstance(value, dict):
        return {
            key: make_json_serializable(val)
            for key, val in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            make_json_serializable(item)
            for item in value
        ]

    return value


# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ============================================================
# IMPORT BATCH PIPELINE
# ============================================================

from src.batch_pipeline import process_food_item


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "success": True,
        "message": "Python model service is running"
    })


# ============================================================
# ANALYZE FOOD
# ============================================================

@app.route("/analyze-food", methods=["POST"])
def analyze_food():

    try:

        data = request.get_json(silent=True)

        if data is None:
            return jsonify({
                "success": False,
                "message": "Invalid JSON request"
            }), 400

        # ----------------------------------------------------
        # CHECK REQUIRED DATA
        # ----------------------------------------------------

        required_fields = [
            "imagePath",
            "preparationTime",
            "temperature",
            "storage",
            "smell"
        ]

        for field in required_fields:

            if field not in data:

                return jsonify({
                    "success": False,
                    "message": f"Missing field: {field}"
                }), 400

        # ----------------------------------------------------
        # GET INPUTS
        # ----------------------------------------------------

        image_path = data["imagePath"]

        prepared_time_text = data["preparationTime"]

        temperature = float(
            data["temperature"]
        )

        storage = data["storage"].lower()

        smell = data["smell"].lower()

        # ----------------------------------------------------
        # CHECK IMAGE
        # ----------------------------------------------------

        if not os.path.exists(image_path):

            return jsonify({
                "success": False,
                "message": "Image not found",
                "imagePath": image_path
            }), 400

        # ----------------------------------------------------
        # PREPARE FOOD INFORMATION
        # ----------------------------------------------------

        item_information = {

            "prepared_time_text":
                prepared_time_text,

            "temperature":
                temperature,

            "storage":
                storage,

            "smell":
                smell
        }

        # ----------------------------------------------------
        # RUN MODEL 1 + MODEL 2 + MODEL 3
        # ----------------------------------------------------

        result = process_food_item(
            image_path,
            item_information
        )

        # ----------------------------------------------------
        # RETURN RESULT
        # ----------------------------------------------------

        json_result = make_json_serializable(result)

        return jsonify({
            "success": True,
            "result": json_result
        })

    except Exception as error:

        print(
            "Python model error:",
            str(error)
        )

        return jsonify({
            "success": False,
            "message": "Failed to process food",
            "error": str(error)
        }), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print(
        "Python model service running "
        "on http://localhost:8000"
    )

    app.run(
        host="127.0.0.1",
        port=8000,
        debug=False
    )