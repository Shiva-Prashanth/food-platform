import gc
import os
import sys
import threading
import time
import traceback
from datetime import datetime

# ============================================================
# CPU & MEMORY RUNTIME ENVIRONMENT CONFIGURATION
# ============================================================
# Keep the CPU-only ML service lightweight on cloud instances (e.g. Blitz.cloud).
# These must be set BEFORE importing PyTorch/TensorFlow.
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_TORCH", "1")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from rules.assessment_rules import (
    assess_time,
    assess_storage,
    assess_temperature,
    assess_smell,
    combine_visual_assessment
)

from src.model3_pipeline import assess_recovery

# ============================================================
# MODEL PATHS & CONSTANTS
# ============================================================

HUGGINGFACE_MODEL_ID = "Subhash5/indian-food-classifier"

FRESHNESS_TFLITE_PATH = os.path.join(
    PROJECT_ROOT,
    "models",
    "freshness_classifier.tflite"
)

FRESHNESS_KERAS_PATH = os.path.join(
    PROJECT_ROOT,
    "models",
    "freshness_classifier.keras"
)

IMAGE_SIZE = (224, 224)

# ============================================================
# SINGLETON MODEL STATE & LOCKS
# ============================================================

_food_model_lock = threading.Lock()
_freshness_model_lock = threading.Lock()

food_model = None
freshness_runner = None  # Holds either TFLiteInterpreterRunner or KerasModelRunner
freshness_model = None   # Compatibility alias for freshness_runner


def _get_memory_info_str():
    """Helper to return current process RSS memory string if psutil is available."""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        rss_mb = process.memory_info().rss / (1024 * 1024)
        return f"RSS={rss_mb:.1f}MB"
    except Exception:
        return "RSS=N/A"


# ============================================================
# FRESHNESS RUNNER WRAPPERS (LITERT / TFLITE vs KERAS FALLBACK)
# ============================================================

class TFLiteFreshnessRunner:
    """Lightweight runner using LiteRT / TFLite runtime (~10MB RAM vs ~500MB for TF)."""
    def __init__(self, model_path):
        self.model_path = model_path
        self.interpreter = self._create_interpreter(model_path)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        self.input_index = self.input_details[0]["index"]
        self.output_index = self.output_details[0]["index"]
        self.backend = "LiteRT/TFLite"

    @staticmethod
    def _create_interpreter(model_path):
        # 1. Try Google LiteRT
        try:
            from ai_edge_litert.interpreter import Interpreter
            return Interpreter(model_path=model_path)
        except ImportError:
            pass

        # 2. Try tflite_runtime
        try:
            from tflite_runtime.interpreter import Interpreter
            return Interpreter(model_path=model_path)
        except ImportError:
            pass

        # 3. Fallback to tensorflow.lite
        import tensorflow as tf
        return tf.lite.Interpreter(model_path=model_path)

    def predict(self, image_array):
        self.interpreter.set_tensor(self.input_index, image_array)
        self.interpreter.invoke()
        return float(self.interpreter.get_tensor(self.output_index)[0][0])


class KerasFreshnessRunner:
    """Fallback runner using standard Keras/TensorFlow model."""
    def __init__(self, model_path):
        self.model_path = model_path
        import tensorflow as tf
        try:
            tf.config.threading.set_inter_op_parallelism_threads(1)
            tf.config.threading.set_intra_op_parallelism_threads(1)
        except Exception:
            pass
        self.model = tf.keras.models.load_model(model_path, compile=False)
        self.backend = "Keras/TensorFlow"

    def predict(self, image_array):
        return float(self.model.predict(image_array, verbose=0)[0][0])


# ============================================================
# LOAD FOOD MODEL (MODEL 1: HUGGING FACE ViT)
# ============================================================

