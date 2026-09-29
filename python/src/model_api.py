import os
import sys
import tempfile
import time
import traceback
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.session_store import (
    UPLOADS_DIR,
    create_session,
    get_session,
    add_session_item,
    update_session_item,
    delete_session_item,
    update_session,
    get_session_item,
    create_donation,
    update_donation_validation,
    get_receivers,
    add_receiver,
    get_notifications
)

# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


# ============================================================
# JSON SERIALIZATION HELPER
# ============================================================

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
# HEALTH CHECK & DIAGNOSTICS
# ============================================================

@app.route("/health", methods=["GET"])
def health():
    from src.model2_pipeline import food_model, freshness_model, _get_memory_info_str
    return jsonify({
        "success": True,
        "message": "Python model service is running",
        "timestamp": datetime.now().isoformat(),
        "memory": _get_memory_info_str(),
        "models_status": {
            "food_model_loaded": food_model is not None,
            "freshness_model_loaded": freshness_model is not None
        }
    }), 200


@app.route("/api/models/status", methods=["GET"])
def models_status():
    from src.model2_pipeline import food_model, freshness_model, _get_memory_info_str, HUGGINGFACE_MODEL_ID, FRESHNESS_MODEL_PATH
    return jsonify({
        "success": True,
        "food_model": {
            "model_id": HUGGINGFACE_MODEL_ID,
            "loaded": food_model is not None
        },
        "freshness_model": {
            "path": FRESHNESS_MODEL_PATH,
            "loaded": freshness_model is not None
        },
        "memory": _get_memory_info_str()
    }), 200


# ============================================================
# DONATION SESSIONS API
# ============================================================

@app.route("/api/donation-sessions", methods=["POST"])
def api_create_session():
    try:
        data = request.get_json(silent=True) or {}
        donor_type = data.get("donorType", "HOSTEL")
        location = data.get("location", "HOSTEL")
        session = create_session(donor_type=donor_type, location=location)
        return jsonify({
            "success": True,
            "session": session
        }), 201
    except Exception as error:
        print("[API] Create session error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/donation-sessions/<session_id>", methods=["GET"])
def api_get_session(session_id):
    try:
        session = get_session(session_id)
        if not session:
            return jsonify({
                "success": False,
                "message": "Donation session not found"
            }), 404
        return jsonify({
            "success": True,
            "session": session
        }), 200
    except Exception as error:
        print("[API] Get session error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/donation-sessions/<session_id>/items", methods=["POST"])
def api_add_session_item(session_id):
    try:
        session = get_session(session_id)
        if not session:
            return jsonify({
                "success": False,
                "message": "Donation session not found"
            }), 404

        if "image" not in request.files:
            return jsonify({
                "success": False,
                "message": "Food image is required"
            }), 400

        image_file = request.files["image"]
        if image_file.filename == "":
            return jsonify({
                "success": False,
                "message": "No image selected"
            }), 400

        # Save uploaded image in uploads directory
        ext = os.path.splitext(image_file.filename)[1].lower() or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        image_path = os.path.join(UPLOADS_DIR, unique_name)
        image_file.save(image_path)

        preparation_time = request.form.get("preparationTime", "")
        temperature = request.form.get("temperature", "28")
        storage = request.form.get("storage", "room")
        smell = request.form.get("smell", "normal")
        quantity = request.form.get("quantity", "MEDIUM")

        item = add_session_item(session_id, {
            "imagePath": image_path,
            "preparationTime": preparation_time,
            "temperature": temperature,
            "storage": storage,
            "smell": smell,
            "quantity": quantity
        })

        return jsonify({
            "success": True,
            "item": item
        }), 201
    except Exception as error:
        print("[API] Add session item error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/donation-sessions/<session_id>/items/<item_id>", methods=["PUT"])
def api_update_session_item(session_id, item_id):
    try:
        item = get_session_item(session_id, item_id)
        if not item:
            return jsonify({
                "success": False,
                "message": "Food item not found"
            }), 404

        data = request.get_json(silent=True) or {}
        updated_item = update_session_item(session_id, item_id, data)
        return jsonify({
            "success": True,
            "item": updated_item
        }), 200
    except Exception as error:
        print("[API] Update session item error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/donation-sessions/<session_id>/items/<item_id>", methods=["DELETE"])
def api_delete_session_item(session_id, item_id):
    try:
        item = get_session_item(session_id, item_id)
        if not item:
            return jsonify({
                "success": False,
                "message": "Food item not found"
            }), 404

        delete_session_item(session_id, item_id)
        return jsonify({
            "success": True,
            "message": "Food item removed"
        }), 200
    except Exception as error:
        print("[API] Delete session item error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/donation-sessions/<session_id>/analyze", methods=["POST"])
