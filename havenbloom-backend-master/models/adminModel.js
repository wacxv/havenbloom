const mongoose = require('mongoose');

// Ladner Bayot
const adminSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: 'Administrator'
    },
    gender: {
        type: String,
        required: [false, 'Gender is required'],
        enum: ['Male', 'Female', 'Other']
    },
    department: {
        type: String,
        required: false

    },
    contact_number: {
        type: String,
        required: true
    },
    admin_level: {
        type: String,
        required: true,
        enum: ['super_admin', 'admin', 'moderator'],
        default: 'admin'
    }
}, {
    collection: 'admin_profile',
    timestamps: true
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;