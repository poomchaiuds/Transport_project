from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import Booking
from .serializers import BookingSerializer
import paho.mqtt.client as mqtt
import json
import os
from dotenv import load_dotenv

load_dotenv()

# ฟังก์ชันสำหรับส่ง MQTT ไปหา Pi
def publish_mqtt(topic, payload):
    broker = os.getenv("MQTT_BROKER_URL")
    port = int(os.getenv("MQTT_BROKER_PORT", 8883))
    user = os.getenv("MQTT_BROKER_USERNAME")
    password = os.getenv("MQTT_BROKER_PASSWORD")

    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        if user and password:
            client.username_pw_set(user, password)

        # ให้สอดคล้องกับโค้ดใน devices/views.py (TLS สำหรับพอร์ต 8883)
        use_tls_env = os.getenv("MQTT_BROKER_USE_TLS")
        if use_tls_env is not None:
            use_tls = use_tls_env.lower() in ("1", "true", "yes", "y")
        else:
            use_tls = port == 8883

        if use_tls:
            client.tls_set()

        client.connect(broker, port, 60)
        client.loop_start()
        result = client.publish(topic, payload, qos=1)
        result.wait_for_publish()
        client.loop_stop()
        client.disconnect()

        print(f"MQTT Sent to {topic}: {payload} at {broker}:{port} (tls={use_tls})")
        return True
    except Exception as e:
        print(f"MQTT Error: {e}")
        return False

def send_mqtt_config(device_id, user_id):
    topic = f"device/{device_id}/control"
    payload = json.dumps({
        "driver_id": user_id
    })
    return publish_mqtt(topic, payload)


def send_mqtt_device_none(device_id):
    """
    ส่งคำสั่งรีเซ็ตเมื่อ remove pairing:
    - topic: device/{device_id}/control
    - payload: {"device_id":"none"}
    """
    topic = f"device/{device_id}/control"
    payload = json.dumps({"device_id": "none"})
    return publish_mqtt(topic, payload)

# ฟังก์ชันดึงข้อมูลทั้งหมด และสร้างการจองใหม่
@api_view(['GET', 'POST'])
def booking_list_create(request):
    if request.method == 'GET':
        bookings = Booking.objects.all().order_by('-booked_at')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = BookingSerializer(data=request.data)
        if serializer.is_valid():
            booking = serializer.save()
            
            # ส่ง MQTT ทันทีที่จองสำเร็จ
            mqtt_ok = send_mqtt_config(
                booking.device.device_id,
                booking.user.userid
            )
            
            response_data = serializer.data
            response_data["mqtt_published"] = mqtt_ok
            return Response(response_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ฟังก์ชันลบการจับคู่ (สำหรับปุ่ม Remove)
@api_view(['DELETE'])
def booking_delete(request, pk):
    try:
        booking = Booking.objects.get(pk=pk)
        device_id = booking.device.device_id
        mqtt_ok = send_mqtt_device_none(device_id)
        booking.delete()
        return Response(
            {"message": "Pairing removed successfully", "mqtt_published": mqtt_ok},
            status=status.HTTP_200_OK,
        )
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)