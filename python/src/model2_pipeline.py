import os
import sys
import time
from datetime import datetime

# Keep the CPU-only ML service lightweight on small Render instances.
# These must be set BEFORE importing TensorFlow/PyTorch.
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# TensorFlow/NumPy are imported lazily below so the API can boot without
# initializing the TensorFlow runtime before an analysis request.


from rules.assessment_rules import (
    assess_time,
    assess_storage,
    assess_temperature,
    assess_smell,
    combine_visual_assessment
)

from src.model3_pipeline import assess_recovery


# ============================================================
# MODEL PATHS
# ============================================================

FRESHNESS_MODEL_PATH = os.path.join(
    PROJECT_ROOT,
    "models",
    "freshness_classifier.keras"
)

IMAGE_SIZE = (224, 224)


# ============================================================
# MODEL VARIABLES
# ============================================================

food_model = None
freshness_model = None


def _load_tensorflow():
    """Import TensorFlow only when the freshness model is actually needed."""
    import tensorflow as tf
    return tf


def _load_numpy():
    """Import NumPy only when the freshness model is actually needed."""
    import numpy as np
    return np


# ============================================================
# LOAD FOOD MODEL WHEN NEEDED
# ============================================================

def get_food_model():
    global food_model

    if food_model is None:

        print(
            "MODEL 1: Hugging Face model LOAD START",
            flush=True
        )

        load_start = time.perf_counter()

        # --------------------------------------------------------
        # TEST 1: PyTorch import
        # --------------------------------------------------------

        print(
            "MODEL 1: importing torch START",
            flush=True
        )

        import torch

        print(
            "MODEL 1: importing torch DONE - "
            f"version={torch.__version__} - "
            f"time={time.perf_counter() - load_start:.2f}s",
            flush=True
        )

        # --------------------------------------------------------
        # TEST 2: Transformers import
        # --------------------------------------------------------

        transformers_start = time.perf_counter()

        print(
            "MODEL 1: importing transformers START",
            flush=True
        )

        import transformers

        print(
            "MODEL 1: importing transformers DONE - "
            f"version={transformers.__version__} - "
            f"time={time.perf_counter() - transformers_start:.2f}s",
            flush=True
        )

        # --------------------------------------------------------
        # TEST 3: Pipeline import
        # --------------------------------------------------------

        pipeline_start = time.perf_counter()

        print(
            "MODEL 1: importing pipeline START",
            flush=True
        )

        from transformers import pipeline

        print(
            "MODEL 1: importing pipeline DONE - "
            f"time={time.perf_counter() - pipeline_start:.2f}s",
            flush=True
        )

        # --------------------------------------------------------
        # TEST 4: Actual model loading
        # --------------------------------------------------------

        model_start = time.perf_counter()

        print(
            "MODEL 1: pipeline/model creation START",
            flush=True
        )

        food_model = pipeline(
            "image-classification",
            model="Subhash5/indian-food-classifier",
            device=-1
        )

        print(
            "MODEL 1: pipeline/model creation DONE - "
            f"time={time.perf_counter() - model_start:.2f}s",
            flush=True
        )

        print(
            "MODEL 1: Hugging Face model LOAD DONE - "
            f"total={time.perf_counter() - load_start:.2f}s",
            flush=True
        )

    return food_model


# ============================================================
# LOAD FRESHNESS MODEL WHEN NEEDED
# ============================================================

def get_freshness_model():

    global freshness_model

    if freshness_model is None:

        print(
            "MODEL 2: TensorFlow model LOAD START",
            flush=True
        )

        load_start = time.perf_counter()

        tf = _load_tensorflow()

        freshness_model = tf.keras.models.load_model(
            FRESHNESS_MODEL_PATH,
            compile=False
        )

        print(
            f"MODEL 2: TensorFlow model LOAD DONE in "
            f"{time.perf_counter() - load_start:.2f}s",
            flush=True
        )

    return freshness_model



# ============================================================
# MODEL 1 - FOOD PREDICTION
# ============================================================

def predict_food(image_path):

    print("MODEL 1: predict_food START", flush=True)
    start_time = time.perf_counter()

    model = get_food_model()

    print(
        "MODEL 1: running image classification",
        flush=True
    )

    predictions = model(
        image_path,
        top_k=1
    )

    best_prediction = predictions[0]

    food_name = best_prediction["label"]

    confidence = (
        best_prediction["score"] * 100
    )

    print(
        f"MODEL 1: predict_food DONE in "
        f"{time.perf_counter() - start_time:.2f}s -> "
        f"{food_name} ({confidence:.2f}%)",
        flush=True
    )

    return food_name, confidence



# ============================================================
# MODEL 2 - FRESHNESS PREDICTION
# ============================================================

def predict_freshness(image_path):

    print("MODEL 2: predict_freshness START", flush=True)
    start_time = time.perf_counter()

    model = get_freshness_model()

    tf = _load_tensorflow()
    np = _load_numpy()

    print(
        "MODEL 2: preparing image",
        flush=True
    )

    image = tf.keras.utils.load_img(
        image_path,
        target_size=IMAGE_SIZE
    )

    image_array = tf.keras.utils.img_to_array(
        image
    )

    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    print(
        "MODEL 2: running TensorFlow prediction",
        flush=True
    )

    prediction = model.predict(
        image_array,
        verbose=0
    )[0][0]

    good_percentage = float(prediction * 100)

    bad_percentage = float(
        (1 - prediction) * 100
    )

    if good_percentage >= 70:
        visual_assessment = "GOOD"

    elif bad_percentage >= 70:
        visual_assessment = "BAD"

    else:
        visual_assessment = "UNCERTAIN"

    print(
        f"MODEL 2: predict_freshness DONE in "
        f"{time.perf_counter() - start_time:.2f}s -> "
        f"{visual_assessment}",
        flush=True
    )

    return (
        good_percentage,
        bad_percentage,
        visual_assessment
    )



