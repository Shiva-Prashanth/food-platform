# ============================================================
# ANIMAL FEED ELIGIBILITY
# ============================================================


def _normalize_food_name(food_name):
    """Normalize classifier labels before applying animal-feed rules."""
    return (
        str(food_name or "")
        .strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
    )


def check_animal_feed_eligibility(food_name):
    """
    Return ALLOWED when the identified food is in the project's
    animal-feed list for cows/buffaloes.
    """
    food_name = _normalize_food_name(food_name)

    suitable_foods = {
        "vegetable cutting waste",
        "fresh vegetables",
        "fresh fruit waste",
        "rice",
        "plain rice",
        "cooked rice",
        "chapati",
        "roti",
        "idli",
        "idly",
        "khichdi",
        "khichadi",
        "plain cooked grains",
        "cooked dal",
        "dal rice",
        "bread",
        "dosa",
        "plain dosa",
        "upma",
        "pongal",
        "sambar",
        "rasam",
        "potato curry",
        "fruit peels",
    }

    return "ALLOWED" if food_name in suitable_foods else "NOT_ALLOWED"


# ============================================================
# VERIFICATION REQUIREMENT
# ============================================================


def is_verification_required():
    return True


# ============================================================
# GET RECOVERY ROUTES
# ============================================================


def get_recovery_routes(food_name, final_assessment):
    final_assessment = str(final_assessment or "").lower().strip()
    animal_feed_status = check_animal_feed_eligibility(food_name)

    if final_assessment == "low_concern":
        routes = ["HUMAN"]
        if animal_feed_status == "ALLOWED":
            routes.append("ANIMAL_FEED")
        routes.append("BIOCOMPOST")
        return routes

    if final_assessment == "moderate_concern":
        routes = ["HUMAN"]
        if animal_feed_status == "ALLOWED":
            routes.append("ANIMAL_FEED")
        routes.append("BIOCOMPOST")
        return routes

    if final_assessment == "high_concern":
        return ["BIOCOMPOST"]

    if final_assessment == "manual_verification":
        routes = ["HUMAN"]
        if animal_feed_status == "ALLOWED":
            routes.append("ANIMAL_FEED")
        routes.append("BIOCOMPOST")
        return routes

    return ["BIOCOMPOST"]


# ============================================================
# GET PRIMARY ROUTE
# ============================================================


def get_primary_route(food_name, final_assessment):
    routes = get_recovery_routes(food_name, final_assessment)
    return routes[0]
