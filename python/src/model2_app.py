import os
from datetime import datetime

import numpy as np
import streamlit as st
import tensorflow as tf
import sys
from transformers import pipeline


PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

sys.path.insert(0, PROJECT_ROOT)

from rules.assessment_rules import (
    assess_time,
    assess_storage,
    assess_temperature,
    assess_smell,
    overall_assessment
)


# ============================================================
# CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Smart Surplus Food Recovery",
    page_icon="🍱",
    layout="wide"
)


FRESHNESS_MODEL_PATH = os.path.join(
    PROJECT_ROOT,
    "models",
    "freshness_classifier.keras"
)

IMAGE_SIZE = (224, 224)


# ============================================================
# LOAD MODELS
# ============================================================

@st.cache_resource
def load_models():

    # Food identification model
    food_model = pipeline(
        "image-classification",
        model="Subhash5/indian-food-classifier"
    )

    # Existing freshness model
    freshness_model = tf.keras.models.load_model(
        FRESHNESS_MODEL_PATH
    )

    return food_model, freshness_model


food_model, freshness_model = load_models()


# ============================================================
# IMAGE PREPARATION
# ============================================================

def prepare_image(image):

    image = image.resize(IMAGE_SIZE)

    image_array = np.array(image)

    # Handle images with transparency
    if image_array.shape[-1] == 4:
        image_array = image_array[:, :, :3]

    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    return image_array


# ============================================================
# FOOD PREDICTION
# ============================================================

def predict_food(image):

    predictions = food_model(image)

    best_prediction = predictions[0]

    food_name = best_prediction["label"]

    confidence = (
        best_prediction["score"] * 100
    )

    return food_name, confidence


# ============================================================
# FRESHNESS PREDICTION
# ============================================================

def predict_freshness(image):

    image_array = prepare_image(image)

    prediction = freshness_model.predict(
        image_array,
        verbose=0
    )[0][0]

    # Class mapping:
    # 0 = bad
    # 1 = good

    good_percentage = prediction * 100

    bad_percentage = (1 - prediction) * 100

    if good_percentage >= 70:

        visual_assessment = "GOOD"

    elif bad_percentage >= 70:

        visual_assessment = "BAD"

    else:

        visual_assessment = "UNCERTAIN"

    return (
        good_percentage,
        bad_percentage,
        visual_assessment
    )


# ============================================================
# RECOVERY RECOMMENDATION
# ============================================================

def get_recovery_recommendation(final_result):

    if final_result == "low_concern":

        return "SUITABLE FOR FURTHER RECOVERY CONSIDERATION"

    elif final_result == "moderate_concern":

        return "MANUAL VERIFICATION REQUIRED"

    elif final_result == "high_concern":

        return "NOT RECOMMENDED FOR RECOVERY"

    else:

        return "MANUAL VERIFICATION REQUIRED"


# ============================================================
# APPLICATION
# ============================================================

st.title("🍱 Smart Surplus Food Recovery")

st.subheader("Model 2 — Food Assessment")

st.write(
    "Upload a food image and provide the food condition "
    "information to assess its recovery suitability."
)


# ============================================================
# IMAGE UPLOAD
# ============================================================

st.header("1. Food Image")

uploaded_file = st.file_uploader(
    "Upload food image",
    type=["jpg", "jpeg", "png"]
)


if uploaded_file is not None:

    image = tf.keras.utils.load_img(
        uploaded_file,
        target_size=None
    )

    st.image(
        image,
        caption="Uploaded food image",
        width=350
    )


# ============================================================
# FOOD INFORMATION
# ============================================================

st.header("2. Food Information")

col1, col2 = st.columns(2)

with col1:

    prepared_date = st.date_input(
        "Preparation date"
    )

    prepared_time = st.time_input(
        "Preparation time"
    )

with col2:

    temperature = st.number_input(
        "Current food temperature (°C)",
        min_value=-10.0,
        max_value=100.0,
        value=28.0,
        step=1.0
    )

    storage = st.selectbox(
        "Storage condition",
        [
            "room",
            "refrigerator"
        ]
    )

smell = st.selectbox(
    "Smell condition",
    [
        "normal",
        "unusual",
        "bad"
    ]
)


# ============================================================
# ASSESS BUTTON
# ============================================================

st.header("3. Assessment")

