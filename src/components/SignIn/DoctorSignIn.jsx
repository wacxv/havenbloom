import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SignIn.css';

const DoctorSignIn = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [emailError, setEmailError] = useState(null);
    const [passwordError, setPasswordError] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        // Clear field-specific errors when typing
        if (e.target.name === 'email') {
            setEmailError(null);
        } else if (e.target.name === 'password') {
            setPasswordError(null);
        }
        
        // Update form data
        setFormData({ ...formData, [e.target.name]: e.target.value });
        
        // Clear general error
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setEmailError(null);
        setPasswordError(null);

        try {
            // Use the doctors login endpoint
            const response = await axios.post('https://havenbloom-api.onrender.com/api/users/login', formData);
            const user = response.data.user;

            // Only allow doctors to sign in
            if (!user || user.role !== 'doctor') {
                setError('Only doctors can sign in on this page.');
                setLoading(false);
                return;
            }

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(user));
            navigate('/home');
        } catch (err) {
            // Handle specific error messages
            const errorMessage = err.response?.data?.message || '';
            
            if (errorMessage.toLowerCase().includes('email') || 
                errorMessage.toLowerCase().includes('user not found') ||
                errorMessage.toLowerCase().includes('no user')) {
                setEmailError('Incorrect Email');
            } 
            else if (errorMessage.toLowerCase().includes('password') || 
                     errorMessage.toLowerCase().includes('invalid credentials')) {
                setPasswordError('Incorrect Password');
            } 
            else {
                // Replace generic error with more specific message
                setError('Incorrect Email or Password');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="auth-signin-wrapper">
                <div className="auth-signin-card">
                    <div className="auth-signin-card-content">
                        <div className="auth-signin-card-header">
                            <h2>Welcome to HavenBloom, Doctor</h2>
                        </div>
                        <div className="auth-signin-card-body">
                            <div className="auth-signin-error-placeholder"></div>
                            {error && <div className="auth-signin-error-absolute">{error}</div>}
                            <form onSubmit={handleSubmit}>
                                <div className="auth-signin-form-group">
                                    <label htmlFor="email">Email:</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={emailError ? "auth-signin-input-error" : ""}
                                        required
                                    />
                                    <hr className={`auth-signin-form-divider ${emailError ? "auth-signin-divider-error" : ""}`} />
                                    {emailError && <div className="auth-signin-field-error">{emailError}</div>}
                                </div>
                                <div className="auth-signin-form-group">
                                    <label htmlFor="password">Password:</label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={passwordError ? "auth-signin-input-error" : ""}
                                        required
                                    />
                                    <hr className={`auth-signin-form-divider ${passwordError ? "auth-signin-divider-error" : ""}`} />
                                    {passwordError && <div className="auth-signin-field-error">{passwordError}</div>}
                                </div>
                                <div className="auth-signin-forgot-container">
                                    <div className="auth-signin-forgot-text">
                                        <Link to="/forgot-password">Forgot password?</Link>
                                    </div>
                                </div>
                                <div className="auth-signin-button-container">
                                    <button
                                        type="submit"
                                        className="auth-signin-button"
                                        disabled={loading}
                                    >
                                        {loading ? 'Signing In...' : 'Sign In'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        
                    </div>
                </div>
                <div className="auth-signin-inner">
                    <div className="auth-signin-layout">
                        <div className="auth-signin-top-section">
                            <div className="auth-signin-img-container-1">
                                <img className="auth-signin-img2" src="bg2.png" alt="Background" />
                            </div>
                        </div>
                        <div className="auth-signin-bottom-section">
                            <div className="auth-signin-img-container-2">
                                <img className="auth-signin-img1" src="bg1.png" alt="Background" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DoctorSignIn;