def api_analyze_session(session_id):
    try:
        session = get_session(session_id)
        if not session:
            return jsonify({
                "success": False,
                "message": "Donation session not found"
            }), 404

        if not session.get("items"):
            return jsonify({
                "success": False,
                "message": "Add at least one food item before analysis"
            }), 400

        update_session(session_id, {"status": "ASSESSING"})

        from src.batch_pipeline import process_food_item

        for item in session["items"]:
            if item.get("status") == "ASSESSED" and item.get("analysis"):
                continue

            item_info = {
                "prepared_time_text": item.get("preparationTime", ""),
                "temperature": float(item.get("temperature", 28.0)),
                "storage": str(item.get("storage", "room")).lower(),
                "smell": str(item.get("smell", "normal")).lower()
            }

            image_path = item.get("imagePath")
            if not image_path or not os.path.exists(image_path):
                raise ValueError(f"Image not found on disk for item {item.get('id')}: {image_path}")

            print(f"[API] ANALYZE: processing session item {item.get('id')} image={image_path}", flush=True)
            result = process_food_item(image_path, item_info)
            analysis = make_json_serializable(result)

            update_session_item(session_id, item["id"], {
                "status": "ASSESSED",
                "food": analysis.get("food_name"),
                "analysis": analysis
            })

        updated_session = update_session(session_id, {"status": "ASSESSMENT_COMPLETED"})
        return jsonify({
            "success": True,
            "session": updated_session
        }), 200
    except Exception as error:
        print("[API] Analyze session error:", str(error), flush=True)
        traceback.print_exc()
        update_session(session_id, {"status": "DRAFT"})
        return jsonify({
            "success": False,
            "message": "Failed to analyze donation session",
            "error": str(error)
        }), 500


@app.route("/api/donation-sessions/<session_id>/confirm", methods=["POST"])
def api_confirm_session(session_id):
    try:
        session = get_session(session_id)
        if not session:
            return jsonify({
                "success": False,
                "message": "Donation session not found"
            }), 404

        data = request.get_json(silent=True) or {}
        selections = data.get("items", [])
        if not selections:
            return jsonify({
                "success": False,
                "message": "Select at least one food item for donation"
            }), 400

        donations = []
        selected_ids = set()

        for sel in selections:
            item_id = sel.get("itemId")
            route = str(sel.get("route", "")).upper()
            selected_ids.add(item_id)

            item = get_session_item(session_id, item_id)
            if not item:
                continue

            analysis = item.get("analysis") or {}
            final_assessment = analysis.get("final_assessment", "low_concern")
            val_req = (route == "HUMAN" and final_assessment in ["moderate_concern", "manual_verification"])

            donation = create_donation({
                "sessionId": session_id,
                "food": item.get("food") or "Surplus Food",
                "route": "PENDING_HUMAN_VALIDATION" if val_req else route,
                "quantity": item.get("quantity", "MEDIUM"),
                "location": session.get("location", "HOSTEL"),
                "finalAssessment": final_assessment,
                "animalFeedStatus": analysis.get("animal_feed_status"),
                "validationRequired": val_req,
                "validationStatus": "PENDING" if val_req else "NOT_REQUIRED",
                "allocationStatus": "PENDING_VALIDATION" if val_req else "PENDING_ALLOCATION"
            })

            update_session_item(session_id, item_id, {
                "status": "DONOR_SELECTED",
                "donorDecision": "DONATE",
                "selectedRoute": route,
                "donationId": donation["id"]
            })

            donations.append({"donation": donation, "allocation": None})

        # Mark non-selected items as declined
        for item in session.get("items", []):
            if item["id"] not in selected_ids and item.get("status") == "ASSESSED":
                update_session_item(session_id, item["id"], {
                    "status": "DONOR_DECLINED",
                    "donorDecision": "DO_NOT_DONATE"
                })

        final_session = update_session(session_id, {
            "status": "READY_FOR_ALLOCATION",
            "confirmedAt": datetime.utcnow().isoformat()
        })

        return jsonify({
            "success": True,
            "session": final_session,
            "donations": donations
        }), 200
    except Exception as error:
        print("[API] Confirm session error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/donations/<donation_id>/validate", methods=["POST"])
def api_validate_donation(donation_id):
    try:
        data = request.get_json(silent=True) or {}
        decision = data.get("validationDecision", "HUMAN")
        updated_donation = update_donation_validation(donation_id, decision)
        if not updated_donation:
            return jsonify({
                "success": False,
                "message": "Donation not found"
            }), 404

        return jsonify({
            "success": True,
            "donation": updated_donation,
            "waitingForSessionValidation": False
        }), 200
    except Exception as error:
        print("[API] Validate donation error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/receivers", methods=["GET", "POST"])
