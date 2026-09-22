import tensorflow as tf
import numpy as np
import os

MODEL_PATH = "../models/freshness_classifier.keras"

IMAGE_SIZE = (224, 224)

model = tf.keras.models.load_model(MODEL_PATH)


image_path = r"C:\Users\andes\PycharmProjects\SmartSurplusFoodRecovery\data\freshness_dataset\test\bad\IMG-20260226-WA0051 (1)-txKhnN.jpg"

if not os.path.exists(image_path):
    print("Image not found.")
    exit()

image = tf.keras.utils.load_img(
    image_path,
    target_size=IMAGE_SIZE
)

image_array = tf.keras.utils.img_to_array(image)

image_array = np.expand_dims(image_array, axis=0)

prediction = model.predict(image_array, verbose=0)[0][0]

good_percentage = prediction * 100
bad_percentage = (1 - prediction) * 100

print("\n========== FRESHNESS ASSESSMENT ==========")

print(f"Good: {good_percentage:.2f}%")
print(f"Bad:  {bad_percentage:.2f}%")

if good_percentage >= 70:
    print("Visual Assessment: GOOD")
elif bad_percentage >= 70:
    print("Visual Assessment: BAD")
else:
    print("Visual Assessment: UNCERTAIN")
    print("Manual verification required.")