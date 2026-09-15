const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['doppler', 'smartwatch'],
        trim: true
    },
    patientId: { // Changed from assignedUserId to patientId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        default: null
    },
    connectedAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: false // Changed from true to false
    },
    lastDataReceived: {
        type: Date,
        default: null
    }
}, {
    collection: 'devices',
    timestamps: true
});

// Only define indexes here (not in field definitions)
deviceSchema.index({ type: 1 });
deviceSchema.index({ patientId: 1 }); // Changed from assignedUserId
deviceSchema.index({ isActive: 1 });

module.exports = mongoose.model('Device', deviceSchema);