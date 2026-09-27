from django.test import TestCase
from rest_framework.test import APIClient
from patients.models import Patient
from vitals.models import VitalReading
from alerts.models import Alert


class VitalIngestTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_vital_ingest_creates_patient_and_reading(self):
        payload = {
            "device_id": "ESP32_NODE_01",
            "heart_rate": 75.0,
            "spo2": 98.0,
            "temperature": 36.6,
            "motion_flag": False,
            "sos_pressed": False,
            "state": "NORMAL",
            "timestamp": 123456
        }
        res = self.client.post('/api/v1/vitals/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Patient.objects.count(), 1)
        self.assertEqual(VitalReading.objects.count(), 1)
        self.assertEqual(Alert.objects.count(), 0)

    def test_alert_creation_and_anti_flooding(self):
        critical_payload = {
            "device_id": "ESP32_NODE_01",
            "heart_rate": 140.0,
            "spo2": 88.0,
            "temperature": 39.5,
            "motion_flag": True,
            "sos_pressed": True,
            "state": "CRITICAL",
            "timestamp": 200000
        }
        # First critical POST creates an alert
        res1 = self.client.post('/api/v1/vitals/', critical_payload, format='json')
        self.assertEqual(res1.status_code, 201)
        self.assertEqual(Alert.objects.count(), 1)
        alert = Alert.objects.first()
        self.assertFalse(alert.acknowledged)
        self.assertEqual(alert.level, "CRITICAL")
        self.assertIn("fall detected", alert.message)
        self.assertIn("SOS pressed", alert.message)

        # Second critical POST 5 seconds later should update the existing active alert, NOT flood
        critical_payload['timestamp'] = 205000
        critical_payload['heart_rate'] = 145.0
        res2 = self.client.post('/api/v1/vitals/', critical_payload, format='json')
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(Alert.objects.count(), 1)  # Still 1 alert, not 2!
        alert.refresh_from_db()
        self.assertIn("HR 145 bpm", alert.message)

        # Acknowledge the alert
        ack_res = self.client.post(f'/api/v1/alerts/{alert.id}/acknowledge/')
        self.assertEqual(ack_res.status_code, 200)
        self.assertTrue(ack_res.data['acknowledged'])

        # Now that it's acknowledged, a new breach triggers a fresh alert
        critical_payload['timestamp'] = 210000
        res3 = self.client.post('/api/v1/vitals/', critical_payload, format='json')
        self.assertEqual(res3.status_code, 201)
        self.assertEqual(Alert.objects.count(), 2)

    def test_alert_escalation_watch_to_critical(self):
        # 1. Patient triggers WATCH alert
        watch_payload = {
            "device_id": "ESP32_NODE_05",
            "heart_rate": 125.0,  # mild breach
            "spo2": 95.0,
            "temperature": 37.2,
            "motion_flag": False,
            "sos_pressed": False,
            "state": "WATCH",
            "timestamp": 1000
        }
        res1 = self.client.post('/api/v1/vitals/', watch_payload, format='json')
        self.assertEqual(res1.status_code, 201)
        self.assertEqual(Alert.objects.filter(patient__device_id="ESP32_NODE_05").count(), 1)
        alert = Alert.objects.get(patient__device_id="ESP32_NODE_05")
        self.assertEqual(alert.level, "WATCH")
        self.assertIn("HR 125 bpm", alert.message)

        # 2. Patient condition worsens to CRITICAL (e.g., fall + SOS)
        critical_payload = {
            "device_id": "ESP32_NODE_05",
            "heart_rate": 135.0,
            "spo2": 89.0,
            "temperature": 37.5,
            "motion_flag": True,
            "sos_pressed": True,
            "state": "CRITICAL",
            "timestamp": 6000
        }
        res2 = self.client.post('/api/v1/vitals/', critical_payload, format='json')
        self.assertEqual(res2.status_code, 201)
        # Total alert count for this patient should STILL be 1 (merged/escalated, NOT 2)
        self.assertEqual(Alert.objects.filter(patient__device_id="ESP32_NODE_05").count(), 1)
        alert.refresh_from_db()
        self.assertEqual(alert.level, "CRITICAL")
        self.assertIn("fall detected", alert.message)
        self.assertIn("SOS pressed", alert.message)

        # Patient active alert count in patient profile is 1
        p_res = self.client.get('/api/v1/patients/ESP32_NODE_05/')
        self.assertEqual(p_res.status_code, 200)
        self.assertEqual(p_res.data['active_alerts_count'], 1)


    def test_large_32bit_timestamp(self):
        # millis() past 2^31-1 (~25 days uptime)
        payload = {
            "device_id": "ESP32_NODE_01",
            "heart_rate": 72.0,
            "spo2": 99.0,
            "temperature": 36.7,
            "motion_flag": False,
            "sos_pressed": False,
            "state": "NORMAL",
            "timestamp": 3000000000  # > 2147483647
        }
        res = self.client.post('/api/v1/vitals/', payload, format='json')
        self.assertEqual(res.status_code, 201)

    def test_patient_list_and_vitals_by_id_and_device(self):
        # Ingest reading to create patient
        payload = {
            "device_id": "ESP32_NODE_01",
            "heart_rate": 80.0,
            "spo2": 97.0,
            "temperature": 36.8,
            "motion_flag": False,
            "sos_pressed": False,
            "state": "NORMAL",
            "timestamp": 100
        }
        self.client.post('/api/v1/vitals/', payload, format='json')
        patient = Patient.objects.get(device_id="ESP32_NODE_01")

        # GET /api/v1/patients/
        p_res = self.client.get('/api/v1/patients/')
        self.assertEqual(p_res.status_code, 200)
        self.assertEqual(len(p_res.data), 1)
        self.assertEqual(p_res.data[0]['latest_reading']['heart_rate'], 80.0)

        # GET /api/v1/patients/<int>/vitals/
        v_res1 = self.client.get(f'/api/v1/patients/{patient.id}/vitals/')
        self.assertEqual(v_res1.status_code, 200)
        self.assertEqual(len(v_res1.data), 1)

        # GET /api/v1/patients/<device_id>/vitals/
        v_res2 = self.client.get(f'/api/v1/patients/{patient.device_id}/vitals/')
        self.assertEqual(v_res2.status_code, 200)
        self.assertEqual(len(v_res2.data), 1)

    def test_patient_detail_by_id_and_device(self):
        patient = Patient.objects.create(name="Alice Doe", device_id="ESP32_NODE_99")

        # By numeric ID
        res1 = self.client.get(f'/api/v1/patients/{patient.id}/')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.data['name'], "Alice Doe")

        # By device ID
        res2 = self.client.get(f'/api/v1/patients/{patient.device_id}/')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data['name'], "Alice Doe")

        # Update name via PATCH
        res3 = self.client.patch(f'/api/v1/patients/{patient.id}/', {'name': 'Alice Smith'}, format='json')
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.data['name'], 'Alice Smith')

    def test_all_alerts_listing_and_filtering(self):
        patient = Patient.objects.create(name="Bob", device_id="ESP32_NODE_02")
        reading = VitalReading.objects.create(
            patient=patient, device_timestamp=1000, heart_rate=135,
            spo2=96, temperature=37.0, state="WATCH"
        )
        Alert.objects.create(patient=patient, reading=reading, level="WATCH", message="HR 135 bpm", acknowledged=False)
        Alert.objects.create(patient=patient, reading=reading, level="CRITICAL", message="SOS pressed", acknowledged=True)

        # GET all alerts
        res = self.client.get('/api/v1/alerts/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

        # Filter by ?acknowledged=false
        res_unack = self.client.get('/api/v1/alerts/?acknowledged=false')
        self.assertEqual(res_unack.status_code, 200)
        self.assertEqual(len(res_unack.data), 1)
        self.assertFalse(res_unack.data[0]['acknowledged'])

    def test_multi_patient_isolation_no_data_leak(self):
        # Patient 1 exists with 0 readings and 0 alerts
        patient1 = Patient.objects.create(name="Patient One", device_id="ESP32_NODE_01")
        # Patient 2 exists with readings and alerts
        patient2 = Patient.objects.create(name="Patient Two", device_id="ESP32_NODE_02")
        reading2 = VitalReading.objects.create(
            patient=patient2, device_timestamp=1000, heart_rate=80.0,
            spo2=98.0, temperature=36.7, state="NORMAL"
        )
        Alert.objects.create(patient=patient2, reading=reading2, level="WATCH", message="HR 80", acknowledged=False)

        # Querying Patient 1 MUST return empty (0 readings, 0 alerts) — NEVER leak Patient 2's data!
        res_v1 = self.client.get(f'/api/v1/patients/{patient1.id}/vitals/')
        self.assertEqual(res_v1.status_code, 200)
        self.assertEqual(len(res_v1.data), 0, "Patient 1 vitals must be empty, not leaked from Patient 2!")

        res_a1 = self.client.get(f'/api/v1/patients/{patient1.id}/alerts/')
        self.assertEqual(res_a1.status_code, 200)
        self.assertEqual(len(res_a1.data), 0, "Patient 1 alerts must be empty, not leaked from Patient 2!")

        # Querying Patient 2 correctly returns Patient 2's readings and alerts
        res_v2 = self.client.get(f'/api/v1/patients/{patient2.id}/vitals/')
        self.assertEqual(res_v2.status_code, 200)
        self.assertEqual(len(res_v2.data), 1)
        self.assertEqual(res_v2.data[0]['heart_rate'], 80.0)

        res_a2 = self.client.get(f'/api/v1/patients/{patient2.id}/alerts/')
        self.assertEqual(res_a2.status_code, 200)
        self.assertEqual(len(res_a2.data), 1)

    def test_single_node_prototype_fallback_when_only_one_patient_exists(self):
        # Clear all patients
        Alert.objects.all().delete()
        VitalReading.objects.all().delete()
        Patient.objects.all().delete()

        # Create single patient with arbitrary ID (e.g. 88)
        p = Patient.objects.create(id=88, name="Single Node Patient", device_id="ESP32_NODE_SINGLE")
        VitalReading.objects.create(
            patient=p, device_timestamp=500, heart_rate=72.0,
            spo2=99.0, temperature=36.6, state="NORMAL"
        )

        # In a single-node prototype, querying default '1' or 'latest' resolves the only active patient
        res_default = self.client.get('/api/v1/patients/1/vitals/')
        self.assertEqual(res_default.status_code, 200)
        self.assertEqual(len(res_default.data), 1)
        self.assertEqual(res_default.data[0]['heart_rate'], 72.0)

        res_latest = self.client.get('/api/v1/patients/latest/vitals/')
        self.assertEqual(res_latest.status_code, 200)
        self.assertEqual(len(res_latest.data), 1)

    def test_auth_login_endpoint(self):
        payload = {"email": "dr.mehta@caresense.io", "password": "password123", "role": "Doctor"}
        res = self.client.post('/api/v1/auth/login/', payload, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('token', res.data)
        self.assertEqual(res.data['user']['name'], 'Dr. Mehta')
        self.assertEqual(res.data['user']['role'], 'Doctor')

    def test_patient_thresholds_endpoint(self):
        p = Patient.objects.create(name="Rahul Sharma", device_id="ESP32_NODE_RS")
        res_get = self.client.get(f'/api/v1/patients/{p.id}/thresholds/')
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.data['thresholds']['hr_max'], 120)

        patch_payload = {"thresholds": {"hr_min": 55, "hr_max": 125, "spo2_min": 93, "temp_max": 38.0}}
        res_patch = self.client.patch(f'/api/v1/patients/{p.id}/thresholds/', patch_payload, format='json')
        self.assertEqual(res_patch.status_code, 200)
        self.assertEqual(res_patch.data['thresholds']['hr_max'], 125)