def get_food_model():
    """
    Thread-safe lazy initialization of the Hugging Face ViT food classifier.
    Reuses existing singleton instance across all subsequent requests in this worker.
    """
    global food_model

    if food_model is not None:
        return food_model

    with _food_model_lock:
        if food_model is not None:
            return food_model

        load_start = time.perf_counter()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n[{timestamp}] ======================================================", flush=True)
        print(f"[{timestamp}] [MODEL 1 - INIT] Loading Hugging Face Food Classifier ({_get_memory_info_str()})", flush=True)
        print(f"[{timestamp}] [MODEL 1 - INIT] Target Model: {HUGGINGFACE_MODEL_ID}", flush=True)
        print(f"[{timestamp}] [MODEL 1 - INIT] HF_HOME Cache: {os.environ.get('HF_HOME', 'default (~/.cache/huggingface)')}", flush=True)
        print(f"[{timestamp}] ======================================================", flush=True)

        try:
            # Step 1: Import PyTorch
            torch_start = time.perf_counter()
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - STEP 1/4] Importing torch...", flush=True)
            import torch
            try:
                torch.set_num_threads(1)
            except Exception:
                pass
            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - STEP 1/4] torch imported - "
                f"version={torch.__version__} - time={time.perf_counter() - torch_start:.2f}s - {_get_memory_info_str()}",
                flush=True
            )

            # Step 2: Import Transformers
            tf_start = time.perf_counter()
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - STEP 2/4] Importing transformers...", flush=True)
            import transformers
            from transformers import pipeline
            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - STEP 2/4] transformers imported - "
                f"version={transformers.__version__} - time={time.perf_counter() - tf_start:.2f}s - {_get_memory_info_str()}",
                flush=True
            )

            # Step 3: Instantiate pipeline
            pipe_start = time.perf_counter()
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - STEP 3/4] Creating image-classification pipeline...", flush=True)

            loaded_pipeline = pipeline(
                "image-classification",
                model=HUGGINGFACE_MODEL_ID,
                device=-1
            )

            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - STEP 3/4] pipeline instantiated - "
                f"time={time.perf_counter() - pipe_start:.2f}s - {_get_memory_info_str()}",
                flush=True
            )

            # Step 4: Finalize singleton and run garbage collection
            food_model = loaded_pipeline
            gc.collect()

            total_elapsed = time.perf_counter() - load_start
            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - SUCCESS] Food Classifier ready! "
                f"Total Load Time: {total_elapsed:.2f}s - Final {_get_memory_info_str()}",
                flush=True
            )
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ======================================================\n", flush=True)

        except Exception as error:
            food_model = None
            total_elapsed = time.perf_counter() - load_start
            err_msg = str(error)
            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - ERROR] Failed to load model '{HUGGINGFACE_MODEL_ID}' "
                f"after {total_elapsed:.2f}s: {err_msg}",
                flush=True
            )
            traceback.print_exc()
            raise RuntimeError(f"Hugging Face model initialization failed for '{HUGGINGFACE_MODEL_ID}': {err_msg}") from error

    return food_model


# ============================================================
# LOAD FRESHNESS MODEL (MODEL 2: LITERT / TFLITE / KERAS)
# ============================================================

def get_freshness_model():
    """
    Thread-safe lazy initialization of the Freshness classifier runner.
    Prioritizes lightweight LiteRT/TFLite model for low memory footprint (~10MB),
    falling back to Keras if TFLite is unavailable.
    """
    global freshness_runner, freshness_model

    if freshness_runner is not None:
        return freshness_runner

    with _freshness_model_lock:
        if freshness_runner is not None:
            return freshness_runner

        load_start = time.perf_counter()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n[{timestamp}] ======================================================", flush=True)
        print(f"[{timestamp}] [MODEL 2 - INIT] Loading Freshness Classifier ({_get_memory_info_str()})", flush=True)

        try:
            # 1. Primary: Use lightweight TFLite model
            if os.path.exists(FRESHNESS_TFLITE_PATH):
                print(f"[{timestamp}] [MODEL 2 - INIT] Found LiteRT/TFLite model: {FRESHNESS_TFLITE_PATH}", flush=True)
                runner = TFLiteFreshnessRunner(FRESHNESS_TFLITE_PATH)
                print(
                    f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 2 - SUCCESS] LiteRT Freshness Classifier ready! "
                    f"Load Time: {time.perf_counter() - load_start:.4f}s - Backend: {runner.backend} - Final {_get_memory_info_str()}",
                    flush=True
                )
                freshness_runner = runner
                freshness_model = runner
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ======================================================\n", flush=True)
                return freshness_runner

            # 2. Fallback: Use Keras model if TFLite model is not present
            if os.path.exists(FRESHNESS_KERAS_PATH):
                print(f"[{timestamp}] [MODEL 2 - INIT] LiteRT model not found, using Keras fallback: {FRESHNESS_KERAS_PATH}", flush=True)
                runner = KerasFreshnessRunner(FRESHNESS_KERAS_PATH)
                print(
                    f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 2 - SUCCESS] Keras Freshness Classifier ready! "
                    f"Load Time: {time.perf_counter() - load_start:.2f}s - Backend: {runner.backend} - Final {_get_memory_info_str()}",
                    flush=True
                )
                freshness_runner = runner
                freshness_model = runner
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ======================================================\n", flush=True)
                return freshness_runner

            err_msg = f"No freshness model file found at either {FRESHNESS_TFLITE_PATH} or {FRESHNESS_KERAS_PATH}"
            print(f"[MODEL 2 - ERROR] {err_msg}", flush=True)
            raise FileNotFoundError(err_msg)

        except Exception as error:
            freshness_runner = None
            freshness_model = None
            total_elapsed = time.perf_counter() - load_start
            err_msg = str(error)
            print(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 2 - ERROR] Failed to load freshness model "
                f"after {total_elapsed:.2f}s: {err_msg}",
                flush=True
            )
            traceback.print_exc()
            raise RuntimeError(f"Freshness model initialization failed: {err_msg}") from error

    return freshness_runner


