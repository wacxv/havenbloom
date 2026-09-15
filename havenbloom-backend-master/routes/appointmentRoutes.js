// filepath: d:\Academic Files\Thesis\Thesis Applications\havenbloom-backend\routes\appointmentRoutes.js
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Test token route
router.get('/test-token', (req, res) => {
    const token = jwt.sign({ id: 'test-appointment' }, process.env.JWT_SECRET);
    res.json({ token });
});

// Get all appointments
router.get('/', authenticateToken, appointmentController.getAllAppointments);

// Get doctor's appointments
router.get('/doctor/:doctorId', authenticateToken, appointmentController.getDoctorAppointments);

// Get patient's appointments
router.get('/patient/:patientId', authenticateToken, appointmentController.getPatientAppointments);

// Create new appointment
router.post('/create', authenticateToken, appointmentController.createAppointment);

// Update appointment status
router.patch('/:id', authenticateToken, appointmentController.updateAppointmentStatus);

// Delete appointment
router.delete('/:id', authenticateToken, appointmentController.deleteAppointment);

router.patch('/:id/availability', authenticateToken, appointmentController.updateAppointmentAvailability);
module.exports = router;