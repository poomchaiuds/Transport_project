# backend/users/models.py
from django.db import models

class UserProfile(models.Model):
    userid = models.CharField(max_length=50, primary_key=True) 
    fb_uid = models.CharField(max_length=128, unique=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    role = models.CharField(max_length=20, default='driver')
    created_at = models.DateTimeField(auto_now_add=True)

    # ไม่ต้องใส่ class Meta db_table แล้ว