# ============================================================
# GET WARDEN INFORMATION
# ============================================================

def get_user_information():

    print("\n========== FOOD INFORMATION ==========")

    prepared_time_text = input(
        "Enter preparation time (YYYY-MM-DD HH:MM): "
    ).strip()

    temperature = float(
        input(
            "Enter current food temperature (°C): "
        )
    )

    storage = input(
        "Enter storage condition "
        "(room/refrigerator): "
    ).strip().lower()

    smell = input(
        "Enter smell "
        "(normal/unusual/bad): "
    ).strip().lower()

    prepared_time = datetime.strptime(
        prepared_time_text,
        "%Y-%m-%d %H:%M"
    )

    current_time = datetime.now()

    elapsed_hours = (
        current_time - prepared_time
    ).total_seconds() / 3600

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

    # Convert storage input into the
    # values expected by assessment_rules.py

    if storage == "room":

        storage_rule_value = (
            "room_temperature"
        )

    elif storage == "refrigerator":

        storage_rule_value = (
            "refrigerated"
        )

    else:

        storage_rule_value = storage

    # -----------------------------
    # MODEL 2 RULES
    # -----------------------------

    time_result = assess_time(
        elapsed_hours
    )

    storage_result = assess_storage(
        storage_rule_value
    )

    temperature_result = assess_temperature(
        temperature
    )

    smell_result = assess_smell(
        smell
    )

    # -----------------------------
    # COMBINE VISUAL + RULE RESULTS
    # -----------------------------

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
# DISPLAY RESULT
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

    print(
        "                 FOOD RECOVERY RESULT"
    )

    print("=" * 60)

    # ========================================================
    # FOOD IDENTIFICATION
    # ========================================================

    print("\nFood identification:")

    print(
        f"Food identified       : "
        f"{food_name}"
    )

    print(
        f"Food confidence       : "
        f"{food_confidence:.2f}%"
    )

    # ========================================================
    # VISUAL FRESHNESS
    # ========================================================

    print("\nVisual freshness:")

    print(
        f"Good                  : "
        f"{good_percentage:.2f}%"
    )

    print(
        f"Bad                   : "
        f"{bad_percentage:.2f}%"
    )

    print(
        f"Visual assessment     : "
        f"{visual_assessment}"
    )

    # ========================================================
    # FOOD CONDITIONS
    # ========================================================

    print("\nFood conditions:")

    print(
        f"Elapsed time          : "
        f"{elapsed_hours:.2f} hours"
    )

    print(
        f"Temperature           : "
        f"{temperature:.1f} °C"
    )

    print(
        f"Storage               : "
        f"{storage}"
    )

    print(
        f"Smell                 : "
        f"{smell}"
    )

    # ========================================================
    # MODEL 2
    # ========================================================

    print("\nModel 2 rule assessment:")

    print(
        f"Time                  : "
        f"{condition_result['time_result']}"
    )

    print(
        f"Storage               : "
        f"{condition_result['storage_result']}"
    )

    print(
        f"Temperature           : "
        f"{condition_result['temperature_result']}"
    )

    print(
        f"Smell                 : "
        f"{condition_result['smell_result']}"
    )

    print(
        f"Final assessment      : "
        f"{condition_result['final_result']}"
    )

    # ========================================================
    # MODEL 3
    # ========================================================

    print("\nModel 3 recovery recommendation:")

    print(
        f"Animal feed eligibility: "
        f"{recovery_result['animal_feed_status']}"
    )

    print(
        f"Primary route          : "
        f"{recovery_result['primary_route']}"
    )

    print(
        f"Recovery routes        : "
        f"{recovery_result['recovery_routes']}"
    )

    print(
        f"Human verification     : "
        f"{recovery_result['verification_required']}"
    )

    # ========================================================
    # SAFETY MESSAGE
    # ========================================================

    print("\nSafety message:")

    print(
        "AI provides a recovery recommendation."
    )

    print(
        "Human verification is required "
        "before final recovery."
    )

    print("\n" + "=" * 60)


# ============================================================
# MAIN
# ============================================================

def main():

    print("\n==========================================")

    print(
        "     SMART SURPLUS FOOD RECOVERY"
    )

    print("==========================================")

    # ========================================================
    # IMAGE INPUT
    # ========================================================

    image_path = input(
        "\nEnter food image path: "
    ).strip()

    if not os.path.exists(image_path):

        print("\nImage not found.")

        return

    # ========================================================
    # MODEL 1
    # ========================================================

    food_name, food_confidence = (
        predict_food(image_path)
    )

    # ========================================================
    # MODEL 2 VISUAL MODEL
    # ========================================================

    (
        good_percentage,
        bad_percentage,
        visual_assessment
    ) = predict_freshness(
        image_path
    )

    # ========================================================
    # WARDEN INFORMATION
    # ========================================================

    (
        prepared_time,
        elapsed_hours,
        temperature,
        storage,
        smell
    ) = get_user_information()

    # ========================================================
    # MODEL 2 RULES
    # ========================================================

    condition_result = (
        assess_food_condition(
            visual_assessment,
            elapsed_hours,
            temperature,
            storage,
            smell
        )
    )

    # ========================================================
    # MODEL 3
    # ========================================================

    recovery_result = (
        assess_recovery_route(
            food_name,
            condition_result["final_result"]
        )
    )

    # ========================================================
    # DISPLAY
    # ========================================================

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


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()
