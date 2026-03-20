from django.core.management.base import BaseCommand
from devices.prediction_service import run_prediction_loop


class Command(BaseCommand):
    help = "Start AI prediction loop (processes every 1 second)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🧠 Starting AI prediction service..."))
        run_prediction_loop()
