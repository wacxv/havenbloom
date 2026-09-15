const Appointment = require('../models/appointmentModel');

// Get all appointments
const getAllAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('doctor_id', 'title first_name last_name specialization')
            .populate('patient_id', 'first_name last_name');

        const formattedAppointments = appointments.map(appointment => {
            const doctorData = appointment.doctor_id ? {
                _id: appointment.doctor_id._id,
                title: appointment.doctor_id.title,
                first_name: appointment.doctor_id.first_name,
                last_name: appointment.doctor_id.last_name,
                specialization: appointment.doctor_id.specialization,
                full_name: `${appointment.doctor_id.title} ${appointment.doctor_id.first_name} ${appointment.doctor_id.last_name}`,
                id: appointment.doctor_id._id
            } : null;

            const patientData = appointment.patient_id ? {
                _id: appointment.patient_id._id,
                first_name: appointment.patient_id.first_name,
                last_name: appointment.patient_id.last_name,
                full_name: `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`,
                id: appointment.patient_id._id
            } : null;

            return {
                _id: appointment._id,
                doctor_id: doctorData,
                patient_id: patientData,
                appointment_date: appointment.appointment_date,
                description: appointment.description,
                status: appointment.status,
                is_available: appointment.is_available,
                createdAt: appointment.createdAt,
                updatedAt: appointment.updatedAt,
                __v: appointment.__v
            };
        });

        res.status(200).json(formattedAppointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get appointments by doctor ID
const getDoctorAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctor_id: req.params.doctorId })
            .populate({
                path: 'patient_id',
                select: 'first_name last_name',
                model: 'Patient'
            });

        const formattedAppointments = appointments.map(appointment => {
            const appointmentObj = appointment.toJSON();
            
            if (appointment.patient_id) {
                const { first_name, last_name } = appointment.patient_id;
                appointmentObj.patient_name = `${first_name} ${last_name}`;
                appointmentObj.patient_id = {
                    ...appointment.patient_id,
                    full_name: appointmentObj.patient_name
                };
            } else {
                appointmentObj.patient_name = 'Unknown';
            }

            return appointmentObj;
        });

        res.status(200).json(formattedAppointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get appointments by patient ID
const getPatientAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ patient_id: req.params.patientId })
            .populate({
                path: 'doctor_id',
                select: 'title first_name last_name specialization',
                model: 'Doctor'
            });

        const formattedAppointments = appointments.map(appointment => {
            const appointmentObj = appointment.toJSON();
            
            if (appointment.doctor_id) {
                const { title, first_name, last_name } = appointment.doctor_id;
                appointmentObj.doctor_name = `${title} ${first_name} ${last_name}`;
                appointmentObj.doctor_id = {
                    ...appointment.doctor_id,
                    full_name: appointmentObj.doctor_name
                };
            } else {
                appointmentObj.doctor_name = 'Unknown';
            }

            return appointmentObj;
        });

        res.status(200).json(formattedAppointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create new appointment
const createAppointment = async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date, description, is_available } = req.body;

        // Check for existing appointment at the same time
        const existingAppointment = await Appointment.findOne({
            doctor_id,
            appointment_date,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(400).json({ error: 'Time slot already booked' });
        }

        const appointment = new Appointment({
            patient_id,
            doctor_id,
            appointment_date,
            description,
            is_available: typeof is_available === 'boolean' ? is_available : false
        });

        const savedAppointment = await appointment.save();
        res.status(201).json(savedAppointment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Invalid status. Must be one of: pending, confirmed, cancelled, completed' 
            });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.status(200).json(appointment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndDelete(req.params.id);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        res.status(200).json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update appointment availability
const updateAppointmentAvailability = async (req, res) => {
    try {
        const { is_available } = req.body;
        
        if (typeof is_available !== 'boolean') {
            return res.status(400).json({ error: 'is_available must be a boolean value' });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { is_available },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.status(200).json(appointment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAllAppointments,
    getDoctorAppointments,
    getPatientAppointments,
    createAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    updateAppointmentAvailability
};