if st.button(
    "Assess Food",
    type="primary"
):

    if uploaded_file is None:

        st.error(
            "Please upload a food image first."
        )

    else:

        # ----------------------------------------------------
        # IMAGE MODELS
        # ----------------------------------------------------

        food_name, food_confidence = predict_food(
            image
        )

        (
            good_percentage,
            bad_percentage,
            visual_assessment
        ) = predict_freshness(
            image
        )


        # ----------------------------------------------------
        # ELAPSED TIME
        # ----------------------------------------------------

        prepared_datetime = datetime.combine(
            prepared_date,
            prepared_time
        )

        current_datetime = datetime.now()

        elapsed_hours = (
            current_datetime - prepared_datetime
        ).total_seconds() / 3600


        # ----------------------------------------------------
        # RULE INPUT
        # ----------------------------------------------------

        if storage == "room":

            storage_rule_value = "room_temperature"

        elif storage == "refrigerator":

            storage_rule_value = "refrigerated"

        else:

            storage_rule_value = storage


        # ----------------------------------------------------
        # RULE ASSESSMENTS
        # ----------------------------------------------------

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


        # ----------------------------------------------------
        # OVERALL ASSESSMENT
        # ----------------------------------------------------

        final_result = overall_assessment(
            time_result,
            storage_result,
            temperature_result,
            smell_result
        )


        recovery_recommendation = (
            get_recovery_recommendation(
                final_result
            )
        )


        # ====================================================
        # RESULTS
        # ====================================================

        st.divider()

        st.header("Assessment Result")


        # ----------------------------------------------------
        # FOOD RESULT
        # ----------------------------------------------------

        st.subheader("Food Identification")

        result_col1, result_col2 = st.columns(2)

        with result_col1:

            st.metric(
                "Food Item",
                food_name.upper()
            )

        with result_col2:

            st.metric(
                "Food Confidence",
                f"{food_confidence:.2f}%"
            )


        # ----------------------------------------------------
        # FRESHNESS
        # ----------------------------------------------------

        st.subheader("Visual Freshness")

        fresh_col1, fresh_col2, fresh_col3 = st.columns(3)

        with fresh_col1:

            st.metric(
                "Good",
                f"{good_percentage:.2f}%"
            )

        with fresh_col2:

            st.metric(
                "Bad",
                f"{bad_percentage:.2f}%"
            )

        with fresh_col3:

            st.metric(
                "Visual Assessment",
                visual_assessment
            )


        # ----------------------------------------------------
        # FOOD CONDITIONS
        # ----------------------------------------------------

        st.subheader("Food Conditions")

        condition_col1, condition_col2 = st.columns(2)

        with condition_col1:

            st.write(
                f"**Elapsed time:** "
                f"{elapsed_hours:.2f} hours"
            )

            st.write(
                f"**Temperature:** "
                f"{temperature:.1f} °C"
            )

        with condition_col2:

            st.write(
                f"**Storage:** {storage}"
            )

            st.write(
                f"**Smell:** {smell}"
            )


        # ----------------------------------------------------
        # RULE ASSESSMENT
        # ----------------------------------------------------

        st.subheader("Rule Assessment")

        rule_col1, rule_col2 = st.columns(2)

        with rule_col1:

            st.write(
                f"**Time:** {time_result}"
            )

            st.write(
                f"**Storage:** {storage_result}"
            )

        with rule_col2:

            st.write(
                f"**Temperature:** "
                f"{temperature_result}"
            )

            st.write(
                f"**Smell:** {smell_result}"
            )


        # ----------------------------------------------------
        # FINAL RESULT
        # ----------------------------------------------------

        st.divider()

        st.subheader("Final Assessment")

        if final_result == "high_concern":

            st.error(
                "HIGH CONCERN"
            )

        elif final_result == "moderate_concern":

            st.warning(
                "MODERATE CONCERN"
            )

        elif final_result == "low_concern":

            st.success(
                "LOW CONCERN"
            )

        else:

            st.warning(
                "MANUAL VERIFICATION REQUIRED"
            )


        st.write(
            f"**Recovery Recommendation:** "
            f"{recovery_recommendation}"
        )


        # ----------------------------------------------------
        # DISCLAIMER
        # ----------------------------------------------------

        st.info(
            "This prototype provides a decision-support "
            "assessment based on visual classification and "
            "the entered food-condition factors. It does not "
            "guarantee that food is safe to eat."
        )