def api_receivers():
    try:
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            receiver = add_receiver(data)
            return jsonify({
                "success": True,
                "receiver": receiver
            }), 201
        return jsonify({
            "success": True,
            "receivers": get_receivers()
        }), 200
    except Exception as error:
        print("[API] Receivers error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/notifications", methods=["GET"])
def api_notifications():
    try:
        recipient_id = request.args.get("recipientId")
        return jsonify({
            "success": True,
            "notifications": get_notifications(recipient_id)
        }), 200
    except Exception as error:
        print("[API] Notifications error:", str(error), flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


@app.route("/api/allocations/accept", methods=["POST"])
@app.route("/api/allocations/decline", methods=["POST"])
def api_allocations():
    return jsonify({
        "success": True,
        "message": "Allocation status updated"
    }), 200


# ============================================================
# DIRECT FOOD ANALYSIS (FOR TESTING / NODE INTEGRATION)
# ============================================================

@app.route("/analyze-food", methods=["POST"])
def analyze_food():
    from src.batch_pipeline import process_food_item
    temporary_image_path = None
    req_start = time.perf_counter()

    try:
        if "image" in request.files:
            image_file = request.files["image"]
            if image_file.filename == "":
                return jsonify({
                    "success": False,
                    "message": "No image selected",
                    "error_type": "VALIDATION_ERROR"
                }), 400

            suffix = os.path.splitext(image_file.filename)[1].lower() or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                image_file.save(temp_file.name)
                temporary_image_path = temp_file.name

            image_path = temporary_image_path
            prepared_time_text = request.form.get("preparationTime", "")
            temperature_val = request.form.get("temperature", "28.0")
            storage = request.form.get("storage", "").lower()
            smell = request.form.get("smell", "").lower()
        else:
            data = request.get_json(silent=True)
            if data is None:
                return jsonify({
                    "success": False,
                    "message": "Invalid request or missing JSON body / multipart form",
                    "error_type": "VALIDATION_ERROR"
                }), 400

            required_fields = ["imagePath", "preparationTime", "temperature", "storage", "smell"]
            for field in required_fields:
                if field not in data:
                    return jsonify({
                        "success": False,
                        "message": f"Missing field: {field}",
                        "error_type": "VALIDATION_ERROR"
                    }), 400

            image_path = data["imagePath"]
            prepared_time_text = data["preparationTime"]
            temperature_val = data["temperature"]
            storage = data["storage"].lower()
            smell = data["smell"].lower()

        # Validate inputs
        if not prepared_time_text:
            return jsonify({
                "success": False,
                "message": "Missing field: preparationTime",
                "error_type": "VALIDATION_ERROR"
            }), 400
        if not storage:
            return jsonify({
                "success": False,
                "message": "Missing field: storage",
                "error_type": "VALIDATION_ERROR"
            }), 400
        if not smell:
            return jsonify({
                "success": False,
                "message": "Missing field: smell",
                "error_type": "VALIDATION_ERROR"
            }), 400

        try:
            temperature = float(temperature_val)
        except (ValueError, TypeError):
            temperature = 28.0

        if not os.path.exists(image_path):
            return jsonify({
                "success": False,
                "message": "Image not found on disk",
                "imagePath": image_path,
                "error_type": "VALIDATION_ERROR"
            }), 400

        item_information = {
            "prepared_time_text": prepared_time_text,
            "temperature": temperature,
            "storage": storage,
            "smell": smell
        }

        print(f"\n[API] ========== /analyze-food REQUEST START ==========", flush=True)
        result = process_food_item(image_path, item_information)
        print(f"[API] ========== /analyze-food REQUEST COMPLETED in {time.perf_counter() - req_start:.2f}s ==========\n", flush=True)

        json_result = make_json_serializable(result)
        return jsonify({
            "success": True,
            "result": json_result
        }), 200

    except (RuntimeError, FileNotFoundError, ValueError) as error:
        print(f"[API] /analyze-food handled error: {error}", flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(error),
            "error": str(error),
            "error_type": "MODEL_INITIALIZATION_ERROR" if "initialization failed" in str(error).lower() else "PROCESSING_ERROR"
        }), 503 if "initialization failed" in str(error).lower() else 500

    except Exception as error:
        print(f"[API] /analyze-food unexpected error: {error}", flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": "Failed to process food image",
            "error": str(error),
            "error_type": "INTERNAL_SERVER_ERROR"
        }), 500

    finally:
        if temporary_image_path and os.path.exists(temporary_image_path):
            try:
                os.remove(temporary_image_path)
            except Exception as cleanup_error:
                print("[API] Temporary image cleanup warning:", str(cleanup_error), flush=True)


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Python model and platform API service running on http://127.0.0.1:{port}", flush=True)
    app.run(host="0.0.0.0", port=port, debug=False)
