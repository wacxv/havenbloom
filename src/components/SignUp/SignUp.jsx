import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignUp.css';

const SignUp = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [signupSuccess, setSignupSuccess] = useState(false);
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'patient',
        profile_data: {
            first_name: '',
            last_name: '',
            birth_date: '',
            address: '',
            contact_number: '',
            blood_type: '',
            medical_history: '',
            allergies: [],
            emergency_contact: {
                name: '',
                relationship: '',
                contact_number: ''
            },
            insurance: ''
        }
    });

    const [allergiesInput, setAllergiesInput] = useState(""); // Add this line

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'allergies') {
            setAllergiesInput(value); // Just update the input value, don't split yet
        } else if (name.startsWith('emergency_contact_')) {
            // Handle emergency contact fields
            const field = name.replace('emergency_contact_', '');
            setFormData({
                ...formData,
                profile_data: {
                    ...formData.profile_data,
                    emergency_contact: {
                        ...formData.profile_data.emergency_contact,
                        [field]: value
                    }
                }
            });
        } else if (
            [
                'first_name',
                'last_name',
                'birth_date',
                'address',
                'contact_number',
                'blood_type',
                'medical_history',
                'insurance',
                
            ].includes(name)
        ) {
            setFormData({
                ...formData,
                profile_data: {
                    ...formData.profile_data,
                    [name]: value
                }
            });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Only submit to backend on the last step
        if (step < 5) {
            // Update allergies in formData before moving to next step
            setFormData({
                ...formData,
                profile_data: {
                    ...formData.profile_data,
                    allergies: allergiesInput
                        .split(',')
                        .map(item => item.trim())
                        .filter(item => item.length > 0)
                }
            });
            setStep(step + 1);
            setError(null);
            return;
        }

        // Validate passwords match before submission
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Create submission data with properly formatted fields
        const submissionData = {
            email: formData.email,
            password: formData.password,
            role: formData.role,
            profile_data: {
                first_name: formData.profile_data.first_name,
                last_name: formData.profile_data.last_name,
                birth_date: formData.profile_data.birth_date,
                address: formData.profile_data.address,
                contact_number: formData.profile_data.contact_number,
                blood_type: formData.profile_data.blood_type || '',
                medical_history: formData.profile_data.medical_history || '',
                allergies: formData.profile_data.allergies,
                emergency_contact: formData.profile_data.emergency_contact,
                insurance: formData.profile_data.insurance || ''
            }
        };

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('https://havenbloom-api.onrender.com/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Registration failed');
            }

            // Registration successful
            setSignupSuccess(true); // Show popup
            setTimeout(() => {
                setSignupSuccess(false);
                navigate('/');
            }, 2000); // Hide popup and redirect after 2 seconds
        } catch (err) {
            setError(err.message || 'An error occurred during registration');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            // Clear any errors when going back
            setError(null);
        }
    };

    // Update the final step to show loading state and errors
    const renderFinalStep = () => {
        return (
            <>
                <div className="auth-signup-card-header">
                    <h2>Complete Registration</h2>
                </div>
                <div className="auth-signup-card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="signup-form-group">
                            <p className="form-message">
                                Please review your information before completing registration.
                            </p>
                        </div>
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}
                        <div className="signup-form-group">
                            <p className="form-message">
                                By clicking Complete Registration, you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </div>
                        <div className="auth-signup-button-container">
                            <button type="button" className="back-btn" onClick={handleBack} disabled={loading}>Back</button>
                            <button type="submit" disabled={loading} className="auth-signup-button">
                                {loading ? 'Processing...' : 'Complete Registration'}
                            </button>
                        </div>
                    </form>
                </div>
            </>
        );
    };

    // Content for each card - update case 4 to use renderFinalStep
    const renderCardContent = () => {
        switch(step) {
            case 1:
                // Account creation step with separate first and last name fields
                return (
                    <>
                        <div className="auth-signup-card-header">
                            <h2>Create Account</h2>
                        </div>
                        <div className="auth-signup-card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="auth-signup-name-container">
                                    <div className="auth-signup-form-group">
                                    <label htmlFor="first_name">First Name:</label>
                                    <input 
                                        type="text" 
                                        id="first_name" 
                                        name="first_name" 
                                        value={formData.profile_data.first_name}
                                        onChange={handleChange}
                                        required 
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                    </div>
                                    <div className="auth-signup-form-group">
                                        <label htmlFor="last_name">Last Name:</label>
                                        <input 
                                            type="text" 
                                            id="last_name" 
                                            name="last_name" 
                                            value={formData.profile_data.last_name}
                                            onChange={handleChange}
                                            required 
                                        />
                                        <hr className="auth-signup-form-divider"/>
                                    </div>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="email">Email:</label>
                                    <input 
                                        type="email" 
                                        id="email" 
                                        name="email" 
                                        value={formData.email}
                                        onChange={handleChange}
                                        required 
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="password">Password:</label>
                                    <input 
                                        type="password" 
                                        id="password" 
                                        name="password" 
                                        value={formData.password}
                                        onChange={handleChange}
                                        required 
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="confirmPassword">Confirm Password:</label>
                                    <input 
                                        type="password" 
                                        id="confirmPassword" 
                                        name="confirmPassword" 
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required 
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-button-container">
                                    <button type="submit" className="auth-signup-button">Next</button>
                                </div>
                            </form>
                        </div>
                        <div className="auth-signup-card-footer">
                            <p>Already have an account? <Link to="/">Sign in</Link></p>
                        </div>
                    </>
                );
            case 2:
                // Personal Information
                return (
                    <>
                        <div className="auth-signup-card-header">
                            <h2>Personal Information</h2>
                        </div>
                        <div className="auth-signup-card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="birth_date">Date of Birth:</label>
                                    <input 
                                        type="date" 
                                        id="birth_date" 
                                        name="birth_date"
                                        value={formData.profile_data.birth_date}
                                        onChange={handleChange}
                                        required 
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="address">Address:</label>
                                    <input 
                                        type="text" 
                                        id="address" 
                                        name="address"
                                        value={formData.profile_data.address}
                                        onChange={handleChange}
                                        required 
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="contact_number">Contact Number:</label>
                                    <input 
                                        type="text" 
                                        id="contact_number" 
                                        name="contact_number"
                                        value={formData.profile_data.contact_number}
                                        onChange={handleChange}
                                        required 
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-button-container">
                                    <button type="button" className="back-btn" onClick={handleBack}>Back</button>
                                    <button type="submit" className="auth-signup-button">Next</button>
                                </div>
                            </form>
                        </div>
                    </>
                );
            case 3:
                // Medical Information - Part 1
                return (
                    <>
                        <div className="auth-signup-card-header">
                            <h2>Medical Information</h2>
                        </div>
                        <div className="auth-signup-card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="blood_type">Blood Type:</label>
                                    <select 
                                        id="blood_type" 
                                        name="blood_type"
                                        value={formData.profile_data.blood_type}
                                        onChange={handleChange}
                                        required
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
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="medical_history">Medical History:</label>
                                    <textarea
                                        id="medical_history" 
                                        name="medical_history"
                                        value={formData.profile_data.medical_history}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Enter any previous conditions"
                                    ></textarea>
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="allergies">Allergies:</label>
                                    <textarea
                                        id="allergies" 
                                        name="allergies"
                                        value={allergiesInput}
                                        onChange={handleChange}
                                        rows="2"
                                        placeholder="Enter allergies separated by commas (e.g., Penicillin, Peanut Butter)"
                                    ></textarea>
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-button-container">
                                    <button type="button" className="back-btn" onClick={handleBack}>Back</button>
                                    <button type="submit" className="auth-signup-button">Next</button>
                                </div>
                            </form>
                        </div>
                    </>
                );
            case 4:
                // Medical Information - Part 2 (Emergency Contact & Insurance)
                return (
                    <>
                        <div className="auth-signup-card-header">
                            <h2>Emergency Contact & Insurance</h2>
                        </div>
                        <div className="auth-signup-card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="emergency_contact_name">Emergency Contact Name:</label>
                                    <input
                                        type="text"
                                        id="emergency_contact_name"
                                        name="emergency_contact_name"
                                        value={formData.profile_data.emergency_contact.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g., Juan Dela Cruz"
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="emergency_contact_relationship">Relationship:</label>
                                    <select
                                        id="emergency_contact_relationship"
                                        name="emergency_contact_relationship"
                                        value={formData.profile_data.emergency_contact.relationship}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select Relationship</option>
                                        <option value="Spouse">Spouse</option>
                                        <option value="Parent">Parent</option>
                                        <option value="Child">Child</option>
                                        <option value="Sibling">Sibling</option>
                                        <option value="Friend">Friend</option>
                                        <option value="Guardian">Guardian</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="emergency_contact_contact_number">Emergency Contact Number:</label>
                                    <input
                                        type="text"
                                        id="emergency_contact_contact_number"
                                        name="emergency_contact_contact_number"
                                        value={formData.profile_data.emergency_contact.contact_number}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g., 09123456789"
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-form-group">
                                    <label htmlFor="insurance">Insurance Information:</label>
                                    <input
                                        type="text"
                                        id="insurance"
                                        name="insurance"
                                        value={formData.profile_data.insurance}
                                        onChange={handleChange}
                                        placeholder="e.g., PhilHealth 123456789"
                                    />
                                    <hr className="auth-signup-form-divider"/>
                                </div>
                                <div className="auth-signup-button-container">
                                    <button type="button" className="back-btn" onClick={handleBack}>Back</button>
                                    <button type="submit" className="auth-signup-button">Next</button>
                                </div>
                            </form>
                        </div>
                    </>
                );
            case 5:
                return renderFinalStep();
            default:
                return null;
        }
    };

    // When initializing, sync allergiesInput with formData
    React.useEffect(() => {
        setAllergiesInput(formData.profile_data.allergies.join(', '));
    }, []);

    return (
        <>
            {/* Popup Modal */}
            {signupSuccess && (
                <div className="signup-success-modal">
                    <div className="signup-success-modal-content">
                        <h3>Registration Successful!</h3>
                        <p>You will be redirected to sign in.</p>
                    </div>
                </div>
            )}
            <div className="auth-signup-wrapper">
                <div className="auth-signup-card">
                    <div className="auth-signup-card-content">
                        {/* Progress indicator with new class names */}
                        <div className="auth-signup-progress-indicator">
                            {[1, 2, 3, 4, 5].map((stepNumber) => (
                                <div 
                                    key={stepNumber} 
                                    className={`auth-signup-progress-dot ${step >= stepNumber ? 'active' : ''}`}
                                    onClick={() => stepNumber < step && setStep(stepNumber)}
                                    style={{ cursor: stepNumber < step ? 'pointer' : 'default' }}
                                ></div>
                            ))}
                        </div>
                        {renderCardContent()}
                    </div>
                </div>

                <div className="auth-signup-inner">
                    <div className="auth-signup-layout">
                        <div className="auth-signup-top-section">
                            <div className="auth-signup-img-container-1">
                                <img className="auth-signup-img2" src="bg2.png" alt="Background 2" />
                            </div>
                        </div>
                        <div className="auth-signup-bottom-section">
                            <div className="auth-signup-img-container-2">
                                <img className="auth-signup-img1" src="bg1.png" alt="Background 1" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SignUp;
