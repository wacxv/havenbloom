const Assignment = require('../models/assignmentModel');

// Get all assignments with populated doctor and patient info
const getAllAssignments = async (req, res) => {
    try {
        const assignments = await Assignment.find()
            .populate('doctor_id', 'title first_name last_name specialization')
            .populate('patient_id', 'first_name last_name');

        const formattedAssignments = assignments.map(assignment => ({
            ...assignment.toJSON(),
            doctor_name: assignment.doctor_id
                ? `${assignment.doctor_id.title} ${assignment.doctor_id.first_name} ${assignment.doctor_id.last_name}`
                : 'Unknown',
            patient_name: assignment.patient_id
                ? `${assignment.patient_id.first_name} ${assignment.patient_id.last_name}`
                : 'Unknown'
        }));

        res.status(200).json(formattedAssignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get assignment by ID
const getAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('doctor_id', 'title first_name last_name specialization')
            .populate('patient_id', 'first_name last_name');

        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        res.status(200).json({
            ...assignment.toJSON(),
            doctor_name: assignment.doctor_id
                ? `${assignment.doctor_id.title} ${assignment.doctor_id.first_name} ${assignment.doctor_id.last_name}`
                : 'Unknown',
            patient_name: assignment.patient_id
                ? `${assignment.patient_id.first_name} ${assignment.patient_id.last_name}`
                : 'Unknown'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create assignment
const createAssignment = async (req, res) => {
    try {
        const { doctor_id, patient_id, notes } = req.body;

        const assignment = await Assignment.create({
            doctor_id,
            patient_id,
            assigned_at: new Date(),
            status: 'active',
            notes
        });

        res.status(201).json(assignment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update assignment status/notes
const updateAssignment = async (req, res) => {
    try {
        const { status, notes } = req.body;

        const assignment = await Assignment.findByIdAndUpdate(
            req.params.id,
            { status, notes },
            { new: true, runValidators: true }
        );

        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        res.status(200).json(assignment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete assignment
const deleteAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findByIdAndDelete(req.params.id);

        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        res.status(200).json({
            message: 'Assignment deleted successfully',
            deletedAssignment: assignment
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get assignments by doctor ID (with patient info)
const getAssignmentsByDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params;

        const assignments = await Assignment.find({ doctor_id: doctorId })
            .populate('patient_id', 'first_name last_name');

        const formattedAssignments = assignments.map(assignment => ({
            ...assignment.toJSON(),
            patient_name: assignment.patient_id
                ? `${assignment.patient_id.first_name} ${assignment.patient_id.last_name}`
                : 'Unknown'
        }));

        res.status(200).json(formattedAssignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get assignments by patient ID (with doctor info)
const getAssignmentsByPatient = async (req, res) => {
    try {
        const { patientId } = req.params;

        const assignments = await Assignment.find({ patient_id: patientId })
            .populate('doctor_id', 'title first_name last_name specialization');

        const formattedAssignments = assignments.map(assignment => ({
            ...assignment.toJSON(),
            doctor_name: assignment.doctor_id
                ? `${assignment.doctor_id.title} ${assignment.doctor_id.first_name} ${assignment.doctor_id.last_name}`
                : 'Unknown'
        }));

        res.status(200).json(formattedAssignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllAssignments,
    getAssignment,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentsByDoctor,
    getAssignmentsByPatient
};
