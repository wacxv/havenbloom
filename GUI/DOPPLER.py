import asyncio
import threading
import tkinter as tk
from tkinter import ttk
from bleak import BleakClient
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from collections import deque
import time
import requests
import json

DEVICE_ADDRESS = "D0:F8:44:8F:7C:F5"
HR_CHAR_UUID = "00002a37-0000-1000-8000-00805f9b34fb"
DOPPLER_MQTT_TOPIC = "20heartbeat/bpm"

# API Configuration
API_BASE_URL = "http://localhost:3000"  # Local development
DEVICE_ID = "SMARTWATCH-001"
API_TIMEOUT = 5  # seconds

# MQTT Setup
mqtt_client = mqtt.Client(protocol=mqtt.MQTTv311, callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.connect("test.mosquitto.org", 1883, 60)
mqtt_client.loop_start()

# GUI Setup
root = tk.Tk()
root.title("Heartbeat Monitor")
root.geometry("900x600")
root.configure(bg="#e6e0ff")

# --- Styles ---
style = ttk.Style()
style.configure("TButton", font=("Segoe UI", 10), padding=6)
style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"))
style.configure("BPM.TLabel", font=("Segoe UI", 32, "bold"), foreground="#000000")
style.configure("Status.TLabel", font=("Segoe UI", 10), foreground="red")
style.configure("Connected.TLabel", font=("Segoe UI", 10), foreground="green")
style.configure("Patient.TLabel", font=("Segoe UI", 9), foreground="#0066cc")

# --- Left Panel ---
left_panel = tk.Frame(root, width=250, bg="#d6ccff")
left_panel.pack(side="left", fill="y")

tk.Label(left_panel, text="Device:", bg="#d6ccff", font=("Segoe UI", 10, "bold")).pack(pady=(20, 0))
device_label = ttk.Label(left_panel, text="Huawei Watch", font=("Segoe UI", 10), background="#d6ccff")
device_label.pack()

# Patient connection info
patient_info_frame = tk.Frame(left_panel, bg="#d6ccff")
patient_info_frame.pack(pady=(5, 0))

patient_status_label = ttk.Label(patient_info_frame, text="Patient: Checking...", 
                                style="Patient.TLabel", background="#d6ccff")
patient_status_label.pack()

refresh_patient_btn = ttk.Button(patient_info_frame, text="🔄 Refresh", width=15)
refresh_patient_btn.pack(pady=(2, 0))

connect_btn = ttk.Button(left_panel, text="Connect", width=20)
connect_btn.pack(pady=(10, 5))

status_label = ttk.Label(left_panel, text="Status: Disconnected", style="Status.TLabel", background="#d6ccff")
status_label.pack()

mqtt_status_label = ttk.Label(left_panel, text="MQTT: Connected", style="Connected.TLabel", background="#d6ccff")
mqtt_status_label.pack(pady=(0, 10))

bpm_frame = tk.LabelFrame(left_panel, text="Heart Rate", font=("Segoe UI", 10, "bold"), bg="#d6ccff")
bpm_frame.pack(pady=(20, 5), padx=10)
bpm_label = ttk.Label(bpm_frame, text="-- BPM", style="BPM.TLabel")
bpm_label.pack(padx=20, pady=10)

# --- Right Panel ---
right_panel = tk.Frame(root, bg="#e6e0ff")
right_panel.pack(fill="both", expand=True)
ttk.Label(right_panel, text="♥ Heart Rate Monitor (BPM)", style="Header.TLabel", background="#e6e0ff").pack(pady=10)

# --- Matplotlib Graph Setup ---
bpm_data = deque(maxlen=50)
time_data = deque(maxlen=50)
start_time = time.time()

fig, ax = plt.subplots(figsize=(6, 3))
line, = ax.plot([], [], color='red', linewidth=2)
ax.set_title("Live Heart Rate (BPM)")
ax.set_xlabel("Time (s)")
ax.set_ylabel("BPM")
ax.set_ylim(50, 180)
ax.grid(True)

canvas = FigureCanvasTkAgg(fig, master=right_panel)
canvas.draw()
canvas.get_tk_widget().pack(expand=True, fill='both')

def update_graph():
    if bpm_data:
        line.set_data(time_data, bpm_data)
        ax.set_xlim(max(0, time_data[0]), time_data[-1] + 1)
        ax.set_ylim(min(50, min(bpm_data) - 5), max(160, max(bpm_data) + 5))
        canvas.draw()
    root.after(1000, update_graph)

# --- API Functions ---
def get_auth_token():
    """Get authentication token for API requests"""
    try:
        url = f"{API_BASE_URL}/api/devices/test-token"
        response = requests.get(url, timeout=API_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            return data.get('token')
        return None
    except Exception as e:
        print(f"Error getting auth token: {e}")
        return None

def get_patient_info():
    """Fetch patient information from the API"""
    try:
        # Get authentication token first
        token = get_auth_token()
        if not token:
            return {'connected': False, 'patient_name': None, 'error': "Could not get auth token"}
        
        url = f"{API_BASE_URL}/api/devices/{DEVICE_ID}"
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Fetching patient info from: {url}")
        
        response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            print(f"API Response: {json.dumps(data, indent=2)}")
            
            if data.get('success') and data.get('data'):
                device_data = data['data']
                patient_id = device_data.get('patientId')
                
                if patient_id:
                    patient_name = "Unknown Patient"
                    
                    # Try to get patient name from populated data
                    if isinstance(patient_id, dict):
                        first_name = patient_id.get('first_name', '')
                        last_name = patient_id.get('last_name', '')
                        if first_name or last_name:
                            patient_name = f"{first_name} {last_name}".strip()
                    
                    return {
                        'connected': True,
                        'patient_name': patient_name,
                        'patient_id': patient_id.get('_id') if isinstance(patient_id, dict) else patient_id,
                        'connected_at': device_data.get('connectedAt')
                    }
                else:
                    return {'connected': False, 'patient_name': None}
            else:
                print("Device not found in API response")
                return {'connected': False, 'patient_name': None}
        else:
            print(f"API request failed with status: {response.status_code}")
            print(f"Response: {response.text}")
            return {'connected': False, 'patient_name': None, 'error': f"API Error: {response.status_code}"}
            
    except requests.exceptions.Timeout:
        print("API request timed out")
        return {'connected': False, 'patient_name': None, 'error': "API Timeout"}
    except requests.exceptions.ConnectionError:
        print("Failed to connect to API")
        return {'connected': False, 'patient_name': None, 'error': "Connection Error"}
    except Exception as e:
        print(f"Error fetching patient info: {e}")
        return {'connected': False, 'patient_name': None, 'error': str(e)}

def update_patient_info():
    """Update the patient info display"""
    def fetch_and_update():
        patient_info = get_patient_info()
        
        def update_ui():
            if patient_info['connected'] and patient_info['patient_name']:
                patient_status_label.config(
                    text=f"👤 Connected to: {patient_info['patient_name']}", 
                    foreground="green"
                )
            elif patient_info.get('error'):
                patient_status_label.config(
                    text=f"❌ {patient_info['error']}", 
                    foreground="red"
                )
            else:
                patient_status_label.config(
                    text="⚠️ No patient assigned", 
                    foreground="orange"
                )
        
        # Update UI in main thread
        root.after(0, update_ui)
    
    # Run API call in background thread
    threading.Thread(target=fetch_and_update, daemon=True).start()

def on_refresh_patient_click():
    """Handle refresh button click"""
    patient_status_label.config(text="🔄 Checking...", foreground="blue")
    update_patient_info()

# Bind refresh button
refresh_patient_btn.config(command=on_refresh_patient_click)

# --- BLE + MQTT Logic ---
client_connection = None
connected_flag = True

def log_bpm(message):
    bpm_label.config(text=f"{message} BPM")
    mqtt_client.publish(DOPPLER_MQTT_TOPIC, f"{message}")
    try:
        bpm = int(message)
        timestamp = round(time.time() - start_time, 1)
        bpm_data.append(bpm)
        time_data.append(timestamp)
    except ValueError:
        pass

def handle_hr_notify(sender, data):
    if len(data) >= 2:
        hr_value = data[1]
        log_bpm(hr_value)
    else:
        log_bpm("--")

async def connect_to_watch():
    global client_connection, connected_flag
    try:
        client_connection = BleakClient(DEVICE_ADDRESS)
        await client_connection.connect()
        if not client_connection.is_connected:
            status_label.config(text="❌ Connection failed", foreground="red")
            connect_btn.config(text="Connect")
            return

        status_label.config(text="✅ Connected", style="Connected.TLabel")
        connect_btn.config(text="Disconnect")
        await client_connection.start_notify(HR_CHAR_UUID, handle_hr_notify)

        while client_connection.is_connected and connected_flag:
            await asyncio.sleep(1)

        await client_connection.stop_notify(HR_CHAR_UUID)
        await client_connection.disconnect()
        status_label.config(text="🛑 Disconnected", foreground="orange")
        connect_btn.config(text="Connect")

    except Exception as e:
        status_label.config(text=f"⚠️ Error: {str(e)}", foreground="red")
        connect_btn.config(text="Connect")

def run_async_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(connect_to_watch())

def on_connect_disconnect_click():
    global connected_flag
    if connect_btn.cget("text") == "Connect":
        connected_flag = True
        connect_btn.config(text="Connecting...", state="disabled")
        status_label.config(text="🔌 Connecting...", foreground="orange")
        threading.Thread(target=run_async_loop, daemon=True).start()
        # Re-enable button after a short delay
        root.after(2000, lambda: connect_btn.config(state="normal"))
    else:
        connected_flag = False
        connect_btn.config(text="Disconnecting...", state="disabled")
        status_label.config(text="🔌 Disconnecting...", foreground="orange")
        # Re-enable button after a short delay
        root.after(2000, lambda: connect_btn.config(state="normal"))

connect_btn.config(command=on_connect_disconnect_click)

# --- Start Graph Update Loop + UI ---
update_graph()

# Initial patient info fetch
update_patient_info()

# Auto-refresh patient info every 30 seconds
def auto_refresh_patient():
    update_patient_info()
    root.after(30000, auto_refresh_patient)  # 30 seconds

root.after(30000, auto_refresh_patient)

def cleanup_and_exit():
    global connected_flag, client_connection
    try:
        # Stop the connection flag
        connected_flag = False
        
        # Disconnect from MQTT
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        
        # Disconnect from BLE device if connected
        if client_connection and client_connection.is_connected:
            asyncio.create_task(client_connection.disconnect())
        
        # Destroy the GUI
        root.destroy()
        
        # Force exit the entire application including command line
        import os
        os._exit(0)
        
    except Exception as e:
        # Force exit even if cleanup fails
        import os
        os._exit(0)

exit_btn = tk.Button(left_panel, text="Exit", bg="#ff6b6b", fg="white", font=("Segoe UI", 10), command=cleanup_and_exit)
exit_btn.pack(pady=(30, 5), ipadx=10)

try:
    root.mainloop()
except KeyboardInterrupt:
    print("\nProgram interrupted by user")
    cleanup_and_exit()
