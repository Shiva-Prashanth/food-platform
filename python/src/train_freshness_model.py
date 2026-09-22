import os
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import EfficientNetB0

TRAIN_DIR = "../data/freshness_dataset/train"
VAL_DIR = "../data/freshness_dataset/validation"
TEST_DIR = "../data/freshness_dataset/test"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 15

train_data = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    shuffle=True
)

val_data = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    shuffle=False
)

test_data = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="binary",
    shuffle=False
)

print("Classes:", train_data.class_names)

base_model = EfficientNetB0(
    include_top=False,
    weights="imagenet",
    input_shape=(224, 224, 3)
)

base_model.trainable = False

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dropout(0.2),
    layers.Dense(1, activation="sigmoid")
])

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

print("\n========== TRAINING ==========")

history = model.fit(
    train_data,
    validation_data=val_data,
    epochs=EPOCHS
)

print("\n========== TESTING ==========")

test_loss, test_accuracy = model.evaluate(test_data)

print("Test Loss:", test_loss)
print("Test Accuracy:", test_accuracy)

os.makedirs("../models", exist_ok=True)

model.save("../models/freshness_classifier.keras")

print("\nModel saved to:")
print("../models/freshness_classifier.keras")

print("\nTraining completed.")