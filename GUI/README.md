# HavenBloom Monitoring GUI

This folder contains the Python desktop monitoring tools used by the HavenBloom thesis project to collect and display live heart-rate data from Bluetooth Low Energy devices.

The tools provide a hardware-facing companion to the HavenBloom web application:

- `DOPPLER.py`: connects to a configured BLE heart-rate device address.
- `SMARTWATCH.py`: scans for nearby BLE devices and lets the operator select one.

Both tools display a live BPM chart, check the HavenBloom backend for the device's assigned patient, and publish readings to MQTT for backend ingestion.

## Features

- Bluetooth Low Energy heart-rate monitoring
- Live BPM display and Matplotlib chart
- Patient-device association lookup through the HavenBloom API
- MQTT publishing on the `20heartbeat/bpm` Doppler topic or `69heartrate/bpm` smartwatch topic
- Background BLE, API, and MQTT operations to keep the Tkinter interface responsive
- Automatic patient-information refresh every 30 seconds
- Connect, disconnect, and exit controls
- BLE device scanning in the smartwatch monitor

## Data Flow

```text
BLE heart-rate device
        |
        v
Python monitoring GUI
   |              |
   |              +---- GET /api/devices/{deviceId}
   |                         |
   |                         v
   |                    HavenBloom backend
   |
   +---- MQTT: 69heartrate/bpm
                         |
                         v
                    MQTT listener
                         |
                         v
                    Health monitoring data
```

The applications currently use:

- Backend API: `http://localhost:3000`
- Device token endpoint: `/api/devices/test-token`
- Device lookup endpoint: `/api/devices/SMARTWATCH-001`
- MQTT broker: `test.mosquitto.org:1883`
- Doppler MQTT topic: `20heartbeat/bpm`
- Smartwatch MQTT topic: `69heartrate/bpm`
- BLE heart-rate characteristic: `00002a37-0000-1000-8000-00805f9b34fb`

## Prerequisites

- Windows computer with Bluetooth support
- Python 3.10 or later recommended
- A compatible BLE heart-rate device or smartwatch
- The HavenBloom backend running locally on port `3000`
- Internet access for the configured MQTT broker

On Windows, allow the Python application to use Bluetooth and keep the BLE device discoverable or paired before connecting.

## Python Dependencies

Install the required packages from a terminal in this directory:

```bash
pip install bleak paho-mqtt matplotlib requests
```

Tkinter is included with most standard Windows Python installations. If Python was installed without Tcl/Tk support, reinstall Python with the Tcl/Tk option enabled.

## Running the Monitors

Start the fixed-device monitor:

```bash
python DOPPLER.py
```

Start the device-scanning smartwatch monitor:

```bash
python SMARTWATCH.py
```

Start the backend separately before launching either GUI:

```bash
cd ../havenbloom-backend-master
npm install
node app.js
```

Do not run both GUI programs against the same device at the same time unless the BLE device supports multiple connections.

## Choosing the Correct Tool

### `DOPPLER.py`

Use this version when the BLE device address is known and stable. The address is configured near the top of the file:

```python
DEVICE_ADDRESS = "D0:F8:44:8F:7C:F5"
```

Replace that value with the address of the target device before running the program.

### `SMARTWATCH.py`

Use this version when the device address may change or when the operator needs to choose from nearby devices. Click **Scan for Devices**, select a device, and then connect.

## Device and API Configuration

The scripts currently use these constants:

```python
API_BASE_URL = "http://localhost:3000"
DEVICE_ID = "SMARTWATCH-001"
API_TIMEOUT = 5
```

Update `API_BASE_URL` when using a deployed backend. The `DEVICE_ID` must match the device record registered in the HavenBloom backend so the GUI can display the assigned patient.

The current implementation obtains a development token from `/api/devices/test-token`. Replace this development flow with authenticated operator credentials before production or clinical use.

## Generated Windows Applications

`DOPPLER-GUI/` and `SMARTWATCH-GUI/` contain packaged Windows application output, including bundled Python dependencies and runtime files. The original `.py` files remain the source implementations.

For development and troubleshooting, run the `.py` files directly. Packaged GUI folders can be launched using the executable produced by the packaging process, if present in the folder.

## Troubleshooting

- **No devices found:** confirm Bluetooth is enabled, the device is nearby, and it is not connected to another application.
- **Connection failed:** confirm the selected address and that the BLE device exposes the standard heart-rate characteristic.
- **Patient not assigned:** confirm `SMARTWATCH-001` exists in the backend and has a patient association.
- **API errors:** start the backend on port `3000` or update `API_BASE_URL`.
- **MQTT errors:** verify internet access and that the configured broker is reachable.
- **No chart values:** confirm that the device is connected and sending notifications through the heart-rate characteristic.

## Security and Safety Notes

The MQTT broker and development token endpoint in these scripts are intended for project testing. They are not appropriate defaults for production healthcare data. Use authenticated, encrypted MQTT connections, protected API credentials, restricted device access, and a broker controlled by the deployment environment before handling real patient data.

The GUI is a monitoring aid for the thesis project and is not a certified medical device or a substitute for professional medical assessment.
