# HavenBloom

HavenBloom is a thesis project for a pregnancy-focused telemedicine platform. It connects pregnant patients with doctors through secure profiles, appointments, messaging, video consultations, prescriptions, device management, and live fetal and maternal heart-rate monitoring.

This thesis project was developed in collaboration with [mavcay](https://github.com/mavcay).

The project is organized as three connected applications:

- `havenbloom-frontend-main`: React 19 client built with Vite
- `havenbloom-backend-master`: Node.js and Express API backed by MongoDB
- `GUI`: Python BLE monitoring tools for heart-rate devices

## Core Capabilities

### Patient and doctor care

- Patient registration and authentication
- Separate patient, doctor, and administrator sign-in flows
- Role-based access through JWT authentication
- Patient and doctor profile management
- Doctor-to-patient assignment
- Appointment scheduling and calendar views
- Secure patient-doctor messaging
- Prescription creation and management
- Browser-based video consultations
- Password reset through email OTP verification

### Remote monitoring

- Link and manage monitoring devices
- Receive fetal heart-rate and watch heart-rate readings
- Collect watch heart-rate readings through Bluetooth Low Energy (BLE)
- Provide desktop monitoring tools for Doppler and smartwatch workflows
- Stream live readings through WebSocket connections
- Receive device data through MQTT
- View heart-rate history, summaries, minimums, maximums, and averages
- Store selected health data and messages with application-level encryption
- Upload and retrieve fetal audio through MongoDB GridFS

### Administration

- Create doctor accounts
- Assign patients to doctors
- Manage administrative accounts and user data

## Architecture

```text
React + Vite frontend
        |
        | REST API, Socket.IO, WebSocket
        v
Express backend ---- MongoDB / GridFS
        |
        +---- MQTT device listener
        +---- OTP email service

Python BLE monitoring GUI
        |
        +---- Bluetooth heart-rate device
        +---- MQTT BPM publishing
        +---- REST device association lookup
```

The backend exposes REST resources under `/api`, uses Socket.IO for messaging and call signaling, and exposes a WebSocket endpoint at `/ws` for live monitoring data. The Python GUI reads heart-rate notifications from BLE devices and publishes BPM values to MQTT. The backend receives those readings before they are persisted and broadcast to connected clients.

## Technology Stack

### Frontend

- React 19
- Vite
- React Router
- Axios and Fetch API
- Bootstrap and React Bootstrap
- Chart.js
- Socket.IO Client
- Native WebSocket client
- MQTT client
- Framer Motion

### Backend

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT and bcrypt authentication
- Socket.IO
- WebSocket (`ws`)
- MQTT
- Nodemailer for OTP email
- Multer and GridFS for file uploads
- CryptoJS for application-level encryption

### Monitoring GUI

- Python
- Tkinter
- Bleak for Bluetooth Low Energy
- Matplotlib
- Requests
- Paho MQTT

## Repository Structure

```text
.
├── havenbloom-backend-master/
│   ├── app.js                  # Express, Socket.IO, and WebSocket entry point
│   ├── db.js                   # MongoDB connection
│   ├── controllers/            # Request and business logic
│   ├── middleware/             # JWT and socket authentication
│   ├── models/                 # Mongoose schemas and encrypted fields
│   ├── routes/                 # REST API routes
│   ├── services/               # MQTT and WebSocket services
│   └── utils/                  # GridFS upload helpers
├── havenbloom-frontend-main/
│   ├── src/App.jsx             # Client routes and layouts
│   ├── src/components/         # Auth, home, calendar, messages, analytics, and care views
│   ├── src/contexts/           # Authentication state
│   └── public/                 # Static frontend assets
└── GUI/
        ├── DOPPLER.py              # Fixed-address BLE heart-rate monitor
        ├── SMARTWATCH.py           # BLE scanning and smartwatch monitor
        ├── DOPPLER-GUI/            # Packaged Doppler GUI output
        ├── SMARTWATCH-GUI/         # Packaged smartwatch GUI output
        └── README.md               # GUI setup and operation guide
```

## Prerequisites

- Node.js 18 or later
- npm
- A MongoDB database
- SMTP credentials for password-reset OTPs
- An MQTT broker if live device readings are being tested
- A Windows laptop or desktop with Bluetooth support for the monitoring GUI
- Python 3.10 or later if running the GUI source files instead of the packaged executable

The HavenBloom web application can be opened in a modern browser, including on mobile devices. Direct BLE device connection is handled by the separate Windows desktop GUI because the packaged GUI executable communicates with the heart-rate devices over Bluetooth and forwards readings through MQTT.

### Mobile Access and Live Monitoring

Users can open HavenBloom on a mobile device to view previously recorded heart-rate readings and other health information. However, mobile-only use does not provide live heart-rate monitoring in the current implementation. Live readings require a Windows laptop or desktop running the Doppler or smartwatch GUI executable. The GUI connects to the BLE device and forwards the readings through MQTT and the backend, after which authorized users can view the live data from the web application on either a desktop or mobile browser.

## Local Setup

Clone or open the project, then install dependencies in each application.

### 1. Backend

```bash
cd havenbloom-backend-master
npm install
node app.js
```

The backend listens on `http://localhost:3000` by default.

### 2. Frontend

In a second terminal:

```bash
cd havenbloom-frontend-main
npm install
npm run dev
```

Vite prints the local frontend URL, normally `http://localhost:5173`.

The frontend currently uses the deployed API URL in several components and falls back to localhost in selected local-development paths. When running the full system locally, update the API base URLs or centralize them in a frontend environment variable before testing all workflows.

### 3. Monitoring GUI

For the packaged Windows version, launch the executable inside `DOPPLER-GUI/` or `SMARTWATCH-GUI/` on a Bluetooth-enabled laptop or desktop. The packaged GUI is the intended way to connect the monitoring devices.

For development, install the Python dependencies in a third terminal and run one of the source monitors:

```bash
cd GUI
pip install bleak paho-mqtt matplotlib requests
python SMARTWATCH.py
```

Use `python DOPPLER.py` when the BLE device address is already configured. See [GUI/README.md](GUI/README.md) for device setup, configuration, troubleshooting, and packaged Windows application details.

## Backend Environment Variables

Create `havenbloom-backend-master/.env` with values appropriate for the environment:

```dotenv
PORT=3000
MONGODB_URI=mongodb://localhost:27017/havenbloom
JWT_SECRET=replace-with-a-long-random-secret
MESSAGE_SECRET=replace-with-a-long-random-message-key
DEVICE_SECRET=replace-with-a-long-random-device-key
EMAIL_USER=your-smtp-account@example.com
EMAIL_PASS=your-smtp-password-or-app-password
MQTT_URL=wss://test.mosquitto.org:8081
FETAL_AUDIO_URI=mongodb://localhost:27017/fetal_audio
```

`MONGODB_URI`, `JWT_SECRET`, `MESSAGE_SECRET`, and `DEVICE_SECRET` are required for the corresponding backend features. Do not commit `.env` files or production secrets.

## API Overview

The API is available under the following route groups:

| Route | Purpose |
| --- | --- |
| `/api/users` | Registration, login, and user accounts |
| `/api/admins` | Administrator operations |
| `/api/doctors` | Doctor profiles and operations |
| `/api/patients` | Patient profiles and operations |
| `/api/appointments` | Appointment scheduling and management |
| `/api/assignments` | Doctor-patient assignments |
| `/api/messages` | Patient-doctor messages |
| `/api/prescriptions` | Prescription management |
| `/api/devices` | Device linking and management |
| `/api/fetal-heart-rate` | Fetal heart-rate data |
| `/api/watch-heart-rate` | Watch heart-rate data |
| `/api/audio` | Fetal audio and GridFS operations |
| `/api/otp` | Password-reset OTP workflow |
| `/api/websocket` | WebSocket-related API operations |

For exploratory API testing, use Postman or another REST client. Authenticated endpoints generally require a JWT bearer token.

## Realtime Channels

- **REST:** standard account, profile, appointment, assignment, prescription, device, and health-data operations
- **Socket.IO:** messaging rooms and video-call signaling events
- **WebSocket:** live BPM readings at `ws://localhost:3000/ws`
- **MQTT:** device-reading ingestion configured through `MQTT_URL`
- **BLE GUI:** local device collection through `GUI/DOPPLER.py` or `GUI/SMARTWATCH.py`

## Available Scripts

### Frontend

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

### Backend

```bash
node app.js        # Start the API server
```

## Deployment

The backend is configured for deployment at:

```text
https://havenbloom-api.onrender.com
```

The frontend can be built with `npm run build` and deployed to a static hosting provider such as Vercel. Production deployments should use environment-specific API URLs, restrict CORS and Socket.IO origins to trusted clients, use TLS for all connections, and keep all secrets in the hosting provider's secret manager.

## Thesis Scope

HavenBloom demonstrates how a telemedicine platform can combine routine pregnancy care with remote physiological monitoring. Its main research and engineering concerns are:

- Improving continuity of communication between patients and healthcare providers
- Making remote fetal and maternal monitoring available through connected devices
- Connecting BLE heart-rate devices to the telemedicine monitoring workflow
- Presenting live and historical readings in a clinician-friendly interface
- Protecting authentication credentials, messages, and health data
- Coordinating asynchronous care workflows such as assignments, appointments, prescriptions, and consultations

## Security and Privacy Notes

This project handles sensitive health-related information. Before production or clinical use, perform a formal security and privacy review covering authentication, authorization, input validation, secret management, encryption key rotation, audit logging, retention policies, consent, and applicable healthcare regulations. Replace permissive development CORS settings and test credentials before deployment.

## Status

HavenBloom is a thesis project and is provided for academic development and evaluation. It should not be treated as a certified medical device or as a substitute for professional medical advice.
