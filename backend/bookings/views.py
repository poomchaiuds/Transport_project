from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import Booking
from .serializers import BookingSerializer
import paho.mqtt.publish as publish
import json

# ฟังก์ชันสำหรับส่ง MQTT ไปหา Pi
def send_mqtt_config(device_id, user_id):
    topic = f"devices/{device_id}/config"
    payload = json.dumps({
        "action": "update_user",
        "user_id": user_id
    })
    try:
        publish.single(topic, payload, hostname="broker.emqx.io")
        print(f"MQTT Sent to {topic}: {payload}")
    except Exception as e:
        print(f"MQTT Error: {e}")

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
            send_mqtt_config(
                booking.device.device_id,
                booking.user.userid
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ฟังก์ชันลบการจับคู่ (สำหรับปุ่ม Remove)
@api_view(['DELETE'])
def booking_delete(request, pk):
    try:
        booking = Booking.objects.get(pk=pk)
        booking.delete()
        return Response({"message": "Pairing removed successfully"}, status=status.HTTP_204_NO_CONTENT)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)