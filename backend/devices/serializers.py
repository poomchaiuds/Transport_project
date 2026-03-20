# 📁 devices/serializers.py

from rest_framework import serializers
from .models import PiDevice, DeviceData, PredictionResult, AlertLog

class PiDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PiDevice
        fields = ['device_id', 'carplate', 'mac_address', 'mqtt_topic', 'status']
        read_only_fields = ['mqtt_topic', 'status']


class DeviceDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceData
        fields = ['id', 'device_id', 'driver_id', 'mac_address', 'timestamp', 'offset_ms', 'co2', 'ear', 'mar', 'gyro_x', 'received_at']


class PredictionResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionResult
        fields = ['id', 'driver_id', 'timestamp', 'co2', 'ear', 'mar', 'gyro_x', 'prediction', 'risk_level']


class AlertLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertLog
        fields = ['id', 'driver_id', 'driver_name', 'device_id', 'timestamp']
