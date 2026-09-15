
---

# HavenBloom Backend

**HavenBloom** is a telemedicine platform designed specifically for pregnant women, enabling seamless communication, consultation, and healthcare management between patients and OB-GYN doctors.

This is the backend service of the HavenBloom web application, built with Node.js and Express.js, structured in a modular way using controllers, models, and routes.

---

## 📁 Project Structure

The backend consists of 8 key components:

| Component      | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `admin`        | Manages admin accounts and privileges.                                 |
| `appointment`  | Handles the creation and management of doctor-patient appointments.    |
| `assignment`   | Manages the assignment of doctors to patients.                         |
| `doctor`       | Handles doctor account and profile information.                        |
| `message`      | Manages messaging functionality between patients and doctors.          |
| `patient`      | Handles patient profiles and accounts.                                 |
| `prescription` | Enables doctors to issue and manage patient prescriptions.             |
| `user`         | Manages all user accounts (admin, doctor, patient) in a unified model. |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mavcay/havenbloom-backend.git
cd havenbloom-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
node app.js
# or if using nodemon
nodemon app.js
```

---

## 📮 API Testing

You can test the backend using **Postman** or any REST client:

```bash
http://localhost:3000/api/<route>
```

For example:

* `/api/patients`
* `/api/doctors`
* `/api/appointments`

---

## 🌐 Live API

The backend is deployed and accessible via Render:

```bash
https://havenbloom-api.onrender.com
```

Use this base URL when integrating the frontend or testing externally.

---

## 🛠 Tech Stack

* **Node.js** + **Express.js**
* **MongoDB** (via Mongoose)
* **Postman** for testing APIs
* **Render** for deployment

---

## 📌 Notes

* Ensure your `.env` file contains the proper DB connection and configuration (if applicable).
* CORS and body-parsing middleware are enabled for frontend integration.

---

