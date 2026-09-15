import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Profile.css';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'https://havenbloom-api.onrender.com'  // Development
  : 'https://havenbloom-api.onrender.com';  // Production

const Profile = () => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        role: '',
        profile_data: {
            first_name: '',
            last_name: '',
            birth_date: '',
            address: '',
            contact_number: '',
            blood_type: '',
            medical_history: '',
            title: '',
            specialization: '',
            hospital_clinic: '',
            license_number: '',
            emergency_contact: {
                name: '',
                relationship: '',
                contact_number: ''
            },
            allergies: [],
            insurance: ''
        }
    });

    const [isEditing, setIsEditing] = useState(false);
    const [changePassword, setChangePassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [profile, setProfile] = useState(null);
    const navigate = useNavigate();

    // Load user from localStorage
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            if (!storedUser._id && storedUser.id) {
                storedUser._id = storedUser.id;
            }
            setUser(storedUser);
            setUserRole(storedUser.role);

            const initialData = {
                email: storedUser.email || '',
                role: storedUser.role || '',
                profile_data: {
                    first_name: storedUser.first_name || '',
                    last_name: storedUser.last_name || '',
                    birth_date: storedUser.birth_date || storedUser.date_of_birth || '',
                    address: storedUser.address || '',
                    contact_number: storedUser.contact_number || storedUser.phone || '',
                    blood_type: storedUser.blood_type || '',
                    medical_history: storedUser.medical_history || '',
                    title: storedUser.title || '',
                    specialization: storedUser.specialization || '',
                    hospital_clinic: storedUser.hospital || '',
                    license_number: storedUser.license_number || '',
                    emergency_contact: typeof storedUser.emergency_contact === 'object' && storedUser.emergency_contact 
                        ? storedUser.emergency_contact 
                        : { name: '', relationship: '', contact_number: '' },
                    allergies: storedUser.allergies || [],
                    insurance: storedUser.insurance || ''
                }
            };

            setFormData(initialData);
        } else {
            navigate('/signin');
        }
    }, [navigate]);

    // ✅ Unified profile fetch based on user ID
    useEffect(() => {
        const fetchProfileByUserId = async () => {
            if (!user || !user._id || !userRole) return;

            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('token');
                let response;

                if (userRole === 'patient') {
                    response = await axios.get(`${API_BASE_URL}/api/patients/user/${user._id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } else if (userRole === 'doctor') {
                    response = await axios.get(`${API_BASE_URL}/api/doctors/user/${user._id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }

                const profileData = response.data;
                setProfile(profileData);

                setFormData(prev => ({
                    ...prev,
                    email: profileData.email || prev.email,
                    profile_data: {
                        ...prev.profile_data,
                        first_name: profileData.first_name ?? prev.profile_data.first_name ?? '',
                        last_name: profileData.last_name ?? prev.profile_data.last_name ?? '',
                        birth_date: profileData.birth_date ?? prev.profile_data.birth_date ?? '',
                        address: profileData.address ?? prev.profile_data.address ?? '',
                        contact_number: profileData.contact_number ?? prev.profile_data.contact_number ?? '',
                        blood_type: profileData.blood_type ?? prev.profile_data.blood_type ?? '',
                        medical_history: profileData.medical_history ?? prev.profile_data.medical_history ?? '',
                        title: profileData.title ?? prev.profile_data.title ?? '',
                        specialization: profileData.specialization ?? prev.profile_data.specialization ?? '',
                        hospital_clinic: profileData.hospital_clinic ?? prev.profile_data.hospital_clinic ?? '',
                        license_number: profileData.license_number ?? prev.profile_data.license_number ?? '',
                        emergency_contact: typeof profileData.emergency_contact === 'object' && profileData.emergency_contact
                            ? profileData.emergency_contact
                            : { name: '', relationship: '', contact_number: '' },
                        allergies: profileData.allergies ?? prev.profile_data.allergies ?? [],
                        insurance: profileData.insurance ?? prev.profile_data.insurance ?? ''
                    }
                }));

            } catch (err) {
                
            } finally {
                setLoading(false);
            }
        };

        fetchProfileByUserId();
    }, [user, userRole]);

    // Fetch patient info using _id
    const fetchPatientById = async (patientId) => {
        console.log('Fetching patient with _id:', patientId); // Debugging log
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await axios.get(`${API_BASE_URL}/api/patients/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setProfile(response.data);
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(`Failed to load patient data: ${errorMessage}`);
            console.error('Error fetching patient:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Fetch patient info using user_id
    const fetchPatientByUserId = async (userId) => {
        console.log('Fetching patient with user_id:', userId); // Debugging log
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await axios.get(`${API_BASE_URL}/api/patients/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setProfile(response.data);
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(`Failed to load patient data: ${errorMessage}`);
            console.error('Error fetching patient by user_id:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // New effect to fetch and set patient profile directly
    useEffect(() => {
        const fetchPatientProfile = async () => {
            // Only fetch patient profile if userRole === 'patient'
            if (userRole === 'patient' && user && user.user_id) {
                setLoading(true);
                setError(null);
                try {
                    const token = localStorage.getItem('token');
                    // 1. Fetch patient by user_id
                    const response = await axios.get(
                        `${API_BASE_URL}/api/patients/user/${user.user_id}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    setProfile(response.data);

                    // 2. Optionally update formData for editing
                    setFormData(prev => ({
                        ...prev,
                        email: response.data.email || prev.email,
                        profile_data: {
                            ...prev.profile_data,
                            ...response.data
                        }
                    }));

                    // 3. If you need the patient _id for updates, use response.data._id
                    // Example: setPatientId(response.data._id);

                } catch (err) {
                    setError('Failed to load patient profile: ' + (err.response?.data?.message || err.message));
                } finally {
                    setLoading(false);
                }
            } else if (userRole === 'doctor' && user && user.user_id) {
                setLoading(true);
                setError(null);
                try {
                    const token = localStorage.getItem('token');
                    // Fetch doctor by user_id
                    const response = await axios.get(
                        `${API_BASE_URL}/api/doctors/user/${user.user_id}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    setProfile(response.data);

                    // Optionally update formData for editing
                    setFormData(prev => ({
                        ...prev,
                        email: response.data.email || prev.email,
                        profile_data: {
                            ...prev.profile_data,
                            ...response.data
                        }
                    }));

                } catch (err) {
                    setError('Failed to load doctor profile: ' + (err.response?.data?.message || err.message));
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchPatientProfile();
    }, [user, userRole]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Handle emergency contact nested fields
        if (name.startsWith('emergency_contact_')) {
            const field = name.replace('emergency_contact_', '');
            setFormData(prev => ({
                ...prev,
                profile_data: {
                    ...prev.profile_data,
                    emergency_contact: {
                        ...prev.profile_data.emergency_contact,
                        [field]: value
                    }
                }
            }));
        }
        // Handle nested profile_data fields
        else if (name.includes('_') || name === 'address' || name === 'allergies' || 
            name === 'specialization' || name === 'title' || name === 'insurance') {
            setFormData(prev => ({
                ...prev,
                profile_data: {
                    ...prev.profile_data,
                    [name]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('token');
            let endpoint;
            if (userRole === 'doctor') {
                // Use the doctor's document _id, not the user _id
                endpoint = `/api/doctors/${profile?._id || user._id}`;
            } else if (userRole === 'patient') {
                endpoint = `/api/patients/${profile?._id}`;
            } else {
                throw new Error('Unknown user role');
            }

            const apiData = {
                email: formData.email,
                first_name: formData.profile_data.first_name,
                last_name: formData.profile_data.last_name,
                phone: formData.profile_data.contact_number,
                address: formData.profile_data.address,
                date_of_birth: formData.profile_data.birth_date
            };

            if (userRole === 'doctor') {
                apiData.specialization = formData.profile_data.specialization;
                apiData.hospital_clinic = formData.profile_data.hospital_clinic;
                apiData.title = formData.profile_data.title;
                apiData.license_number = formData.profile_data.license_number;
            } else if (userRole === 'patient') {
                apiData.emergency_contact = formData.profile_data.emergency_contact;
                apiData.blood_type = formData.profile_data.blood_type;
                // Convert allergies string to array if needed
                apiData.allergies = Array.isArray(formData.profile_data.allergies)
                    ? formData.profile_data.allergies
                    : formData.profile_data.allergies
                        .split(',')
                        .map(item => item.trim())
                        .filter(Boolean);
                apiData.medical_history = formData.profile_data.medical_history;
                apiData.insurance = formData.profile_data.insurance;
            }

            const response = await axios.put(`${API_BASE_URL}${endpoint}`, apiData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Update local storage
            const updatedUser = { ...user, ...response.data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            setSuccess('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('token');
            // Use the most reliable user ID
            const userId = user?.user_id || user?._id || user?.id;
            if (!userId) throw new Error('User ID not found');

            const endpoint = `/api/users/${userId}/password`;

            await axios.patch(`${API_BASE_URL}${endpoint}`, {
                oldPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setSuccess('Password updated successfully!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setChangePassword(false);
        } catch (err) {
            console.error('Error changing password:', err);
            // Custom error message for wrong current password
            if (err.response?.status === 401 || err.response?.data?.message?.toLowerCase().includes('incorrect')) {
                setError('Wrong current password. Please try again.');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to change password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const getFullName = () => {
        if (profile) {
            return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Patient Name';
        }
        return `${formData.profile_data.first_name || ''} ${formData.profile_data.last_name || ''}`.trim() || 'Patient Name';
    };

    return (
        <div className="profile-page">
            <div className="main-content">
                {/* Header with title and user info */}
                <div className="dashboard-header">
                    <h1 className="dashboard-title">My Profile</h1>
                    <div className="user-profile">
                        <div className="user-info">
                            <h4 className="patient-name">{getFullName()}</h4>
                            <p className="patient-email">{profile?.email || formData.email || "patient-name@gmail.com"}</p>
                        </div>
                        <div className="profile-avatar-small"></div>
                    </div>
                </div>

                {/* Show success/error messages */}
                {loading && <div className="status-message loading">Loading profile information...</div>}
                {error && <div className="status-message error">{error}</div>}
                {success && <div className="status-message success">{success}</div>}

                {/* Profile Card */}
                <div className="profile-card">
                    {isEditing ? (
                        // Edit Profile Form
                        <div className="edit-profile-form">
                            <h2>Edit Profile</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-section">
                                    <div className="form-group">
                                        <label htmlFor="first_name">First Name</label>
                                        <input
                                            type="text"
                                            id="first_name"
                                            name="first_name"
                                            value={formData.profile_data.first_name || ''}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="last_name">Last Name</label>
                                        <input
                                            type="text"
                                            id="last_name"
                                            name="last_name"
                                            value={formData.profile_data.last_name || ''}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="email">Email</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email || ''}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="contact_number">Phone Number</label>
                                        <input
                                            type="tel"
                                            id="contact_number"
                                            name="contact_number"
                                            value={formData.profile_data.contact_number || ''}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="address">Address</label>
                                        <textarea
                                            id="address"
                                            name="address"
                                            value={formData.profile_data.address || ''}
                                            onChange={handleChange}
                                            rows="3"
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="birth_date">Date of Birth</label>
                                        <input
                                            type="date"
                                            id="birth_date"
                                            name="birth_date"
                                            value={formData.profile_data.birth_date ? formData.profile_data.birth_date.substring(0, 10) : ''}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    {/* Doctor-specific fields */}
                                    {userRole === 'doctor' && (
                                        <>
                                            <div className="form-group">
                                                <label htmlFor="title">Title</label>
                                                <input
                                                    type="text"
                                                    id="title"
                                                    name="title"
                                                    value={formData.profile_data.title || ''}
                                                    onChange={handleChange}
                                                    placeholder="Dr."
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="specialization">Specialization</label>
                                                <input
                                                    type="text"
                                                    id="specialization"
                                                    name="specialization"
                                                    value={formData.profile_data.specialization || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="hospital_clinic">Hospital/Clinic</label>
                                                <input
                                                    type="text"
                                                    id="hospital_clinic"
                                                    name="hospital_clinic"
                                                    value={formData.profile_data.hospital_clinic || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="license_number">License Number</label>
                                                <input
                                                    type="text"
                                                    id="license_number"
                                                    name="license_number"
                                                    value={formData.profile_data.license_number || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Patient-specific fields */}
                                    {userRole === 'patient' && (
                                        <>
                                            <div className="form-group">
                                                <label htmlFor="emergency_contact_name">Emergency Contact Name</label>
                                                <input
                                                    type="text"
                                                    id="emergency_contact_name"
                                                    name="emergency_contact_name"
                                                    value={formData.profile_data.emergency_contact?.name || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter contact name"
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="emergency_contact_relationship">Relationship</label>
                                                <select
                                                    id="emergency_contact_relationship"
                                                    name="emergency_contact_relationship"
                                                    value={formData.profile_data.emergency_contact?.relationship || ''}
                                                    onChange={handleChange}
                                                    required
                                                >
                                                    <option value="">Select relationship</option>
                                                    <option value="Mother">Mother</option>
                                                    <option value="Father">Father</option>
                                                    <option value="Spouse">Spouse</option>
                                                    <option value="Sibling">Sibling</option>
                                                    <option value="Child">Child</option>
                                                    <option value="Relative">Relative</option>
                                                    <option value="Friend">Friend</option>
                                                    <option value="Guardian">Guardian</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="emergency_contact_contact_number">Emergency Contact Phone</label>
                                                <input
                                                    type="tel"
                                                    id="emergency_contact_contact_number"
                                                    name="emergency_contact_contact_number"
                                                    value={formData.profile_data.emergency_contact?.contact_number || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter contact phone number"
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="blood_type">Blood Type</label>
                                                <select
                                                    id="blood_type"
                                                    name="blood_type"
                                                    value={formData.profile_data.blood_type || ''}
                                                    onChange={handleChange}
                                                >
                                                    <option value="">Select Blood Type</option>
                                                    <option value="A+">A+</option>
                                                    <option value="A-">A-</option>
                                                    <option value="B+">B+</option>
                                                    <option value="B-">B-</option>
                                                    <option value="AB+">AB+</option>
                                                    <option value="AB-">AB-</option>
                                                    <option value="O+">O+</option>
                                                    <option value="O-">O-</option>
                                                </select>
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="insurance">Insurance</label>
                                                <input
                                                    type="text"
                                                    id="insurance"
                                                    name="insurance"
                                                    value={formData.profile_data.insurance || ''}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="allergies">Allergies</label>
                                                <textarea
                                                    id="allergies"
                                                    name="allergies"
                                                    value={
                                                        Array.isArray(formData.profile_data.allergies)
                                                            ? formData.profile_data.allergies.join(', ')
                                                            : formData.profile_data.allergies || ''
                                                    }
                                                    onChange={e => {
                                                        // Just update as a string, don't split yet
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            profile_data: {
                                                                ...prev.profile_data,
                                                                allergies: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    rows="3"
                                                    placeholder="Enter allergies separated by commas"
                                                />
                                            </div>
                                            
                                            <div className="form-group">
                                                <label htmlFor="medical_history">Medical History</label>
                                                <textarea
                                                    id="medical_history"
                                                    name="medical_history"
                                                    value={formData.profile_data.medical_history || ''}
                                                    onChange={handleChange}
                                                    rows="5"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="form-buttons">
                                    <button 
                                        type="button" 
                                        className="cancel-btn"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="save-btn"
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : changePassword ? (
                        // Change Password Form
                        <div className="change-password-form">
                            <h2>Change Password</h2>
                            <form onSubmit={handlePasswordSubmit}>
                                <div className="form-group">
                                    <label htmlFor="currentPassword">Current Password</label>
                                    <input
                                        type="password"
                                        id="currentPassword"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="newPassword">New Password</label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="confirmPassword">Confirm New Password</label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>

                                <div className="form-buttons">
                                    <button 
                                        type="button" 
                                        className="cancel-btn"
                                        onClick={() => setChangePassword(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="save-btn"
                                        disabled={loading}
                                    >
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        // Profile Display - New UI based on the image
                        <>
                            {/* Profile header with large avatar and name */}
                            <div className="profile-header">
                                <div className="profile-avatar-large"></div>
                                <div className="profile-name-container">
                                    <h2 className="profile-name">{getFullName()}</h2>
                                    <p className="profile-email">{profile?.email || formData.email || "patient-name@gmail.com"}</p>
                                </div>
                            </div>
                            
                            <div className="profile-actions">
                                <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                                    Edit Profile
                                </button>
                                <button className="change-password-btn" onClick={() => setChangePassword(true)}>
                                    Change Password
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="profile-divider"></div>

                            {/* Two column layout for information */}
                            <div className="profile-info-columns">
                                {/* Personal Information Column */}
                                <div className="info-column">
                                    <h3 className="column-title">Personal Information</h3>
                                    <div className="info-item">
                                        <span className="info-label">Name:</span>
                                        <span className="info-value">{getFullName()}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Email:</span>
                                        <span className="info-value">{profile?.email || formData.email || "Not provided"}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Phone:</span>
                                        <span className="info-value">{profile?.contact_number || formData.profile_data.contact_number || "Not provided"}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Address:</span>
                                        <span className="info-value">{profile?.address || formData.profile_data.address || "Not provided"}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Date of Birth:</span>
                                        <span className="info-value">
                                            {profile?.birth_date
                                                ? new Date(profile.birth_date).toLocaleDateString()
                                                : (formData.profile_data.birth_date
                                                    ? new Date(formData.profile_data.birth_date).toLocaleDateString()
                                                    : "Not provided")}
                                        </span>
                                    </div>
                                </div>

                                {/* Medical Information Column (or Professional for doctors) */}
                                <div className="info-column">
                                    <h3 className="column-title">
                                        {userRole === 'doctor' ? 'Professional Information' : 'Medical Information'}
                                    </h3>
                                    
                                    {userRole === 'doctor' ? (
                                        // Doctor-specific info
                                        <>
                                            <div className="info-item">
                                                <span className="info-label">Title:</span>
                                                <span className="info-value">{profile?.title || formData.profile_data.title || "Not provided"}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Specialization:</span>
                                                <span className="info-value">{profile?.specialization || formData.profile_data.specialization || "Not provided"}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Hospital/Clinic:</span>
                                                <span className="info-value">{profile?.hospital_clinic || formData.profile_data.hospital_clinic || "Not provided"}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">License Number:</span>
                                                <span className="info-value">{profile?.license_number || formData.profile_data.license_number || "Not provided"}</span>
                                            </div>
                                        </>
                                    ) : (
                                        // Patient-specific info
                                        <>
                                            <div className="info-item">
                                                <span className="info-label">Blood Type:</span>
                                                <span className="info-value">{profile?.blood_type || formData.profile_data.blood_type || "Not provided"}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Emergency Contact:</span>
                                                <span className="info-value">
                                                    {(() => {
                                                        const ec = profile?.emergency_contact || formData.profile_data.emergency_contact;
                                                        if (!ec) return "Not provided";
                                                        if (typeof ec === "object") {
                                                            // If it's an array, join all contacts
                                                            if (Array.isArray(ec)) {
                                                                return ec.length
                                                                    ? ec.map((c, i) =>
                                                                        typeof c === "object"
                                                                            ? `${c.name || ''}${c.relationship ? ` (${c.relationship})` : ''}${c.contact_number ? `: ${c.contact_number}` : ''}`
                                                                            : c
                                                                      ).join("; ")
                                                                    : "Not provided";
                                                            }
                                                            // If it's a single object
                                                            return `${ec.name || ''}${ec.relationship ? ` (${ec.relationship})` : ''}${ec.contact_number ? `: ${ec.contact_number}` : ''}`;
                                                        }
                                                        // If it's a string
                                                        return ec;
                                                    })()}
                                                </span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Insurance:</span>
                                                <span className="info-value">{profile?.insurance || formData.profile_data.insurance || "Not provided"}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Allergies:</span>
                                                <span className="info-value">
                                                    {Array.isArray(profile?.allergies) && profile.allergies.length > 0
                                                        ? profile.allergies.join(', ')
                                                        : (Array.isArray(formData.profile_data.allergies) && formData.profile_data.allergies.length > 0
                                                            ? formData.profile_data.allergies.join(', ')
                                                            : 'None reported')}
                                                </span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">Medical History:</span>
                                                <span className="info-value">
                                                    {profile?.medical_history || formData.profile_data.medical_history || "No medical history provided"}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;