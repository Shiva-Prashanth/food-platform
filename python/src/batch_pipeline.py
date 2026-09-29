import os
import sys
import time
from datetime import datetime

# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ============================================================
# IMPORT PIPELINES
# ============================================================

from src.model2_pipeline import (
    predict_food,
    predict_freshness,
    assess_food_condition,
    _get_memory_info_str
)

from src.model3_pipeline import assess_recovery


# ============================================================
# GET FOOD INFORMATION (FOR CLI)
# ============================================================

def get_item_information(previous_information=None):
    print("\n========== FOOD INFORMATION ==========")

    if previous_information is not None:
        print("\nPrevious details are available.")
        print("Press Enter to keep them.")

        previous_time = previous_information["prepared_time_text"]
        previous_temperature = previous_information["temperature"]
        previous_storage = previous_information["storage"]
        previous_smell = previous_information["smell"]

        prepared_time_text = input(f"Preparation time [{previous_time}]: ").strip()
        if prepared_time_text == "":
            prepared_time_text = previous_time

        temperature_text = input(f"Temperature [{previous_temperature}]: ").strip()
        if temperature_text == "":
            temperature = previous_temperature
        else:
            temperature = float(temperature_text)

        storage = input(f"Storage [{previous_storage}]: ").strip().lower()
        if storage == "":
            storage = previous_storage

        smell = input(f"Smell [{previous_smell}]: ").strip().lower()
        if smell == "":
            smell = previous_smell
    else:
        prepared_time_text = input("Enter preparation time (YYYY-MM-DD HH:MM): ").strip()
        temperature = float(input("Enter current food temperature (°C): "))
        storage = input("Enter storage condition (room/refrigerator): ").strip().lower()
        smell = input("Enter smell (normal/unusual/bad): ").strip().lower()

    return {
        "prepared_time_text": prepared_time_text,
        "temperature": temperature,
        "storage": storage,
        "smell": smell
    }


# ============================================================
# PROCESS ONE FOOD ITEM
# ============================================================

def process_food_item(
    image_path,
    item_information
):
    pipeline_start = time.perf_counter()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"\n[{timestamp}] ======================================================", flush=True)
    print(f"[{timestamp}] [PIPELINE - START] Processing food item ({_get_memory_info_str()})", flush=True)
    print(f"[{timestamp}] [PIPELINE - START] Image path: {image_path}", flush=True)
    print(f"[{timestamp}] [PIPELINE - START] Item info: {item_information}", flush=True)
    print(f"[{timestamp}] ======================================================", flush=True)

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Input food image not found on disk: {image_path}")

    # ========================================================
    # STAGE 1: MODEL 1 - FOOD IDENTIFICATION (ViT)
    # ========================================================
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - STAGE 1/4] Food Identification START", flush=True)
    stage1_start = time.perf_counter()

    food_name, food_confidence = predict_food(image_path)

    stage1_elapsed = time.perf_counter() - stage1_start
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - STAGE 1/4] Food Identification DONE in "
        f"{stage1_elapsed:.2f}s -> {food_name} ({food_confidence:.2f}%)",
        flush=True
    )

    # ========================================================
    # STAGE 2: MODEL 2 - VISUAL FRESHNESS (KERAS CNN)
    # ========================================================
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - STAGE 2/4] Visual Freshness Assessment START", flush=True)
    stage2_start = time.perf_counter()

    (
        good_percentage,
        bad_percentage,
        visual_assessment
    ) = predict_freshness(image_path)

    stage2_elapsed = time.perf_counter() - stage2_start
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - STAGE 2/4] Visual Freshness DONE in "
        f"{stage2_elapsed:.2f}s -> {visual_assessment} (Good: {good_percentage:.2f}%, Bad: {bad_percentage:.2f}%)",
        flush=True
    )

    # ========================================================
    # STAGE 3: FOOD CONDITIONS & RULE ASSESSMENT
    # ========================================================
    prepared_time_text = str(item_information.get("prepared_time_text", ""))
    temperature = float(item_information.get("temperature", 28.0))
    storage = str(item_information.get("storage", "room")).lower()
    smell = str(item_information.get("smell", "normal")).lower()

    # Parse preparation time
    try:
        prepared_time = datetime.strptime(prepared_time_text, "%Y-%m-%d %H:%M")
    except ValueError:
        try:
            # Support ISO formatted strings as fallback
            prepared_time = datetime.fromisoformat(prepared_time_text.replace("Z", "+00:00"))
            if prepared_time.tzinfo is not None:
                prepared_time = prepared_time.replace(tzinfo=None)
        except Exception:
            prepared_time = datetime.now()

    current_time = datetime.now()
    elapsed_hours = max(0.0, (current_time - prepared_time).total_seconds() / 3600.0)

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - STAGE 3/4] Condition Rules Assessment START", flush=True)
    stage3_start = time.perf_counter()

    condition_result = assess_food_condition(
        visual_assessment,
        elapsed_hours,
        temperature,
        storage,
        smell
    )

    final_assessment = condition_result["final_result"]

    stage3_elapsed = time.perf_counter() - stage3_start
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - STAGE 3/4] Condition Rules DONE in "
        f"{stage3_elapsed:.2f}s -> Final Assessment: {final_assessment}",
        flush=True
    )

    # ========================================================
    # STAGE 4: MODEL 3 - RECOVERY ROUTING
    # ========================================================
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - STAGE 4/4] Recovery Route Assessment START", flush=True)
    stage4_start = time.perf_counter()

    recovery_result = assess_recovery(
        food_name,
        final_assessment
    )

    stage4_elapsed = time.perf_counter() - stage4_start
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - STAGE 4/4] Recovery Route DONE in "
        f"{stage4_elapsed:.2f}s -> Primary: {recovery_result.get('primary_route')}",
        flush=True
    )

    total_pipeline_elapsed = time.perf_counter() - pipeline_start
    print(
        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [PIPELINE - COMPLETE] All stages finished in "
        f"{total_pipeline_elapsed:.2f}s ({_get_memory_info_str()})",
        flush=True
    )
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ======================================================\n", flush=True)

    # ========================================================
    # RETURN COMPLETE SERIALIZABLE RESULT
    # ========================================================
    return {
        "image_path": image_path,
        "food_name": food_name,
        "food_confidence": food_confidence,
        "good_percentage": good_percentage,
        "bad_percentage": bad_percentage,
        "visual_assessment": visual_assessment,
        "prepared_time_text": prepared_time_text,
        "elapsed_hours": elapsed_hours,
        "temperature": temperature,
        "storage": storage,
        "smell": smell,
        "time_assessment": condition_result["time_result"],
        "storage_assessment": condition_result["storage_result"],
        "temperature_assessment": condition_result["temperature_result"],
        "smell_assessment": condition_result["smell_result"],
        "final_assessment": final_assessment,
        "animal_feed_status": recovery_result["animal_feed_status"],
        "primary_route": recovery_result["primary_route"],
        "recovery_routes": recovery_result["recovery_routes"],
        "verification_required": recovery_result["verification_required"]
    }


