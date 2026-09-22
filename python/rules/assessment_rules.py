def assess_time(elapsed_hours):
    if elapsed_hours <= 2:
        return "low_concern"
    elif elapsed_hours <= 4:
        return "moderate_concern"
    else:
        return "high_concern"


def assess_storage(storage_condition):
    if storage_condition == "refrigerated":
        return "low_concern"
    elif storage_condition == "room_temperature":
        return "moderate_concern"
    elif storage_condition == "high_temperature":
        return "high_concern"
    else:
        return "manual_verification"


def assess_temperature(temperature):
    if temperature <= 5:
        return "low_concern"
    elif temperature <= 30:
        return "moderate_concern"
    else:
        return "high_concern"


def assess_smell(smell):
    if smell == "normal":
        return "low_concern"
    elif smell == "unusual":
        return "moderate_concern"
    elif smell == "bad":
        return "high_concern"
    else:
        return "manual_verification"


def overall_assessment(time_result, storage_result, temperature_result, smell_result):

    results = [
        time_result,
        storage_result,
        temperature_result,
        smell_result
    ]

    if "manual_verification" in results:
        return "manual_verification"

    if "high_concern" in results:
        return "high_concern"

    if results.count("moderate_concern") >= 2:
        return "moderate_concern"

    return "low_concern"

def combine_visual_assessment(
    visual_assessment,
    time_result,
    storage_result,
    temperature_result,
    smell_result
):
    visual_assessment = visual_assessment.lower().strip()

    if visual_assessment == "bad":
        return "high_concern"

    if visual_assessment == "uncertain":
        return "manual_verification"

    return overall_assessment(
        time_result,
        storage_result,
        temperature_result,
        smell_result
    )