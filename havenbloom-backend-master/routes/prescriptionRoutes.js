const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken'); // Add this line

// Add test token route
router.get('/test-token', (req, res) => {
    const token = jwt.sign({ id: 'test-prescription' }, process.env.JWT_SECRET);
    res.json({ token });
});

router.get('/', authenticateToken, prescriptionController.getAllPrescriptions);
router.get('/:id', authenticateToken, prescriptionController.getPrescription);
router.post('/create', authenticateToken, prescriptionController.createPrescription);
router.put('/:id', authenticateToken, prescriptionController.updatePrescription);

module.exports = router;