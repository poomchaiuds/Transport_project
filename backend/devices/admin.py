from django.contrib import admin
from .models import PiDevice

@admin.register(PiDevice)
class PiDeviceAdmin(admin.ModelAdmin):
    # 1. กำหนดคอลัมน์ที่จะแสดงในหน้าตารางรวม
    list_display = ('device_id', 'carplate', 'status', 'mac_address', 'mqtt_topic')
    
    # 2. เพิ่มแถบกรองข้อมูลด้านข้าง (Filter) ตามสถานะ
    list_filter = ('status',)
    
    # 3. กำหนดฟิลด์ที่สามารถใช้ช่อง Search ค้นหาได้
    search_fields = ('device_id', 'carplate', 'mac_address')
    
    # 4. กำหนดให้ mqtt_topic เป็น Read-only หรือแสดงแต่ห้ามแก้ (เพราะเราใช้ระบบ Auto-generate)
    # ถ้าอยากให้แก้เองได้ให้ลบบรรทัดล่างนี้ออกครับ
    readonly_fields = ('mqtt_topic',)

    # 5. จัดกลุ่มฟิลด์ตอนกดเข้าไปหน้าแก้ไข (เลือกใส่หรือไม่ใส่ก็ได้)
    fieldsets = (
        ("ข้อมูลพื้นฐาน", {
            'fields': ('device_id', 'carplate', 'mac_address')
        }),
        ("สถานะและการเชื่อมต่อ", {
            'fields': ('status', 'mqtt_topic')
        }),
    )