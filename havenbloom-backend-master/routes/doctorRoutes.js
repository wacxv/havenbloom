const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Test token generation (remove in production)
router.get('/test-token', async (req, res) => {
    const token = jwt.sign({ id: 'test-doctor' }, process.env.JWT_SECRET);
    res.json({ token });
});

// Protected routes
router.get('/', authenticateToken, doctorController.getAllDoctors);
router.get('/user/:userId', authenticateToken, doctorController.getDoctorByUserId);
router.get('/:id', authenticateToken, doctorController.getDoctor);
router.post('/create', authenticateToken, doctorController.createDoctor);
router.put('/:id', authenticateToken, doctorController.updateDoctor);
router.delete('/:id', authenticateToken, doctorController.deleteDoctor);


module.exports = router;
