const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Test token route (remove in production)
router.get('/test-token', async (req, res) => {
    const token = jwt.sign({ id: 'test-patient' }, process.env.JWT_SECRET);
    res.json({ token });
});

// Protected routes
router.get('/', authenticateToken, patientController.getAllPatients);
router.get('/user/:userId', authenticateToken, patientController.getPatientByUserId);
router.get('/:id', authenticateToken, patientController.getPatient);
router.post('/create', authenticateToken, patientController.createPatient);
router.put('/:id', authenticateToken, patientController.updatePatient);
router.delete('/:id', authenticateToken, patientController.deletePatient);


module.exports = router;