# ============================================================
# MODEL 1 - FOOD PREDICTION
# ============================================================

def predict_food(image_path):
    """
    Run food identification inference using the Hugging Face ViT model.
    """
    start_time = time.perf_counter()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [MODEL 1 - INFERENCE] predict_food START for image='{image_path}' ({_get_memory_info_str()})", flush=True)

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image path does not exist for food classification: {image_path}")

    model = get_food_model()

    try:
        import torch
        with torch.inference_mode():
            predictions = model(
                image_path,
                top_k=1
            )
    except Exception as infer_err:
        print(f"[MODEL 1 - INFERENCE ERROR] Food classification failed: {infer_err}", flush=True)
        traceback.print_exc()
        raise

    if not predictions or not isinstance(predictions, list):
        raise ValueError(f"Unexpected empty or invalid predictions from food classifier: {predictions}")

    best_prediction = predictions[0]
    food_name = best_prediction["label"]
    confidence = float(best_prediction["score"] * 100)

    elapsed = time.perf_counter() - start_time
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 1 - INFERENCE] predict_food DONE in "
        f"{elapsed:.2f}s -> {food_name} ({confidence:.2f}%) ({_get_memory_info_str()})",
        flush=True
    )

    return food_name, confidence


# ============================================================
# MODEL 2 - FRESHNESS PREDICTION
# ============================================================

def predict_freshness(image_path):
    """
    Run visual freshness assessment using lightweight LiteRT (or Keras fallback).
    """
    start_time = time.perf_counter()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [MODEL 2 - INFERENCE] predict_freshness START for image='{image_path}' ({_get_memory_info_str()})", flush=True)

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image path does not exist for freshness prediction: {image_path}")

    runner = get_freshness_model()

    try:
        from PIL import Image
        import numpy as np

        # Lightweight Pillow image loading and resizing
        img = Image.open(image_path).convert("RGB").resize(IMAGE_SIZE)
        image_array = np.array(img, dtype=np.float32)
        image_array = np.expand_dims(image_array, axis=0)

        prediction = runner.predict(image_array)

    except Exception as infer_err:
        print(f"[MODEL 2 - INFERENCE ERROR] Freshness prediction failed: {infer_err}", flush=True)
        traceback.print_exc()
        raise

    good_percentage = float(prediction * 100.0)
    bad_percentage = float((1.0 - prediction) * 100.0)

    if good_percentage >= 70.0:
        visual_assessment = "GOOD"
    elif bad_percentage >= 70.0:
        visual_assessment = "BAD"
    else:
        visual_assessment = "UNCERTAIN"

    elapsed = time.perf_counter() - start_time
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [MODEL 2 - INFERENCE] predict_freshness DONE in "
        f"{elapsed:.4f}s -> {visual_assessment} (Good: {good_percentage:.2f}%, Bad: {bad_percentage:.2f}%) ({_get_memory_info_str()})",
        flush=True
    )

    return (
        good_percentage,
        bad_percentage,
        visual_assessment
    )


# ============================================================
# GET WARDEN INFORMATION (FOR CLI USAGE)
# ============================================================

