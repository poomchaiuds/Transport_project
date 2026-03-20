# backend/bookings/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ลบ 'api/' ออกจากข้างหน้า ถ้าในไฟล์หลักมี 'api/' แล้ว
    path('bookings/', views.booking_list_create, name='booking-list-create'),
    path('bookings/<int:pk>/', views.booking_delete, name='booking-delete'),
]