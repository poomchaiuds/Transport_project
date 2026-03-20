from django.urls import path
from . import views

urlpatterns = [
    path('api/devices/', views.device_list_create, name='device-list'),
    path('api/devices/alert-logs/', views.global_alert_logs, name='global-alert-logs'),
    
    # บรรทัดนี้สำคัญมากสำหรับการลบ
    path('api/devices/<str:device_id>/', views.device_delete, name='device-delete'),
    path('api/devices/<str:device_id>/toggle-status/', views.device_toggle_status, name='device-toggle-status'),
    path('api/devices/<str:device_id>/data/', views.device_data_list, name='device-data-list'),
    path('api/devices/driver/<str:driver_id>/latest-co2/', views.driver_latest_co2, name='driver-latest-co2'),
    path('api/devices/driver/<str:driver_id>/latest-prediction/', views.driver_latest_prediction, name='driver-latest-prediction'),
    path('api/devices/driver/<str:driver_id>/prediction-history/', views.driver_prediction_history, name='driver-prediction-history'),
    path('api/devices/<str:device_id>/alert/', views.device_alert, name='device-alert'),
]