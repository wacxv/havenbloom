import asyncio
import threading
import tkinter as tk
from tkinter import ttk
from bleak import BleakClient, BleakScanner
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from collections import deque
import time
import requests
import json

# Global device address set after dropdown selection
DEVICE_ADDRESS = None
HR_CHAR_UUID = "00002a37-0000-1000-8000-00805f9b34fb"
SMARTWATCH_MQTT_TOPIC = "69heartrate/bpm"

# API Configuration
API_BASE_URL = "http://localhost:3000"
DEVICE_ID = "SMARTWATCH-001"
API_TIMEOUT = 5

# MQTT Setup
mqtt_client = mqtt.Client(protocol=mqtt.MQTTv311, callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.connect("test.mosquitto.org", 1883, 60)
mqtt_client.loop_start()

# GUI Setup
root = tk.Tk()
root.title("Heartbeat Monitor")
root.geometry("900x600")
root.configure(bg="#e6e0ff")

style = ttk.Style()
style.configure("TButton", font=("Segoe UI", 10), padding=6)
style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"))
style.configure("BPM.TLabel", font=("Segoe UI", 32, "bold"), foreground="#000000")
style.configure("Status.TLabel", font=("Segoe UI", 10), foreground="red")
style.configure("Connected.TLabel", font=("Segoe UI", 10), foreground="green")
style.configure("Patient.TLabel", font=("Segoe UI", 9), foreground="#0066cc")
# New styles for improved device selection
style.configure("DeviceTitle.TLabel", font=("Segoe UI", 11, "bold"), foreground="#333333")
style.configure("DeviceName.TLabel", font=("Segoe UI", 12, "bold"), foreground="#2c5282")
style.configure("DeviceAddress.TLabel", font=("Segoe UI", 8), foreground="#666666")
style.configure("ScanButton.TButton", font=("Segoe UI", 9))

left_panel = tk.Frame(root, width=250, bg="#d6ccff")
left_panel.pack(side="left", fill="y")

# Improved Device Selection Section
device_selection_frame = tk.LabelFrame(left_panel, text="🔹 BLE Device Selection", 
                                     font=("Segoe UI", 10, "bold"), bg="#d6ccff", 
                                     relief="groove", borderwidth=2)
device_selection_frame.pack(fill="x", padx=10, pady=(10, 15))

# Device dropdown with improved styling
device_dropdown_frame = tk.Frame(device_selection_frame, bg="#d6ccff")
device_dropdown_frame.pack(fill="x", padx=8, pady=(8, 5))

tk.Label(device_dropdown_frame, text="Available Devices:", bg="#d6ccff", 
         font=("Segoe UI", 9, "bold")).pack(anchor="w")

device_combobox = ttk.Combobox(device_dropdown_frame, width=28, state="readonly", 
                              font=("Segoe UI", 9))
device_combobox.pack(fill="x", pady=(2, 5))

# Scan button with icon
scan_devices_btn = ttk.Button(device_dropdown_frame, text="🔍 Scan for Devices", 
                             style="ScanButton.TButton")
scan_devices_btn.pack(fill="x")

# Enhanced Device Info Display
device_info_frame = tk.Frame(device_selection_frame, bg="#d6ccff")
device_info_frame.pack(fill="x", padx=8, pady=(5, 8))

# Device status indicator
device_status_frame = tk.Frame(device_info_frame, bg="#d6ccff")
device_status_frame.pack(fill="x", pady=(0, 3))

device_status_indicator = tk.Label(device_status_frame, text="⚪", font=("Segoe UI", 12), bg="#d6ccff")
device_status_indicator.pack(side="left")

device_status_text = tk.Label(device_status_frame, text="No device selected", 
                             font=("Segoe UI", 8), bg="#d6ccff", fg="#666666")
device_status_text.pack(side="left", padx=(5, 0))

# Selected device name (dynamic)
device_name_label = ttk.Label(device_info_frame, text="Select a device", 
                             style="DeviceName.TLabel", background="#d6ccff")
device_name_label.pack(anchor="w")

# Device address (smaller text)
device_address_label = ttk.Label(device_info_frame, text="", 
                                style="DeviceAddress.TLabel", background="#d6ccff")
device_address_label.pack(anchor="w")

patient_info_frame = tk.Frame(left_panel, bg="#d6ccff")
patient_info_frame.pack(pady=(5, 0))

patient_status_label = ttk.Label(patient_info_frame, text="Patient: Checking...", style="Patient.TLabel", background="#d6ccff")
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

right_panel = tk.Frame(root, bg="#e6e0ff")
right_panel.pack(fill="both", expand=True)
ttk.Label(right_panel, text="♥ Heart Rate Monitor (BPM)", style="Header.TLabel", background="#e6e0ff").pack(pady=10)

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

# New function to update device display
def update_device_display():
    selected_device = device_combobox.get()
    if selected_device and hasattr(device_combobox, 'address_map') and selected_device in device_combobox.address_map:
        # Extract device name (remove address part)
        device_name = selected_device.split(' - ')[0]
        device_address = device_combobox.address_map[selected_device]
        
        # Update displays
        device_name_label.config(text=device_name if device_name != "Unknown" else "Unnamed Device")
        device_address_label.config(text=f"Address: {device_address}")
        device_status_indicator.config(text="🔵", fg="#2c5282")
        device_status_text.config(text="Device selected", fg="#2c5282")
        
        # Enable connect button
        connect_btn.config(state="normal")
    else:
        device_name_label.config(text="Select a device")
        device_address_label.config(text="")
        device_status_indicator.config(text="⚪", fg="#666666")
        device_status_text.config(text="No device selected", fg="#666666")
        
        # Disable connect button if not connected
        if connect_btn.cget("text") == "Connect":
            connect_btn.config(state="disabled")

# Bind combobox selection event
def on_device_selection(event):
    update_device_display()

device_combobox.bind('<<ComboboxSelected>>', on_device_selection)

def get_auth_token():
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
    try:
        token = get_auth_token()
        if not token:
            return {'connected': False, 'patient_name': None, 'error': "Could not get auth token"}
        url = f"{API_BASE_URL}/api/devices/{DEVICE_ID}"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            device_data = data['data']
            patient_id = device_data.get('patientId')
            if patient_id:
                patient_name = "Unknown Patient"
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
        return {'connected': False, 'patient_name': None}
    except Exception as e:
        print(f"Error fetching patient info: {e}")
        return {'connected': False, 'patient_name': None, 'error': str(e)}

def update_patient_info():
    def fetch_and_update():
        patient_info = get_patient_info()
        def update_ui():
            if patient_info['connected'] and patient_info['patient_name']:
                patient_status_label.config(text=f"👤 Connected to: {patient_info['patient_name']}", foreground="green")
            elif patient_info.get('error'):
                patient_status_label.config(text=f"❌ {patient_info['error']}", foreground="red")
            else:
                patient_status_label.config(text="⚠️ No patient assigned", foreground="orange")
        root.after(0, update_ui)
    threading.Thread(target=fetch_and_update, daemon=True).start()

def on_refresh_patient_click():
    patient_status_label.config(text="🔄 Checking...", foreground="blue")
    update_patient_info()

refresh_patient_btn.config(command=on_refresh_patient_click)

client_connection = None
connected_flag = True

def log_bpm(message):
    bpm_label.config(text=f"{message} BPM")
    mqtt_client.publish(SMARTWATCH_MQTT_TOPIC, f"{message}")
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
    global client_connection, connected_flag, DEVICE_ADDRESS
    selected_device = device_combobox.get()
    if not selected_device or not hasattr(device_combobox, 'address_map') or selected_device not in device_combobox.address_map:
        status_label.config(text="❌ No device selected", foreground="red")
        connect_btn.config(text="Connect")
        # Update device status
        device_status_indicator.config(text="🔴", fg="red")
        device_status_text.config(text="Connection failed", fg="red")
        return
        
    DEVICE_ADDRESS = device_combobox.address_map[selected_device]
    try:
        # Update device status to connecting
        device_status_indicator.config(text="🟡", fg="orange")
        device_status_text.config(text="Connecting...", fg="orange")
        
        client_connection = BleakClient(DEVICE_ADDRESS)
        await client_connection.connect()
        if not client_connection.is_connected:
            status_label.config(text="❌ Connection failed", foreground="red")
            connect_btn.config(text="Connect")
            device_status_indicator.config(text="🔴", fg="red")
            device_status_text.config(text="Connection failed", fg="red")
            return
            
        status_label.config(text="✅ Connected", style="Connected.TLabel")
        connect_btn.config(text="Disconnect")
        # Update device status to connected
        device_status_indicator.config(text="🟢", fg="green")
        device_status_text.config(text="Connected", fg="green")
        
        await client_connection.start_notify(HR_CHAR_UUID, handle_hr_notify)
        while client_connection.is_connected and connected_flag:
            await asyncio.sleep(1)
        await client_connection.stop_notify(HR_CHAR_UUID)
        await client_connection.disconnect()
        status_label.config(text="🚑 Disconnected", foreground="orange")
        connect_btn.config(text="Connect")
        # Update device status back to selected
        device_status_indicator.config(text="🔵", fg="#2c5282")
        device_status_text.config(text="Device selected", fg="#2c5282")
    except Exception as e:
        status_label.config(text=f"⚠️ Error: {str(e)}", foreground="red")
        connect_btn.config(text="Connect")
        device_status_indicator.config(text="🔴", fg="red")
        device_status_text.config(text="Connection error", fg="red")

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
        root.after(2000, lambda: connect_btn.config(state="normal"))
    else:
        connected_flag = False
        connect_btn.config(text="Disconnecting...", state="disabled")
        status_label.config(text="🔌 Disconnecting...", foreground="orange")
        root.after(2000, lambda: connect_btn.config(state="normal"))

connect_btn.config(command=on_connect_disconnect_click)

# Improved scan function with better UI feedback
def scan_ble_devices():
    scan_devices_btn.config(text="🔄 Scanning...", state="disabled")
    device_status_indicator.config(text="🔄", fg="orange")
    device_status_text.config(text="Scanning for devices...", fg="orange")
    
    async def perform_scan():
        try:
            devices = await BleakScanner.discover(timeout=5.0)
            device_list = [f"{d.name or 'Unknown'} - {d.address}" for d in devices]
            address_map = {f"{d.name or 'Unknown'} - {d.address}": d.address for d in devices}
            
            def update_dropdown():
                device_combobox['values'] = device_list
                device_combobox.address_map = address_map
                
                if device_list:
                    device_combobox.current(0)
                    update_device_display()  # Update display with first device
                else:
                    device_status_indicator.config(text="⚪", fg="#666666")
                    device_status_text.config(text="No devices found", fg="#666666")
                    
                scan_devices_btn.config(text="🔍 Scan for Devices", state="normal")
                
            root.after(0, update_dropdown)
        except Exception as e:
            print(f"BLE scan error: {e}")
            def update_error():
                scan_devices_btn.config(text="🔍 Scan for Devices", state="normal")
                device_status_indicator.config(text="🔴", fg="red")
                device_status_text.config(text="Scan failed", fg="red")
            root.after(0, update_error)
            
    threading.Thread(target=lambda: asyncio.run(perform_scan()), daemon=True).start()

scan_devices_btn.config(command=scan_ble_devices)

# Initialize with disabled connect button
connect_btn.config(state="disabled")

# Initial scan
scan_ble_devices()

update_graph()
update_patient_info()

def auto_refresh_patient():
    update_patient_info()
    root.after(30000, auto_refresh_patient)

root.after(30000, auto_refresh_patient)

def cleanup_and_exit():
    global connected_flag, client_connection
    try:
        connected_flag = False
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        if client_connection and client_connection.is_connected:
            asyncio.create_task(client_connection.disconnect())
        root.destroy()
        import os
        os._exit(0)
    except Exception as e:
        import os
        os._exit(0)

exit_btn = tk.Button(left_panel, text="Exit", bg="#ff6b6b", fg="white", font=("Segoe UI", 10), command=cleanup_and_exit)
exit_btn.pack(pady=(30, 5), ipadx=10)

try:
    root.mainloop()
except KeyboardInterrupt:
    cleanup_and_exit()
