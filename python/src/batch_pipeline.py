import os
import sys
import time

# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ============================================================
# IMPORT MODEL 1 + MODEL 2
# ============================================================

from src.model2_pipeline import (
    predict_food,
    predict_freshness,
    assess_food_condition
)

# ============================================================
# IMPORT MODEL 3
# ============================================================

from src.model3_pipeline import assess_recovery


# ============================================================
# GET FOOD INFORMATION
# ============================================================

def get_item_information(previous_information=None):

    print("\n========== FOOD INFORMATION ==========")

    # --------------------------------------------------------
    # PREVIOUS INFORMATION
    # --------------------------------------------------------

    if previous_information is not None:

        print("\nPrevious details are available.")
        print("Press Enter to keep them.")

        previous_time = previous_information[
            "prepared_time_text"
        ]

        previous_temperature = previous_information[
            "temperature"
        ]

        previous_storage = previous_information[
            "storage"
        ]

        previous_smell = previous_information[
            "smell"
        ]

        prepared_time_text = input(
            f"Preparation time "
            f"[{previous_time}]: "
        ).strip()

        if prepared_time_text == "":
            prepared_time_text = previous_time

        temperature_text = input(
            f"Temperature "
            f"[{previous_temperature}]: "
        ).strip()

        if temperature_text == "":
            temperature = previous_temperature

        else:
            temperature = float(
                temperature_text
            )

        storage = input(
            f"Storage "
            f"[{previous_storage}]: "
        ).strip().lower()

        if storage == "":
            storage = previous_storage

        smell = input(
            f"Smell "
            f"[{previous_smell}]: "
        ).strip().lower()

        if smell == "":
            smell = previous_smell

    # --------------------------------------------------------
    # FIRST FOOD ITEM
    # --------------------------------------------------------

    else:

        prepared_time_text = input(
            "Enter preparation time "
            "(YYYY-MM-DD HH:MM): "
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

    return {
        "prepared_time_text":
            prepared_time_text,

        "temperature":
            temperature,

        "storage":
            storage,

        "smell":
            smell
    }


# ============================================================
# PROCESS ONE FOOD ITEM
# ============================================================

def process_food_item(
    image_path,
    item_information
):

    pipeline_start = time.perf_counter()

    print("\n========== ANALYZE PIPELINE START ==========", flush=True)
    print(f"PIPELINE: image={image_path}", flush=True)

    # ========================================================
    # MODEL 1
    # ========================================================

    print("PIPELINE 1: predict_food START", flush=True)
    model1_start = time.perf_counter()

    food_name, food_confidence = (
        predict_food(image_path)
    )

    print(
        f"PIPELINE 1: predict_food DONE in "
        f"{time.perf_counter() - model1_start:.2f}s -> "
        f"{food_name} ({food_confidence:.2f}%)",
        flush=True
    )

    # ========================================================
    # MODEL 2 - VISUAL FRESHNESS
    # ========================================================

    print("PIPELINE 2: predict_freshness START", flush=True)
    model2_start = time.perf_counter()

    (
        good_percentage,
        bad_percentage,
        visual_assessment
    ) = predict_freshness(
        image_path
    )

    print(
        f"PIPELINE 2: predict_freshness DONE in "
        f"{time.perf_counter() - model2_start:.2f}s -> "
        f"{visual_assessment}",
        flush=True
    )

    # ========================================================
    # GET CONDITIONS
    # ========================================================

    prepared_time_text = (
        item_information[
            "prepared_time_text"
        ]
    )

    temperature = (
        item_information[
            "temperature"
        ]
    )

    storage = (
        item_information[
            "storage"
        ]
    )

    smell = (
        item_information[
            "smell"
        ]
    )

    # ========================================================
    # CALCULATE ELAPSED TIME
    # ========================================================

    from datetime import datetime

    prepared_time = datetime.strptime(
        prepared_time_text,
        "%Y-%m-%d %H:%M"
    )

    current_time = datetime.now()

    elapsed_hours = (
        current_time - prepared_time
    ).total_seconds() / 3600

    # ========================================================
    # MODEL 2 - RULE ASSESSMENT
    # ========================================================

    print("PIPELINE 3: assess_food_condition START", flush=True)
    rules_start = time.perf_counter()

    condition_result = (
        assess_food_condition(
            visual_assessment,
            elapsed_hours,
            temperature,
            storage,
            smell
        )
    )

    final_assessment = (
        condition_result[
            "final_result"
        ]
    )

    print(
        f"PIPELINE 3: assess_food_condition DONE in "
        f"{time.perf_counter() - rules_start:.2f}s -> "
        f"{final_assessment}",
        flush=True
    )

    # ========================================================
    # MODEL 3
    # ========================================================

    print("PIPELINE 4: assess_recovery START", flush=True)
    model3_start = time.perf_counter()

    recovery_result = assess_recovery(
        food_name,
        final_assessment
    )

    print(
        f"PIPELINE 4: assess_recovery DONE in "
        f"{time.perf_counter() - model3_start:.2f}s",
        flush=True
    )

    print(
        f"PIPELINE: COMPLETE in "
        f"{time.perf_counter() - pipeline_start:.2f}s",
        flush=True
    )
    print("========== ANALYZE PIPELINE END ==========", flush=True)

    # ========================================================
    # RETURN COMPLETE ITEM RESULT
    # ========================================================

    return {

        "image_path":
            image_path,

        "food_name":
            food_name,

        "food_confidence":
            food_confidence,

        "good_percentage":
            good_percentage,

        "bad_percentage":
            bad_percentage,

        "visual_assessment":
            visual_assessment,

        "prepared_time_text":
            prepared_time_text,

        "elapsed_hours":
            elapsed_hours,

        "temperature":
            temperature,

        "storage":
            storage,

        "smell":
            smell,

        "time_assessment":
            condition_result[
                "time_result"
            ],

        "storage_assessment":
            condition_result[
                "storage_result"
            ],

        "temperature_assessment":
            condition_result[
                "temperature_result"
            ],

        "smell_assessment":
            condition_result[
                "smell_result"
            ],

        "final_assessment":
            final_assessment,

        "animal_feed_status":
            recovery_result[
                "animal_feed_status"
            ],

        "primary_route":
            recovery_result[
                "primary_route"
            ],

        "recovery_routes":
            recovery_result[
                "recovery_routes"
            ],

        "verification_required":
            recovery_result[
                "verification_required"
            ]
    }


# ============================================================
# DISPLAY FINAL DONATION SUMMARY
# ============================================================

def display_donation_summary(
    donation_results
):

    print("\n")
    print("=" * 60)

    print(
        "              DONATION SUMMARY"
    )

    print("=" * 60)

    for index, result in enumerate(
        donation_results,
        start=1
    ):

        print("\n")
        print(
            f"========== FOOD ITEM {index} =========="
        )

        # ----------------------------------------------------
        # FOOD
        # ----------------------------------------------------

        print("\nFood identification:")

        print(
            f"Food identified       : "
            f"{result['food_name']}"
        )

        print(
            f"Food confidence       : "
            f"{result['food_confidence']:.2f}%"
        )

        # ----------------------------------------------------
        # FRESHNESS
        # ----------------------------------------------------

        print("\nVisual freshness:")

        print(
            f"Good                  : "
            f"{result['good_percentage']:.2f}%"
        )

        print(
            f"Bad                   : "
            f"{result['bad_percentage']:.2f}%"
        )

        print(
            f"Visual assessment     : "
            f"{result['visual_assessment']}"
        )

        # ----------------------------------------------------
        # CONDITIONS
        # ----------------------------------------------------

        print("\nFood conditions:")

        print(
            f"Preparation time      : "
            f"{result['prepared_time_text']}"
        )

        print(
            f"Elapsed time          : "
            f"{result['elapsed_hours']:.2f} hours"
        )

        print(
            f"Temperature           : "
            f"{result['temperature']:.1f} °C"
        )

        print(
            f"Storage               : "
            f"{result['storage']}"
        )

        print(
            f"Smell                 : "
            f"{result['smell']}"
        )

        # ----------------------------------------------------
        # MODEL 2
        # ----------------------------------------------------

        print("\nModel 2 assessment:")

        print(
            f"Time                  : "
            f"{result['time_assessment']}"
        )

        print(
            f"Storage               : "
            f"{result['storage_assessment']}"
        )

        print(
            f"Temperature           : "
            f"{result['temperature_assessment']}"
        )

        print(
            f"Smell                 : "
            f"{result['smell_assessment']}"
        )

        print(
            f"Final assessment      : "
            f"{result['final_assessment']}"
        )

        # ----------------------------------------------------
        # MODEL 3
        # ----------------------------------------------------

        print("\nModel 3 recovery:")

        print(
            f"Animal feed eligibility: "
            f"{result['animal_feed_status']}"
        )

        print(
            f"Primary route         : "
            f"{result['primary_route']}"
        )

        print(
            f"Recovery routes       : "
            f"{result['recovery_routes']}"
        )

        print(
            f"Human verification   : "
            f"{result['verification_required']}"
        )

    # ========================================================
    # FINAL SAFETY MESSAGE
    # ========================================================

    print("\n" + "=" * 60)

    print(
        "AI provides recovery recommendations."
    )

    print(
        "Human verification is required "
        "before final recovery."
    )

    print("=" * 60)


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
    # NUMBER OF FOOD ITEMS
    # ========================================================

    number_of_items = int(
        input(
            "\nHow many food items do you have?\n"
            "Enter number of items: "
        )
    )

    donation_results = []

    previous_information = None

    # ========================================================
    # PROCESS ITEMS ONE BY ONE
    # ========================================================

    for index in range(
        number_of_items
    ):

        print("\n")
        print("=" * 60)

        print(
            f"              FOOD ITEM {index + 1}"
        )

        print("=" * 60)

        # ----------------------------------------------------
        # PHOTO FIRST
        # ----------------------------------------------------

        image_path = input(
            "\nEnter image path for food item "
            f"{index + 1}: "
        ).strip()

        if not os.path.exists(image_path):

            print(
                "Image not found. "
                "Skipping this item."
            )

            continue

        # ----------------------------------------------------
        # DETAILS
        # ----------------------------------------------------

        item_information = (
            get_item_information(
                previous_information
            )
        )

        # ----------------------------------------------------
        # PROCESS ALL MODELS
        # ----------------------------------------------------

        result = process_food_item(
            image_path,
            item_information
        )

        # ----------------------------------------------------
        # SAVE RESULT
        # ----------------------------------------------------

        donation_results.append(
            result
        )

        # ----------------------------------------------------
        # SAVE DETAILS FOR NEXT ITEM
        # ----------------------------------------------------

        previous_information = (
            item_information
        )

    # ========================================================
    # FINAL RESULT
    # ========================================================

    display_donation_summary(
        donation_results
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()