from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from patients.models import Patient, UserProfile


class Command(BaseCommand):
    help = "Seed or update standard hospital ward patients and clinical staff accounts"

    def handle(self, *args, **options):
        # 1. Seed clinical staff accounts
        users_data = [
            {
                "username": "dr.mehta",
                "email": "dr.mehta@caresense.io",
                "password": "DoctorPass2026!",
                "first_name": "Dr. Ronald",
                "last_name": "Mehta",
                "role": "DOCTOR",
                "phone": "+91 98765 43210",
                "is_superuser": False,
            },
            {
                "username": "nurse.sarah",
                "email": "nurse.sarah@caresense.io",
                "password": "NursePass2026!",
                "first_name": "Sarah",
                "last_name": "Jenkins (RN)",
                "role": "NURSE",
                "phone": "+91 98765 43211",
                "is_superuser": False,
            },
            {
                "username": "admin",
                "email": "admin@caresense.io",
                "password": "AdminPass2026!",
                "first_name": "System",
                "last_name": "Administrator",
                "role": "ADMIN",
                "phone": "+91 98765 43212",
                "is_superuser": True,
            },
        ]

        for u in users_data:
            user, created = User.objects.get_or_create(
                username=u["username"],
                defaults={
                    "email": u["email"],
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "is_staff": u["is_superuser"],
                    "is_superuser": u["is_superuser"],
                },
            )
            user.email = u["email"]
            user.first_name = u["first_name"]
            user.last_name = u["last_name"]
            user.set_password(u["password"])
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = u["role"]
            profile.phone = u["phone"]
            profile.save()

            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{status_str} clinical user: {user.username} ({u['role']})"))

        # 2. Seed ward patients
        ward_patients_data = [
            {
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
