import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OTPInput from "react-otp-input";
import './ForgotPassword.css';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        email: '',
        otp: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        // Clear errors when user starts typing
        if (error) setError(null);
        if (success) setSuccess(null);
    };

    const handleOtpChange = (otp) => {
        setFormData({
            ...formData,
            otp: otp
        });
        if (error) setError(null);
    };

    const sendOtp = async (e) => {
        e.preventDefault();
        
        if (!formData.email) {
            setError("Email is required");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('https://havenbloom-api.onrender.com/api/otp/send-password-reset-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: formData.email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            setSuccess("OTP sent successfully to your email");
            setStep(2);
        } catch (err) {
            setError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        
        if (!formData.otp || formData.otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('https://havenbloom-api.onrender.com/api/otp/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email: formData.email, 
                    otp: formData.otp 
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Invalid OTP');
            }

            setSuccess("OTP verified successfully");
            setStep(3);
        } catch (err) {
            setError(err.message || 'Invalid or expired OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (e) => {
        e.preventDefault();
        
        if (!formData.newPassword || !formData.confirmPassword) {
            setError("Both password fields are required");
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('https://havenbloom-api.onrender.com/api/otp/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email: formData.email, 
                    newPassword: formData.newPassword,
                    otp: formData.otp
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            setSuccess("Password reset successful! Redirecting to login...");
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            setError(null);
            setSuccess(null);
        }
    };

    const handleResendOTP = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('https://havenbloom-api.onrender.com/api/otp/send-password-reset-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: formData.email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to resend OTP');
            }

            setSuccess("OTP resent successfully");
            setFormData({ ...formData, otp: '' });
        } catch (err) {
            setError(err.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderCardContent = () => {
        switch(step) {
            case 1:
                return (
                    <>
                        <div className="auth-forgot-card-header">
                            <h2>Forgot Password</h2>
                            <p>Enter your email address to receive an OTP</p>
                        </div>
                        <div className="auth-forgot-card-body">
                            <form onSubmit={sendOtp}>
                                <div className="auth-forgot-form-group">
                                    <label htmlFor="email">Email Address:</label>
                                    <input 
                                        type="email" 
                                        id="email" 
                                        name="email" 
                                        value={formData.email}
                                        onChange={handleChange}
                                        required 
                                        placeholder="Enter your email"
                                    />
                                    <hr className="auth-forgot-form-divider"/>
                                </div>
                                {error && (
                                    <div className="error-message">
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="success-message">
                                        {success}
                                    </div>
                                )}
                                <div className="auth-forgot-button-container">
                                    <button type="submit" disabled={loading} className="auth-forgot-button">
                                        {loading ? 'Sending...' : 'Send OTP'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="auth-forgot-card-footer">
                            <p>Remember your password? <Link to="/">Sign in</Link></p>
                        </div>
                    </>
                );
            case 2:
                return (
                    <>
                        <div className="auth-forgot-card-header">
                            <h2>Verify OTP</h2>
                            <p>Enter the 6-digit code sent to {formData.email}</p>
                        </div>
                        <div className="auth-forgot-card-body">
                            <form onSubmit={verifyOtp}>
                                <div className="auth-forgot-form-group">
                                    <label>Enter OTP:</label>
                                    <div className="otp-container">
                                        <OTPInput
                                          value={formData.otp}
                                          onChange={handleOtpChange}
                                          numInputs={6}
                                          renderSeparator={<span className="otp-separator">-</span>}
                                          renderInput={(props) => <input {...props} />}
                                        />
                                    </div>
                                </div>
                                {error && (
                                    <div className="error-message">
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="success-message">
                                        {success}
                                    </div>
                                )}
                                <div className="auth-forgot-resend">
                                    <p>Didn't receive the code? 
                                        <button 
                                            type="button" 
                                            className="resend-link" 
                                            onClick={handleResendOTP}
                                            disabled={loading}
                                        >
                                            {loading ? 'Sending...' : 'Resend OTP'}
                                        </button>
                                    </p>
                                </div>
                                <div className="auth-forgot-button-container">
                                    <button type="button" className="back-btn" onClick={handleBack} disabled={loading}>
                                        Back
                                    </button>
                                    <button type="submit" disabled={loading || formData.otp.length !== 6} className="auth-forgot-button">
                                        {loading ? 'Verifying...' : 'Verify OTP'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                );
            case 3:
                return (
                    <>
                        <div className="auth-forgot-card-header">
                            <h2>Reset Password</h2>
                            <p>Create a new password for your account</p>
                        </div>
                        <div className="auth-forgot-card-body">
                            <form onSubmit={resetPassword}>
                                <div className="auth-forgot-form-group">
                                    <label htmlFor="newPassword">New Password:</label>
                                    <input 
                                        type="password" 
                                        id="newPassword" 
                                        name="newPassword" 
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        required 
                                        placeholder="Enter new password"
                                        minLength="6"
                                    />
                                    <hr className="auth-forgot-form-divider"/>
                                </div>
                                <div className="auth-forgot-form-group">
                                    <label htmlFor="confirmPassword">Confirm Password:</label>
                                    <input 
                                        type="password" 
                                        id="confirmPassword" 
                                        name="confirmPassword" 
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required 
                                        placeholder="Confirm new password"
                                        minLength="6"
                                    />
                                    <hr className="auth-forgot-form-divider"/>
                                </div>
                                {error && (
                                    <div className="error-message">
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="success-message">
                                        {success}
                                    </div>
                                )}
                                <div className="auth-forgot-button-container">
                                    <button type="button" className="back-btn" onClick={handleBack} disabled={loading}>
                                        Back
                                    </button>
                                    <button type="submit" disabled={loading} className="auth-forgot-button">
                                        {loading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <div className="auth-forgot-wrapper">
                <div className="auth-forgot-card">
                    <div className="auth-forgot-card-content">
                        {/* Progress indicator */}
                        <div className="auth-forgot-progress-indicator">
                            {[1, 2, 3].map((stepNumber) => (
                                <div 
                                    key={stepNumber} 
                                    className={`auth-forgot-progress-dot ${step >= stepNumber ? 'active' : ''}`}
                                ></div>
                            ))}
                        </div>
                        {renderCardContent()}
                    </div>
                </div>

                <div className="auth-forgot-inner">
                    <div className="auth-forgot-layout">
                        <div className="auth-forgot-top-section">
                            <div className="auth-forgot-img-container-1">
                                <img className="auth-forgot-img2" src="bg2.png" alt="Background 2" />
                            </div>
                        </div>
                        <div className="auth-forgot-bottom-section">
                            <div className="auth-forgot-img-container-2">
                                <img className="auth-forgot-img1" src="bg1.png" alt="Background 1" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ForgotPassword;