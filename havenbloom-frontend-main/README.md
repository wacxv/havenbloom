# HavenBloom Frontend

The HavenBloom frontend is a React application for a pregnancy-focused telemedicine platform. It provides patients, doctors, and administrators with a shared interface for remote care, communication, appointments, prescriptions, and health monitoring.

This application is the frontend portion of the HavenBloom thesis project. The backend API is located in the sibling `havenbloom-backend-master` directory.

## Features

- Patient registration and sign-in
- Doctor and administrator sign-in flows
- Password recovery with OTP verification
- Patient and doctor profiles
- Patient-doctor assignments
- Appointment scheduling with calendar views
- Real-time messaging
- Browser-based video consultations
- Fetal and watch heart-rate analytics
- Live BPM updates through WebSocket connections
- Device linking and device management
- Doctor creation and patient assignment tools for administrators
- Responsive navigation and toast notifications

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Patient sign-in |
| `/signup` | Patient registration |
| `/doctor-signin` | Doctor sign-in |
| `/admin-signin` | Administrator sign-in |
| `/forgot-password` | Password recovery |
| `/home` | Main dashboard |
| `/calendar` | Appointments and scheduling |
| `/messages` | Patient-doctor messaging |
| `/videocall` | Video consultation |
| `/Analytics` | Heart-rate analytics and monitoring |
| `/link-device` | Device linking and management |
| `/profile` | User profile |
| `/home/create-doctor` | Create a doctor account |
| `/home/assign-patient` | Assign a patient to a doctor |

## Technology Stack

- React 19
- Vite
- React Router
- Axios and Fetch API
- Bootstrap and React Bootstrap
- Chart.js and React Chart.js 2
- Socket.IO Client
- Native WebSocket client
- MQTT client
- Framer Motion
- React Hook Form
- React Datepicker and React Big Calendar

## Project Structure

```text
src/
├── App.jsx                  # Application routes and layouts
├── main.jsx                 # React entry point
├── contexts/
│   └── AuthContext.jsx      # Authentication state
├── components/
│   ├── Analytics/           # Heart-rate charts and live monitoring
│   ├── Calendar/            # Appointment calendar
│   ├── Header/              # Main navigation
│   ├── Home/                # Dashboard
│   ├── LinkDevice/          # Device management
│   ├── Messages/            # Real-time messaging
│   ├── Profile/             # Profile management
│   ├── SignIn/              # Patient, doctor, and admin sign-in
│   ├── SignUp/              # Registration
│   └── Videocall/           # Video consultation
├── pages/admin/             # Administrator workflows
└── services/
	└── socketService.js     # Socket.IO client integration
```

## Prerequisites

- Node.js 18 or later
- npm
- The HavenBloom backend running locally or access to the deployed API

## Installation and Development

The application is normally available at `http://localhost:5173`.

The frontend currently connects to `https://havenbloom-api.onrender.com` in several components and uses `http://localhost:3000` for selected local-development paths. When running the backend locally, verify the API and WebSocket URLs used by the relevant component before testing the complete application.

## Available Scripts

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build in dist/
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

The `server` and `dev:all` scripts refer to `backend/server.js`, which is not part of this frontend directory. Run the backend separately from `havenbloom-backend-master` with:

```bash
cd ../havenbloom-backend-master
npm install
node app.js
```

## Backend Integration

The client consumes backend resources for:

- Authentication and user accounts: `/api/users`
- Profiles: `/api/patients`, `/api/doctors`, and `/api/admins`
- Appointments: `/api/appointments`
- Doctor-patient assignments: `/api/assignments`
- Messages: `/api/messages`
- Prescriptions: `/api/prescriptions`
- Devices: `/api/devices`
- Fetal heart rate: `/api/fetal-heart-rate`
- Watch heart rate: `/api/watch-heart-rate`
- Password OTP: `/api/otp`

Socket.IO supports messaging and video-call signaling. The native WebSocket connection is used for live heart-rate readings at `/ws`.

## Deployment with Vercel

The frontend was hosted on Vercel. The repository includes [`vercel.json`](vercel.json), which rewrites client-side routes to the React entry point so routes such as `/home`, `/calendar`, and `/messages` continue to work after a page refresh.

To deploy the frontend with Vercel:

1. Import the `havenbloom-frontend-main` directory as a Vercel project.
2. Use the following build settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

3. Deploy the project.

For a local production check, run:

```bash
npm run build
npm run preview
```

The deployed frontend must use HTTPS, `wss://` for secure WebSocket connections, and an API URL that matches the deployed backend at `https://havenbloom-api.onrender.com`.

## Related Project

See the root project README for the complete HavenBloom architecture, backend environment variables, API overview, deployment notes, and thesis scope.

