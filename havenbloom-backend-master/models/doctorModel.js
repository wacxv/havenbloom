const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        enum: ['Dr.', 'Prof. Dr.', 'Assoc. Prof. Dr.']
    },
    first_name: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters']
    },
    last_name: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters']
    },
    specialization: {
        type: String,
        required: [true, 'Specialization is required'],
        trim: true
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        trim: true,
        enum: ['Male', 'Female', 'Other']
    },
    license_number: {
        type: String,
        required: [true, 'License number is required'],
        unique: true,
        validate: {
            validator: function(v) {
                return /^[A-Z0-9-]+$/.test(v);
            },
            message: 'Invalid license number format'
        }
    },
    contact_number: {
        type: String,
        required: [true, 'Contact number is required'],
        validate: {
            validator: function(v) {
                return /^[0-9]{11}$/.test(v);
            },
            message: 'Invalid phone number format. Must be 11 digits'
        }
    },
    schedule_info: {
        type: String,
        required: [true, 'Schedule information is required'],
        default: 'Mon-Fri 9:00AM - 5:00PM'
    },
    hospital_clinic: {
        type: String,
        required: false,
        trim: true,
        default: ''
    }
}, {
    collection: 'doctor_profile',
    timestamps: true
});

// Virtual for full name
doctorSchema.virtual('full_name').get(function() {
    return `${this.title} ${this.first_name} ${this.last_name}`;
});

// Ensure virtuals are included when document is converted to JSON
doctorSchema.set('toJSON', { virtuals: true });
doctorSchema.set('toObject', { virtuals: true });

const Doctor = mongoose.model('Doctor', doctorSchema);
module.exports = Doctor;