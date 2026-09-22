import pandas as pd
from rules.assessment_rules import (
    assess_time,
    assess_storage,
    assess_temperature,
    assess_smell,
    overall_assessment
)

data = pd.read_csv("../data/food_assessment.csv")

data["prepared_time"] = pd.to_datetime(data["prepared_time"])
data["assessment_time"] = pd.to_datetime(data["assessment_time"])

data["elapsed_hours"] = (
    data["assessment_time"] - data["prepared_time"]
).dt.total_seconds() / 3600

data["time_assessment"] = data["elapsed_hours"].apply(assess_time)

data["storage_assessment"] = data["storage_condition"].apply(assess_storage)

data["temperature_assessment"] = data["temperature"].apply(assess_temperature)

data["smell_assessment"] = data["smell"].apply(assess_smell)

data["overall_assessment"] = data.apply(
    lambda row: overall_assessment(
        row["time_assessment"],
        row["storage_assessment"],
        row["temperature_assessment"],
        row["smell_assessment"]
    ),
    axis=1
)

print(data[[
    "food_item",
    "elapsed_hours",
    "storage_condition",
    "temperature",
    "smell",
    "time_assessment",
    "storage_assessment",
    "temperature_assessment",
    "smell_assessment",
    "overall_assessment"
]])