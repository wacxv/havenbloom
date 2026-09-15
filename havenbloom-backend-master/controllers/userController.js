const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const Patient = require('../models/patientModel');
const Admin = require('../models/adminModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Update last login
        user.last_login = Date.now();
        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Register user with profile creation
const registerUser = async (req, res) => {
    try {
        const { email, password, role, profile_data } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user account
        const user = await User.create({
            email,
            password,
            role
        });

        // Create corresponding profile based on role
        let profile;
        if (role === 'doctor') {
            profile = await Doctor.create({
                user_id: user._id,
                title: profile_data.title,
                first_name: profile_data.first_name,
                last_name: profile_data.last_name,
                specialization: profile_data.specialization,
                gender: profile_data.gender,
                license_number: profile_data.license_number,
                contact_number: profile_data.contact_number,
                schedule_info: profile_data.schedule_info,
                hospital_clinic: profile_data.hospital_clinic
            });
        } else if (role === 'patient') {
            profile = await Patient.create({
                user_id: user._id,
                first_name: req.body.profile_data.first_name,
                last_name: req.body.profile_data.last_name,
                birth_date: req.body.profile_data.birth_date,
                address: req.body.profile_data.address,
                contact_number: req.body.profile_data.contact_number,
                blood_type: req.body.profile_data.blood_type,
                medical_history: req.body.profile_data.medical_history,
                allergies: req.body.profile_data.allergies,
                emergency_contact: req.body.profile_data.emergency_contact,
                insurance: req.body.profile_data.insurance,
                profile_pic: req.body.profile_data.profile_pic
            });
        } else if (role === 'admin') {
            profile = await Admin.create({
                user_id: user._id,
                first_name: profile_data.first_name,
                last_name: profile_data.last_name,
                contact_number: profile_data.contact_number
            });
        }

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            },
            profile
        });
    } catch (error) {
        // If error occurs, cleanup any created documents
        if (error && req.body.email) {
            await User.findOneAndDelete({ email: req.body.email });
        }
        res.status(400).json({ error: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const { email, password, role, profile_data } = req.body;

        // Create user account
        const user = new User({
            email,
            password,
            role
        });

        const savedUser = await user.save();

        // Create corresponding profile based on role
        let profile;
        switch (role) {
            case 'doctor':
                profile = new Doctor({
                    user_id: savedUser._id,
                    ...profile_data
                });
                break;
            case 'patient':
                profile = new Patient({
                    user_id: savedUser._id,
                    ...profile_data
                });
                break;
            case 'admin':
                profile = new Admin({
                    user_id: savedUser._id,
                    ...profile_data
                });
                break;
            default:
                throw new Error('Invalid role specified');
        }

        const savedProfile = await profile.save();

        res.status(201).json({
            user: savedUser,
            profile: savedProfile
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(400).json({ error: error.message });
    }
};

// Update user password
const updatePassword = async (req, res) => {
    try {
        const { email, oldPassword, newPassword } = req.body;

        if (!email || !oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Email, old password, and new password are required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Old password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update password by ID
const updatePasswordById = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.params.id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Old password and new password are required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Old password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    loginUser,
    registerUser,
    createUser,
    updatePassword,
    updatePasswordById,
    getUserById
};