const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken'); // Add this line

// Test token generation (remove in production)
router.get('/test-token', async (req, res) => {
    const token = jwt.sign({ id: 'test-assignment' }, process.env.JWT_SECRET);
    res.json({ token });
});
router.get('/doctor/:doctorId', authenticateToken, assignmentController.getAssignmentsByDoctor);
router.get('/patient/:patientId', authenticateToken, assignmentController.getAssignmentsByPatient);

router.get('/', authenticateToken, assignmentController.getAllAssignments);
router.get('/:id', authenticateToken, assignmentController.getAssignment);
router.post('/create', authenticateToken, assignmentController.createAssignment);
router.put('/:id', authenticateToken, assignmentController.updateAssignment);
router.delete('/delete/:id', authenticateToken, assignmentController.deleteAssignment);

module.exports = router;