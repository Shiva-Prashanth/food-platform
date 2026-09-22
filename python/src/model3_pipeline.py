from rules.recovery_rules import (
    get_recovery_routes,
    get_primary_route,
    check_animal_feed_eligibility,
    is_verification_required
)


# ============================================================
# MODEL 3 RECOVERY ASSESSMENT
# ============================================================

def assess_recovery(
    food_name,
    final_assessment
):

    animal_feed_status = (
        check_animal_feed_eligibility(
            food_name
        )
    )

    routes = get_recovery_routes(
        food_name,
        final_assessment
    )

    primary_route = get_primary_route(
        food_name,
        final_assessment
    )

    verification_required = (
        is_verification_required()
    )

    result = {

        "food_name": food_name,

        "final_assessment": final_assessment,

        "animal_feed_status": animal_feed_status,

        "primary_route": primary_route,

        "recovery_routes": routes,

        "verification_required":
            verification_required
    }

    return result