# ============================================================
# DISPLAY FINAL DONATION SUMMARY (FOR CLI)
# ============================================================

def display_donation_summary(donation_results):
    print("\n" + "=" * 60)
    print("              DONATION SUMMARY")
    print("=" * 60)

    for index, result in enumerate(donation_results, start=1):
        print(f"\n========== FOOD ITEM {index} ==========")
        print("\nFood identification:")
        print(f"Food identified       : {result['food_name']}")
        print(f"Food confidence       : {result['food_confidence']:.2f}%")
        print("\nVisual freshness:")
        print(f"Good                  : {result['good_percentage']:.2f}%")
        print(f"Bad                   : {result['bad_percentage']:.2f}%")
        print(f"Visual assessment     : {result['visual_assessment']}")
        print("\nFood conditions:")
        print(f"Preparation time      : {result['prepared_time_text']}")
        print(f"Elapsed time          : {result['elapsed_hours']:.2f} hours")
        print(f"Temperature           : {result['temperature']:.1f} °C")
        print(f"Storage               : {result['storage']}")
        print(f"Smell                 : {result['smell']}")
        print("\nModel 2 assessment:")
        print(f"Time                  : {result['time_assessment']}")
        print(f"Storage               : {result['storage_assessment']}")
        print(f"Temperature           : {result['temperature_assessment']}")
        print(f"Smell                 : {result['smell_assessment']}")
        print(f"Final assessment      : {result['final_assessment']}")
        print("\nModel 3 recovery:")
        print(f"Animal feed eligibility: {result['animal_feed_status']}")
        print(f"Primary route         : {result['primary_route']}")
        print(f"Recovery routes       : {result['recovery_routes']}")
        print(f"Human verification   : {result['verification_required']}")

    print("\n" + "=" * 60)
    print("AI provides recovery recommendations. Human verification is required before final recovery.")
    print("=" * 60)


# ============================================================
# MAIN (CLI)
# ============================================================

def main():
    print("\n==========================================")
    print("     SMART SURPLUS FOOD RECOVERY")
    print("==========================================")

    number_of_items = int(input("\nHow many food items do you have?\nEnter number of items: "))
    donation_results = []
    previous_information = None

    for index in range(number_of_items):
        print("\n" + "=" * 60)
        print(f"              FOOD ITEM {index + 1}")
        print("=" * 60)

        image_path = input(f"\nEnter image path for food item {index + 1}: ").strip()
        if not os.path.exists(image_path):
            print("Image not found. Skipping this item.")
            continue

        item_information = get_item_information(previous_information)
        result = process_food_item(image_path, item_information)
        donation_results.append(result)
        previous_information = item_information

    display_donation_summary(donation_results)


if __name__ == "__main__":
    main()