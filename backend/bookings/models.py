from django.db import models
from users.models import UserProfile
from devices.models import PiDevice

class Booking(models.Model):
    # เชื่อมกับ userid ของ UserProfile
    user = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    
    # เชื่อมกับ id ของ PiDevice
    device = models.OneToOneField(PiDevice, on_delete=models.CASCADE)
    
    booked_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.name} - {self.device.device_id}"