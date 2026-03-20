import os
import json
import django
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv()


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("✅ Connected to MQTT Broker")
        client.subscribe("device/data", qos=1)
        print("📡 Subscribed to topic: device/data")
    else:
        print(f"❌ Connection failed with code {rc}")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        print(f"📥 Received message from topic: {msg.topic}")

        device_id = payload.get("device_id", "")
        driver_id = payload.get("driver", "")
        mac_address = payload.get("mac_address", "")
        timestamp = payload.get("timestamp")
        data_list = payload.get("data", [])

        # Import here to ensure Django is ready
        from devices.models import DeviceData

        records = []
        for item in data_list:
            records.append(DeviceData(
                device_id=device_id,
                driver_id=driver_id,
                mac_address=mac_address,
                timestamp=timestamp,
                offset_ms=item.get("offset_ms", 0),
                co2=item.get("co2", 0.0),
                ear=item.get("ear", 0.0),
                mar=item.get("mar", 0.0),
                gyro_x=item.get("gyro_x", 0.0),
            ))

        DeviceData.objects.bulk_create(records)
        print(f"💾 Saved {len(records)} records for device {device_id}")

        # Trigger prediction for this driver
        try:
            from devices.prediction_service import predict_for_driver
            predict_for_driver(driver_id)
        except Exception as e:
            print(f"⚠️ Prediction failed for {driver_id}: {e}")

    except json.JSONDecodeError:
        print(f"⚠️ Invalid JSON: {msg.payload}")
    except Exception as e:
        print(f"❌ Error processing message: {e}")


def start_mqtt_subscriber():
    broker_url = os.getenv("MQTT_BROKER_URL")
    broker_port = int(os.getenv("MQTT_BROKER_PORT", 8883))
    username = os.getenv("MQTT_BROKER_USERNAME")
    password = os.getenv("MQTT_BROKER_PASSWORD")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

    if username and password:
        client.username_pw_set(username, password)

    client.tls_set()

    client.on_connect = on_connect
    client.on_message = on_message

    print(f"🔌 Connecting to {broker_url}:{broker_port}...")
    client.connect(broker_url, broker_port, 60)
    client.loop_forever()