def get_user_information():
    print("\n========== FOOD INFORMATION ==========")
    prepared_time_text = input("Enter preparation time (YYYY-MM-DD HH:MM): ").strip()
    temperature = float(input("Enter current food temperature (°C): "))
    storage = input("Enter storage condition (room/refrigerator): ").strip().lower()
    smell = input("Enter smell (normal/unusual/bad): ").strip().lower()

    prepared_time = datetime.strptime(
        prepared_time_text,
        "%Y-%m-%d %H:%M"
    )
    current_time = datetime.now()
    elapsed_hours = (current_time - prepared_time).total_seconds() / 3600

    return (
        prepared_time,
        elapsed_hours,
        temperature,
        storage,
        smell
    )


# ============================================================
# MODEL 2 - CONDITION ASSESSMENT
# ============================================================

def assess_food_condition(
    visual_assessment,
    elapsed_hours,
    temperature,
    storage,
    smell
):
    if storage == "room":
        storage_rule_value = "room_temperature"
    elif storage == "refrigerator":
        storage_rule_value = "refrigerated"
    else:
        storage_rule_value = storage

    time_result = assess_time(elapsed_hours)
    storage_result = assess_storage(storage_rule_value)
    temperature_result = assess_temperature(temperature)
    smell_result = assess_smell(smell)

    final_result = combine_visual_assessment(
        visual_assessment,
        time_result,
        storage_result,
        temperature_result,
        smell_result
    )

    return {
        "time_result": time_result,
        "storage_result": storage_result,
        "temperature_result": temperature_result,
        "smell_result": smell_result,
        "final_result": final_result
    }


# ============================================================
# MODEL 3 - RECOVERY ROUTE
# ============================================================

def assess_recovery_route(
    food_name,
    final_result
):
    return assess_recovery(
        food_name,
        final_result
    )


# ============================================================
# DISPLAY RESULT (CLI)
# ============================================================

def display_result(
    food_name,
    food_confidence,
    good_percentage,
    bad_percentage,
    visual_assessment,
    elapsed_hours,
    temperature,
    storage,
    smell,
    condition_result,
    recovery_result
):
    print("\n" + "=" * 60)
    print("                 FOOD RECOVERY RESULT")
    print("=" * 60)
    print("\nFood identification:")
    print(f"Food identified       : {food_name}")
    print(f"Food confidence       : {food_confidence:.2f}%")
    print("\nVisual freshness:")
    print(f"Good                  : {good_percentage:.2f}%")
    print(f"Bad                   : {bad_percentage:.2f}%")
    print(f"Visual assessment     : {visual_assessment}")
    print("\nFood conditions:")
    print(f"Elapsed time          : {elapsed_hours:.2f} hours")
    print(f"Temperature           : {temperature:.1f} °C")
    print(f"Storage               : {storage}")
    print(f"Smell                 : {smell}")
    print("\nModel 2 rule assessment:")
    print(f"Time                  : {condition_result['time_result']}")
    print(f"Storage               : {condition_result['storage_result']}")
    print(f"Temperature           : {condition_result['temperature_result']}")
    print(f"Smell                 : {condition_result['smell_result']}")
    print(f"Final assessment      : {condition_result['final_result']}")
    print("\nModel 3 recovery recommendation:")
    print(f"Animal feed eligibility: {recovery_result['animal_feed_status']}")
    print(f"Primary route          : {recovery_result['primary_route']}")
    print(f"Recovery routes        : {recovery_result['recovery_routes']}")
    print(f"Human verification     : {recovery_result['verification_required']}")
    print("\nSafety message:")
    print("AI provides a recovery recommendation. Human verification is required before final recovery.")
    print("\n" + "=" * 60)


# ============================================================
# MAIN (CLI)
# ============================================================

def main():
    print("\n==========================================")
    print("     SMART SURPLUS FOOD RECOVERY")
    print("==========================================")

    image_path = input("\nEnter food image path: ").strip()
    if not os.path.exists(image_path):
        print("\nImage not found.")
        return

    food_name, food_confidence = predict_food(image_path)
    (
        good_percentage,
        bad_percentage,
        visual_assessment
    ) = predict_freshness(image_path)

    (
        prepared_time,
        elapsed_hours,
        temperature,
        storage,
        smell
    ) = get_user_information()

    condition_result = assess_food_condition(
        visual_assessment,
        elapsed_hours,
        temperature,
        storage,
        smell
    )

    recovery_result = assess_recovery_route(
        food_name,
        condition_result["final_result"]
    )

    display_result(
        food_name,
        food_confidence,
        good_percentage,
        bad_percentage,
        visual_assessment,
        elapsed_hours,
        temperature,
        storage,
        smell,
        condition_result,
        recovery_result
    )


if __name__ == "__main__":
    main()
