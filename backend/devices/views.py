from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import PiDevice, DeviceData, PredictionResult, AlertLog
from devices.serializers import PiDeviceSerializer, DeviceDataSerializer, PredictionResultSerializer, AlertLogSerializer

# สำหรับจัดการรายการทั้งหมด และ สร้างใหม่ (GET /api/devices/ และ POST)
@api_view(['GET', 'POST'])
def device_list_create(request):
    if request.method == 'GET':
        # เรียงลำดับใหม่สุดขึ้นก่อน เพื่อให้ React แสดงข้อมูลล่าสุดด้านบน
        devices = PiDevice.objects.all().order_by('-device_id') 
        serializer = PiDeviceSerializer(devices, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = PiDeviceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# สำหรับจัดการรายตัว เช่น การอัปเดต และ ลบ (PUT, DELETE /api/devices/PI_01/)
@api_view(['DELETE', 'PUT'])
def device_delete(request, device_id):
    try:
        # ค้นหาอุปกรณ์ด้วย device_id ที่ส่งมาจาก React
        device = PiDevice.objects.get(device_id=device_id)
    except PiDevice.DoesNotExist:
        return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        device.delete()
        # ส่ง 204 กลับไป เพื่อบอกว่าลบสำเร็จและไม่มีเนื้อหาต้องส่งคืน
        return Response({"message": "Device deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
    
    if request.method == 'PUT':
        serializer = PiDeviceSerializer(device, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

import os
from dotenv import load_dotenv
import paho.mqtt.client as mqtt

# Load env variables from .env
load_dotenv()

@api_view(['POST'])
def device_toggle_status(request, device_id):
    try:
        device = PiDevice.objects.get(device_id=device_id)
        
        # Toggle status
        if device.status == 'offline':
            new_status = 'online'
        else:
            new_status = 'offline'
        
        device.status = new_status
        device.save()

        # Publish MQTT
        try:
            broker_url = os.getenv("MQTT_BROKER_URL")
            broker_port = int(os.getenv("MQTT_BROKER_PORT", 8883))
            username = os.getenv("MQTT_BROKER_USERNAME")
            password = os.getenv("MQTT_BROKER_PASSWORD")

            # Create a new MQTT client
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            if username and password:
                client.username_pw_set(username, password)
            
            client.tls_set() # Use TLS for HiveMQ Cloud
            
            # Connect and publish
            client.connect(broker_url, broker_port, 60)
            client.loop_start()  # Start the network loop to process outgoing messages
            
            topic = f"device/{device.device_id}/control"
            payload = "online" if new_status == 'online' else "offline"
            
            result = client.publish(topic, payload, qos=1)
            result.wait_for_publish()  # Wait until the message is actually sent
            
            client.loop_stop()
            client.disconnect()
            mqtt_success = True
            print(f"MQTT published '{payload}' to topic '{topic}'")
        except Exception as e:
            print(f"MQTT publish failed: {e}")
            mqtt_success = False
            
        return Response({
            "message": "Status updated successfully", 
            "status": new_status,
            "mqtt_published": mqtt_success
        }, status=status.HTTP_200_OK)
    
    except PiDevice.DoesNotExist:
        return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)


# ดึงข้อมูล sensor data ของ device (GET /api/devices/<device_id>/data/)
@api_view(['GET'])
def device_data_list(request, device_id):
    data = DeviceData.objects.filter(device_id=device_id)
    serializer = DeviceDataSerializer(data, many=True)
    return Response(serializer.data)


# ดึงค่า CO2 ล่าสุดของ driver (GET /api/devices/driver/<driver_id>/latest-co2/)
@api_view(['GET'])
def driver_latest_co2(request, driver_id):
    latest = DeviceData.objects.filter(driver_id=driver_id).order_by('-timestamp', '-offset_ms').first()
    if latest:
        return Response({"co2": latest.co2, "timestamp": latest.timestamp})
    return Response({"co2": None, "timestamp": None})


# ดึงผล prediction ล่าสุดของ driver (GET /api/devices/driver/<driver_id>/latest-prediction/)
@api_view(['GET'])
def driver_latest_prediction(request, driver_id):
    latest = PredictionResult.objects.filter(driver_id=driver_id).first()
    if latest:
        serializer = PredictionResultSerializer(latest)
        return Response(serializer.data)
    return Response({"prediction": None, "risk_level": None})


# ดึงประวัติ prediction ของ driver สำหรับแสดงกราฟ
# (GET /api/devices/driver/<driver_id>/prediction-history/)
@api_view(['GET'])
def driver_prediction_history(request, driver_id):
    # ดึงล่าสุด 100 รายการ แล้วกลับลำดับ (เก่า→ใหม่) เพื่อให้กราฟลื่น L→R
    records = list(
        PredictionResult.objects
        .filter(driver_id=driver_id)
        .order_by('-timestamp')[:100]
    )
    records.reverse()
    serializer = PredictionResultSerializer(records, many=True)
    return Response(serializer.data)


# ส่ง alert ไปยัง MQTT broker topic device/{device_id}/control
# (POST /api/devices/<device_id>/alert/)
@api_view(['POST'])
def device_alert(request, device_id):
    try:
        # Save alert log with data from request.data
        driver_id = request.data.get('driver_id', 'Unknown')
        driver_name = request.data.get('driver_name', 'Unknown')
        AlertLog.objects.create(
            driver_id=driver_id,
            driver_name=driver_name,
            device_id=device_id
        )

        broker_url = os.getenv("MQTT_BROKER_URL")
        broker_port = int(os.getenv("MQTT_BROKER_PORT", 8883))
        username = os.getenv("MQTT_BROKER_USERNAME")
        password = os.getenv("MQTT_BROKER_PASSWORD")

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        if username and password:
            client.username_pw_set(username, password)
        client.tls_set()
        client.connect(broker_url, broker_port, 60)
        client.loop_start()

        topic = f"device/{device_id}/control"
        result = client.publish(topic, "alert", qos=1)
        result.wait_for_publish()

        client.loop_stop()
        client.disconnect()
        print(f"[ALERT] Logged and published 'alert' to '{topic}'")
        return Response({"message": "Alert sent and logged", "topic": topic}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[ALERT] MQTT publish or log failed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# สำหรับแสดง Alert Logs รวม (GET /api/devices/alert-logs/)
@api_view(['GET'])
def global_alert_logs(request):
    logs = AlertLog.objects.all()[:50]  # ดึง 50 รายการล่าสุด
    serializer = AlertLogSerializer(logs, many=True)
    return Response(serializer.data)