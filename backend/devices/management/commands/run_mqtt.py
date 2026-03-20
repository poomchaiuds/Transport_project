from django.core.management.base import BaseCommand
from devices.mqtt_subscriber import start_mqtt_subscriber


class Command(BaseCommand):
    help = "Start MQTT subscriber for device/data topic"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🚀 Starting MQTT subscriber..."))
        start_mqtt_subscriber()
