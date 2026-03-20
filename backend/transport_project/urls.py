from django.contrib import admin
from django.urls import path, include # ต้องมี include ตรงนี้

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')), # ลิงก์ไปหาไฟล์ที่เพิ่งสร้างในแอป users'
    path('', include('devices.urls')),
    path('api/', include('bookings.urls')),
]