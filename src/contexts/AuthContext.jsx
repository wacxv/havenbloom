import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Create the auth context
const AuthContext = createContext(null);

// Custom hook to use auth context
export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    
    // Set auth token for all axios requests
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);
    
    // Check if user is authenticated on mount
    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            
            if (storedToken && storedUser) {
                try {
                    // Set the token in axios headers
                    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                    
                    // Optionally validate the token with the server
                    // const response = await axios.get('/api/users/validate-token');
                    
                    // Set the current user
                    setCurrentUser(JSON.parse(storedUser));
                    setToken(storedToken);
                } catch (err) {
                    console.error("Authentication failed:", err);
                    // Clear invalid auth data
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setCurrentUser(null);
                    setToken(null);
                    setError("Session expired. Please login again.");
                }
            }
            
            setLoading(false);
        };
        
        checkAuth();
    }, []);
    
    // Login function
    const login = async (email, password) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.post('/api/users/login', { email, password });
            
            if (response.data.token) {
                // Store token and user data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                
                // Update state
                setToken(response.data.token);
                setCurrentUser(response.data.user);
                
                return response.data;
            } else {
                throw new Error('No token received from server');
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
            throw err;
        } finally {
            setLoading(false);
        }
    };
    
    // Register function
    const register = async (userData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.post('/api/users/register', userData);
            
            if (response.data.token) {
                // Store token and user data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                
                // Update state
                setToken(response.data.token);
                setCurrentUser(response.data.user);
                
                return response.data;
            } else {
                throw new Error('No token received from server');
            }
        } catch (err) {
            console.error("Registration error:", err);
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
            throw err;
        } finally {
            setLoading(false);
        }
    };
    
    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setCurrentUser(null);
    };
    
    // Update user profile function
    const updateProfile = async (userData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.put(`/api/users/${currentUser.id}`, userData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Update local storage with new user data
            const updatedUser = response.data;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
            
            return updatedUser;
        } catch (err) {
            console.error("Profile update error:", err);
            setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
            throw err;
        } finally {
            setLoading(false);
        }
    };
    
    // Check if user is authenticated
    const isAuthenticated = () => {
        return !!token && !!currentUser;
    };
    
    // Expose values and functions to consumers
    const value = {
        currentUser,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated,
        setError // Allow components to clear errors
    };
    
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};