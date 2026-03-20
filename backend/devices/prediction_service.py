import os
import numpy as np
import joblib
from pathlib import Path
from django.conf import settings


# Path to model files
DL_MODELS_DIR = Path(settings.BASE_DIR) / 'dl_models'
MODEL_PATH = DL_MODELS_DIR / 'model.h5'
SCALER_PATH = DL_MODELS_DIR / 'scaler.pkl'

# Cache loaded models
_model = None
_scaler = None
_models_loaded = False


def load_models():
    """โหลด model (.h5) และ scaler (.pkl) จาก dl_models/ (โหลดครั้งเดียว)"""
    global _model, _scaler, _models_loaded

    if _models_loaded:
        return _model, _scaler

    if MODEL_PATH.exists():
        try:
            import keras
            from keras.layers import Dense

            # Workaround: model was saved with Keras 3.13 which adds 'quantization_config'
            # to Dense; patch it out so Keras 3.12.x can still load the file.
            class _PatchedDense(Dense):
                def __init__(self, *args, **kwargs):
                    kwargs.pop('quantization_config', None)
                    super().__init__(*args, **kwargs)

            _model = keras.models.load_model(
                str(MODEL_PATH),
                custom_objects={'Dense': _PatchedDense},
                compile=False,
            )
            print(f"✅ Loaded model from {MODEL_PATH}")
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
    else:
        print(f"⚠️ Model file not found: {MODEL_PATH}")

    if SCALER_PATH.exists():
        try:
            _scaler = joblib.load(str(SCALER_PATH))
            print(f"✅ Loaded scaler from {SCALER_PATH}")
        except Exception as e:
            print(f"❌ Failed to load scaler: {e}")
    else:
        print(f"⚠️ Scaler file not found: {SCALER_PATH}")

    _models_loaded = True
    return _model, _scaler


def predict_for_driver(driver_id):
    """ดึง 10 แถวล่าสุดของ driver แล้วประมวลผล — เรียกเมื่อมี data ใหม่เท่านั้น"""
    from devices.models import DeviceData, PredictionResult

    model, scaler = load_models()

    # ดึง 10 แถวล่าสุดของ driver
    latest_rows = list(
        DeviceData.objects.filter(driver_id=driver_id)
        .order_by('-timestamp', '-offset_ms')[:10]
    )

    if len(latest_rows) < 10:
        print(f"⏭️ Skip {driver_id}: only {len(latest_rows)} rows (need 10)")
        return

    # แปลงเป็น numpy array — ลำดับต้องตรงกับตอนเทรน: [gyro_x, ear, mar, co2]
    features = np.array([
        [row.gyro_x, row.ear, row.mar, row.co2]
        for row in latest_rows
    ])

    # ค่าล่าสุด (แถวแรก เพราะ order by desc)
    latest = latest_rows[0]

    if model is not None:
        try:
            input_data = features.copy()

            # Scale ถ้ามี scaler
            if scaler is not None:
                input_data = scaler.transform(input_data)

            # Reshape สำหรับ model (1, 10, 4) — 1 sample, 10 timesteps, 4 features
            input_data = input_data.reshape(1, 10, 4)

            # Predict
            prediction_score = float(model.predict(input_data, verbose=0)[0][0])
            risk_level = 'drowsy' if prediction_score >= 0.5 else 'active'
        except Exception as e:
            print(f"❌ Prediction error for {driver_id}: {e}")
            return
    else:
        # ไม่มี model → ใช้ placeholder
        prediction_score = 0.0
        risk_level = 'active'

    # บันทึกผลลง PredictionResult
    PredictionResult.objects.create(
        driver_id=driver_id,
        co2=latest.co2,
        ear=latest.ear,
        mar=latest.mar,
        gyro_x=latest.gyro_x,
        prediction=prediction_score,
        risk_level=risk_level,
    )
    print(f"🧠 Prediction for {driver_id}: {risk_level} (score={prediction_score:.4f})")
