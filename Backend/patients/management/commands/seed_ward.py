from django.core.management.base import BaseCommand
from patients.models import Patient


class Command(BaseCommand):
    help = "Seed or update standard hospital ward patients (matching Report Fig 7.2)"

    def handle(self, *args, **options):
        ward_patients_data = [
            {
                "id": 1,
                "name": "Rahul Sharma",
                "device_id": "ESP32_NODE_01",
                "room": "PT-0142",
                "thresholds": {
                    "hr_min": 50,
                    "hr_max": 120,
                    "spo2_min": 92,
                    "temp_max": 38.5,
                },
            },
            {
                "id": 2,
                "name": "Anita Rao",
                "device_id": "ESP32_NODE_02",
                "room": "PT-0143",
                "thresholds": {
                    "hr_min": 55,
                    "hr_max": 115,
                    "spo2_min": 93,
                    "temp_max": 38.0,
                },
            },
            {
                "id": 3,
                "name": "S. Iyer",
                "device_id": "ESP32_NODE_03",
                "room": "PT-0144",
                "thresholds": {
                    "hr_min": 50,
                    "hr_max": 110,
                    "spo2_min": 90,
                    "temp_max": 38.2,
                },
            },
            {
                "id": 4,
                "name": "Fatima K.",
                "device_id": "ESP32_NODE_04",
                "room": "PT-0145",
                "thresholds": {
                    "hr_min": 60,
                    "hr_max": 125,
                    "spo2_min": 94,
                    "temp_max": 38.5,
                },
            },
        ]

        for data in ward_patients_data:
            patient, created = Patient.objects.update_or_create(
                device_id=data["device_id"],
                defaults={
                    "name": data["name"],
                    "room": data["room"],
                    "thresholds": data["thresholds"],
                },
            )
            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{action} patient {patient.name} ({patient.device_id}, Room {patient.room}, DB ID: {patient.id})"))
