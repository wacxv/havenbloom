const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    first_name: {
        type: String,
        required: true,
        trim: true
    },
    last_name: {
        type: String,
        required: true,
        trim: true
    },
    birth_date: {
        type: Date,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    contact_number: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{11}$/.test(v);
            },
            message: 'Invalid phone number format'
        }
    },
    blood_type: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    medical_history: {
        type: String,
        default: ''
    },
    allergies: {
        type: [String],
        default: []
    },
    emergency_contact: {
        name: { type: String, default: '' },
        relationship: { type: String, default: '' },
        contact_number: { type: String, default: '' }
    },
    insurance: {
        type: String,
        default: ''
    },
    profile_pic: {
        type: String,
        default: 'default-patient.png'
    }
}, {
    collection: 'patient_profile',
    timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema);