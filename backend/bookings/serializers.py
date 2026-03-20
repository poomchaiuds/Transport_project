from rest_framework import serializers
from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.name')
    user_id_val = serializers.ReadOnlyField(source='user.userid')
    device_id_val = serializers.ReadOnlyField(source='device.device_id')
    
    class Meta:
        model = Booking
        fields = ['id', 'user', 'user_id_val', 'username', 'device', 'device_id_val', 'booked_at']