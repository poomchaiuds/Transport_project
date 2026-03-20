from django.db import models

class PiDevice(models.Model):
    device_id = models.CharField(max_length=50, primary_key=True, unique=True, verbose_name="ชื่ออุปกรณ์")
    carplate = models.CharField(max_length=20, blank=True, verbose_name="ทะเบียนรถ")
    mac_address = models.CharField(max_length=17, unique=True, verbose_name="MAC Address")
    mqtt_topic = models.CharField(max_length=100, blank=True)
    
    status = models.CharField(
        max_length=10, 
        choices=[('online', 'Online'), ('offline', 'Offline')], 
        default='offline'
    )

    def save(self, *args, **kwargs):
        if not self.mqtt_topic:
            # สร้าง Topic อัตโนมัติถ้าไม่ได้ใส่มา
            self.mqtt_topic = f"device/{self.device_id}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.device_id} - {self.carplate}"


class DeviceData(models.Model):
    device_id = models.CharField(max_length=50, verbose_name="Device ID")
    driver_id = models.CharField(max_length=100, verbose_name="Driver ID")
    mac_address = models.CharField(max_length=17, verbose_name="MAC Address")
    timestamp = models.DateTimeField(verbose_name="Device Timestamp")
    offset_ms = models.IntegerField(verbose_name="Offset (ms)")
    co2 = models.FloatField(verbose_name="CO2")
    ear = models.FloatField(verbose_name="EAR")
    mar = models.FloatField(verbose_name="MAR")
    gyro_x = models.FloatField(verbose_name="Gyroscope X")
    received_at = models.DateTimeField(auto_now_add=True, verbose_name="Received At")

    class Meta:
        ordering = ['-timestamp', 'offset_ms']
        verbose_name = "Device Data"
        verbose_name_plural = "Device Data"

    def __str__(self):
        return f"{self.device_id} | {self.timestamp} +{self.offset_ms}ms"


class PredictionResult(models.Model):
    RISK_CHOICES = [
        ('active', 'Active'),
        ('drowsy', 'Drowsy'),
    ]

    driver_id = models.CharField(max_length=100, verbose_name="Driver ID")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Prediction Time")
    co2 = models.FloatField(verbose_name="CO2")
    ear = models.FloatField(verbose_name="EAR")
    mar = models.FloatField(verbose_name="MAR")
    gyro_x = models.FloatField(verbose_name="Gyroscope X")
    prediction = models.FloatField(verbose_name="Prediction Score")
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES, verbose_name="Risk Level")

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Prediction Result"
        verbose_name_plural = "Prediction Results"

    def __str__(self):
        return f"{self.driver_id} | {self.risk_level} | {self.timestamp}"


class AlertLog(models.Model):
    driver_id = models.CharField(max_length=100, verbose_name="Driver ID")
    driver_name = models.CharField(max_length=150, verbose_name="Driver Name")
    device_id = models.CharField(max_length=50, verbose_name="Device ID")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Alert Time")

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Alert Log"
        verbose_name_plural = "Alert Logs"

    def __str__(self):
        return f"ALERT: {self.driver_name} ({self.device_id}) at {self.timestamp}"