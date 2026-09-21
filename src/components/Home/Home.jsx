import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Home.css';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
// Import Socket.IO client
import { io } from 'socket.io-client';
import { MOCK_APPOINTMENTS, MOCK_DOCTORS, MOCK_PRESCRIPTIONS, MOCK_USER } from '../../data/mockData';

const demoUser = MOCK_USER;
const demoDoctors = MOCK_DOCTORS;
const demoPrescriptions = MOCK_PRESCRIPTIONS;
const demoAppointments = MOCK_APPOINTMENTS;

const Home = () => {
    const [user, setUser] = useState(demoUser);
    const [prescriptions, setPrescriptions] = useState(demoPrescriptions);
    const [doctors, setDoctors] = useState(demoDoctors);
    const [patients, setPatients] = useState([]);
    const [appointments, setAppointments] = useState(demoAppointments);
    const [loading, setLoading] = useState(false);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [error, setError] = useState(null);
    const [errorDoctors, setErrorDoctors] = useState(null);
    const [errorPatients, setErrorPatients] = useState(null);
    const [errorAppointments, setErrorAppointments] = useState(null);
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [userRole, setUserRole] = useState('patient');
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [socket, setSocket] = useState(null);
    const [token, setToken] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [doctorNames, setDoctorNames] = useState({});  // To store doctor names by ID
    const [patientNames, setPatientNames] = useState({});  // To store patient names by ID
    const [doctorSchedules, setDoctorSchedules] = useState({});
    const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
    const [prescriptionForm, setPrescriptionForm] = useState({
      prescription: '',
      remarks: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }]
    });
    const [prescriptionError, setPrescriptionError] = useState(null);
    const [prescriptionSuccess, setPrescriptionSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditDoctorModalOpen, setIsEditDoctorModalOpen] = useState(false);
    const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
    const [editDoctorForm, setEditDoctorForm] = useState({
        _id: '',
        title: '',
        first_name: '',
        last_name: '',
        full_name: '',
        specialization: '',
        gender: '',
        license_number: '',
        contact_number: '',
        schedule_info: '',
        hospital_clinic: ''
    });
    const [editPatientForm, setEditPatientForm] = useState({
        _id: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        address: '',
        contact_number: '',
        blood_type: '',
        medical_history: '',
        allergies: '',
        insurance: '',
        emergency_contact: {
            name: '',
            relationship: '',
            contact_number: ''
        }
    });
    const [editLoading, setEditLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const ringToneRef = useRef(null);
    const navigate = useNavigate();

    // Date-fns localizer setup for the calendar
    const locales = {
        'en-US': enUS
    };

    const localizer = dateFnsLocalizer({
        format,
        parse,
        startOfWeek,
        getDay,
        locales
    });

    // Function to get user name
    const getUserFullName = (userData) => {
        if (!userData) return 'Unknown User';
        
        if (userData.firstName && userData.lastName) {
            return `${userData.firstName} ${userData.lastName}`;
        } else if (userData.first_name && userData.last_name) {
            return `${userData.first_name} ${userData.last_name}`;
        } else if (userData.name) {
            return userData.name;
        } else if (userData.full_name) {
            return userData.full_name;
        }
        
        return userData.email || 'Unknown User';
    };
const fetchEntityDetails = async (entityId, entityType) => {
    if (!entityId) return null;
    try {
        // This time we use the _id directly
        const endpoint = entityType === 'doctor'
            ? `/api/doctors/${entityId}`
            : `/api/patients/${entityId}`;

        const response = await createAuthenticatedRequest(endpoint);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${entityType} details by _id:`, error);
        return null;
    }
};

    // Function to fetch user details by ID
    const fetchUserDetails = async (userId, userType) => {
        if (!userId) return null;
        try {
            // Use the /user/:userId route for both doctor and patient
            const endpoint = userType === 'doctor'
                ? `/api/doctors/user/${userId}`
                : `/api/patients/user/${userId}`;
            const response = await createAuthenticatedRequest(endpoint);
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${userType} details:`, error);
            return null;
        }
    };

    // Fetch doctor names for all doctors
    useEffect(() => {
        const fetchDoctorNames = async () => {
            if (!token || !doctors.length) return;
            const names = {};
            for (const doctor of doctors) {
                // Use doctor.user_id if available, otherwise fallback to doctor._id
                const userId = doctor.user_id || doctor._id;
                const doctorData = await fetchEntityDetails(doctor._id, 'doctor');
                if (doctorData) {
                    names[doctor._id] = getUserFullName(doctorData);
                }
            }
            setDoctorNames(names);
        };
        fetchDoctorNames();
    }, [doctors, token]);

    // Fetch patient names for all patients
    useEffect(() => {
        const fetchPatientNames = async () => {
            if (!token || !patients.length) return;
            const names = {};
            for (const patient of patients) {
                // Use patient.user_id if available, otherwise fallback to patient._id
                const userId = patient.user_id || patient._id;
                const patientData = await fetchEntityDetails(assignment.patient_id, 'patient');
                if (patientData) {
                    names[patient._id] = getUserFullName(patientData);
                }
            }
            setPatientNames(names);
        };
        fetchPatientNames();
    }, [patients, token]);

    // Load user and token from localStorage on mount
    useEffect(() => {
        const storedUser = null;
        const storedToken = null;
        
        // Define a helper function to check token validity
        const isTokenExpired = (token) => {
            if (!token) return true;
            
            try {
                // Simple check: token format should be "xxx.yyy.zzz"
                const parts = token.split('.');
                if (parts.length !== 3) return true;
                
                // Try to decode the token payload
                const payload = JSON.parse(atob(parts[1]));
                
                // Check expiration (exp is standard JWT expiration claim in seconds)
                if (payload.exp) {
                    return payload.exp * 1000 < Date.now();
                }
                
                // If no exp claim, check if token is older than 24 hours
                // This is just a fallback, your actual token might have different rules
                if (payload.iat) {
                    return (payload.iat * 1000) + (24 * 60 * 60 * 1000) < Date.now();
                }
                
                return false; // Can't determine expiration, assume valid
            } catch (error) {
                console.error("Error parsing token:", error);
                return true; // If we can't parse it, consider it expired
            }
        };
        
        console.log("Stored token:", storedToken ? `${storedToken.substring(0, 15)}...` : "No token");
        console.log("Stored user:", storedUser);
        
        if (storedUser) {
            // Patch: support both id and _id
            if (!storedUser._id && storedUser.id) {
                storedUser._id = storedUser.id;
            }
            setUser(storedUser);
            setUserRole(storedUser.role);
        }
        
        if (storedToken && !isTokenExpired(storedToken)) {
            setToken(storedToken);
            console.log("Using valid stored token");
        }
    }, []);

    // Add this function for proper login redirection
const redirectToLogin = () => {
  // Clear user data
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  
  // Set state to null
  setUser(null);
  setToken(null);
  
  // Redirect to login
  console.log("Redirecting to login page due to authentication issues");
  window.location.href = '/signin'; // Using window.location for a full reload
};

// Modified refreshToken function to handle login redirection
const refreshToken = async () => {
  try {
    console.log("Attempting to refresh token...");
    // Make request to refresh token endpoint - changed to localhost
    const response = await axios.post('https://havenbloom-api.onrender.com/api/auth/refresh-token', {}, {
      withCredentials: true // Important for cookies if your refresh mechanism uses them
    });
    
    if (response.data && response.data.token) {
      console.log("Token refreshed successfully");
      // Update token in state and storage
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      return response.data.token;
    } else {
      console.error("No token in refresh response", response.data);
      redirectToLogin();
      return null;
    }
  } catch (error) {
    console.error("Failed to refresh token:", error);
    // If refresh fails, we need to clear token and redirect to login
    redirectToLogin();
    return null;
  }
};

    // Update the createAuthenticatedRequest function to properly handle API paths
const createAuthenticatedRequest = async (endpoint, method = 'GET', body = null) => {
  let currentToken = token || localStorage.getItem('token');
  
  if (!currentToken) {
    console.error('No token available for request');
    redirectToLogin();
    return Promise.reject(new Error('No authentication token available'));
  }
  
  // Ensure the API base URL is localhost - CHANGED THIS
  const baseUrl = 'https://havenbloom-api.onrender.com';
  
  // Handle endpoint formatting
  let fullUrl = endpoint.startsWith('http') ? endpoint : 
               (endpoint.startsWith('/api') ? `${baseUrl}${endpoint}` : `${baseUrl}/api${endpoint}`);
  
  console.log(`Making ${method} request to: ${fullUrl}`);
  
  const config = {
    method,
    url: fullUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentToken}`
    }
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.data = body;
  }
  
  try {
    // Try the request with current token
    return await axios(config);
  } catch (error) {
    console.error(`API request failed: ${fullUrl}`, error);
    
    // If we get a 401 or 403 error, the token might be invalid or expired
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log("Auth error detected, attempting token refresh");
      
      // Try to refresh the token
      const newToken = await refreshToken();
      
      // If refresh succeeded, retry the original request
      if (newToken) {
        config.headers['Authorization'] = `Bearer ${newToken}`;
        return axios(config);
      }
      // If refresh failed, the refreshToken function will have handled logout
    }
    throw error;
  }
};

    // Fetch doctors for patients
    useEffect(() => {
        const fetchDoctors = async () => {
            if (!user || userRole !== 'patient' || !token) return;
            
            setLoadingDoctors(true);
            setErrorDoctors(null);
            
            try {
                const patientId = user._id;
                console.log(`Fetching assignments for patient: ${patientId} with token`);
                
                // Use the helper function for consistent auth
                const assignmentsResponse = await createAuthenticatedRequest(
                    `/api/assignments/patient/${patientId}`
                );
                
                console.log('Assignments data received:', assignmentsResponse.data);
                
                // Handle IDs in various possible formats
                const doctorIds = assignmentsResponse.data
                    .map(assignment => {
                        if (!assignment.doctor_id) {
                            return null;
                        }
                        
                        // Handle nested doctor object with _id
                        if (typeof assignment.doctor_id === 'object' && assignment.doctor_id !== null) {
                            return assignment.doctor_id._id || assignment.doctor_id;
                        }
                        
                        return assignment.doctor_id;
                    })
                    .filter(id => id !== null && id !== undefined);
                
                console.log('Extracted doctor IDs:', doctorIds);
                
                if (doctorIds.length === 0) {
                    setDoctors([]);
                    return;
                }
                
                // Use the helper function for consistent auth
                const response = await createAuthenticatedRequest('/api/doctors');
                
                console.log('All doctors:', response.data);
                
                // More flexible ID comparison
                const assignedDoctors = response.data.filter(doctor => {
                    // Convert current doctor ID to string for comparison
                    const doctorIdStr = doctor._id?.toString() || '';
                    
                    // Check all possible ID formats
                    return doctorIds.some(id => {
                        // Handle various ID formats
                        if (!id) return false;
                        
                        // Convert to string if it's an object or string
                        let idStr;
                        if (typeof id === 'object') {
                            idStr = id?.toString() || '';
                        } else {
                            idStr = String(id);
                        }
                        
                        // Compare string versions
                        return doctorIdStr === idStr;
                    });
                });
                
                console.log('Assigned doctors filtered:', assignedDoctors);
                
                // Set doctors state
                setDoctors(assignedDoctors);
            } catch (err) {
                console.error('Error fetching assigned doctors:', err);
                console.log('Error details:', err.response?.data || err.message);
                setErrorDoctors(`Failed to load your doctors: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoadingDoctors(false);
            }
        };
        
        fetchDoctors();
    }, [user, userRole, token]);

    // Fetch patients for doctors
    useEffect(() => {
        const fetchPatients = async () => {
            if (!user || userRole !== 'doctor' || !token) return;
            
            setLoadingPatients(true);
            setErrorPatients(null);
            
            try {
                const doctorId = user._id;
                console.log(`Fetching assignments for doctor: ${doctorId} with token`);
                
                // Use the helper function for consistent auth
                const assignmentsResponse = await createAuthenticatedRequest(
                    `/api/assignments/doctor/${doctorId}`
                );
                
                console.log('Doctor patients assignments received:', assignmentsResponse.data);
                
                // Handle IDs in various possible formats
                const patientIds = assignmentsResponse.data
                    .map(assignment => {
                        if (!assignment.patient_id) {
                            return null;
                        }
                        
                        // Handle nested patient object with _id
                        if (typeof assignment.patient_id === 'object' && assignment.patient_id !== null) {
                            return assignment.patient_id._id || assignment.patient_id;
                        }
                        
                        return assignment.patient_id;
                    })
                    .filter(id => id !== null && id !== undefined);
                
                if (patientIds.length === 0) {
                    setPatients([]);
                    return;
                }
                
                // Use the helper function for consistent auth
                const response = await createAuthenticatedRequest('/api/patients');
                
                // Filter for assigned patients
                const assignedPatients = response.data.filter(patient => {
                    const patientIdStr = patient._id?.toString() || '';
                    
                    return patientIds.some(id => {
                        if (!id) return false;
                        
                        let idStr;
                        if (typeof id === 'object') {
                            idStr = id?.toString() || '';
                        } else {
                            idStr = String(id);
                        }
                        
                        return patientIdStr === idStr;
                    });
                });
                
                setPatients(assignedPatients);
            } catch (err) {
                console.error('Error fetching assigned patients:', err);
                console.log('Error details:', err.response?.data || err.message);
                setErrorPatients(`Failed to load your patients: ${err.response?.data?.message || err.message}`);
            } finally {
                setLoadingPatients(false);
            }
        };
        
        fetchPatients();
    }, [user, userRole, token]);

    // 1. Move prescription fetching logic to a function
const fetchPrescriptions = async () => {
    if (!user || !token) return;
    setLoading(true);
    setError(null);

    try {
        let endpoint;
        if (userRole === 'patient') {
            endpoint = `/api/prescriptions?patient_id=${user._id}`;
        } else if (userRole === 'doctor') {
            endpoint = `/api/prescriptions?doctor_id=${user._id}`;
        } else {
            setLoading(false);
            return;
        }

        const response = await createAuthenticatedRequest(endpoint);

        const fixedPrescriptions = response.data.map(prescription => {
            let doctorName = 'Unknown doctor';
            if (prescription.doctor && prescription.doctor.full_name) {
                doctorName = prescription.doctor.full_name;
            } else if (prescription.doctor_id && prescription.doctor_id.full_name) {
                doctorName = prescription.doctor_id.full_name;
            }

            let patientName = 'Unknown patient';
            if (prescription.patient && prescription.patient.full_name) {
                patientName = prescription.patient.full_name;
            } else if (prescription.patient_id && prescription.patient_id.full_name) {
                patientName = prescription.patient_id.full_name;
            }

            return {
                ...prescription,
                doctorName: doctorName,
                patientName: patientName,
                date: prescription.date_issued ? new Date(prescription.date_issued) : 
                      prescription.createdAt ? new Date(prescription.createdAt) : null
            };
        });

        setPrescriptions(fixedPrescriptions);
    } catch (err) {
        setError(`Failed to load prescriptions: ${err.response?.data?.message || err.message}`);
    } finally {
        setLoading(false);
    }
};

    // 2. Use this function in useEffect
useEffect(() => {
    fetchPrescriptions();
    // eslint-disable-next-line
}, [user, userRole, token]);

    // New useEffect to fetch appointments
    useEffect(() => {
    if (!user || !userRole || !token) {
        console.log("Missing required data for appointment fetch", { user, userRole });
        return;
    }

    // Ensure we use the linked Doctor/Patient ID (not user._id!)
    const targetId = userRole === 'doctor' ? user.linkedDoctorId : user.linkedPatientId;
    if (!targetId) {
        console.log("No linked entity ID found for user", { user, userRole });
        return;
    }

    setLoadingAppointments(true);

    const endpoint = userRole === 'doctor'
        ? `/api/appointments?doctor_id=${targetId}`
        : `/api/appointments?patient_id=${targetId}`;

    console.log(`Fetching appointments from: ${endpoint}`);

    createAuthenticatedRequest(endpoint)
        .then(response => {
            console.log("Raw appointment data:", response.data);

            const formattedAppointments = response.data
                .map(appt => {
                    // Extract doctor info
                    const doctorId = appt.doctor_id?._id || appt.doctor_id;
                    const doctorName =
                        appt.doctor_id?.full_name ||
                        (appt.doctor_id?.first_name && appt.doctor_id?.last_name
                            ? `${appt.doctor_id.title || ''} ${appt.doctor_id.first_name} ${appt.doctor_id.last_name}`.trim()
                            : appt.doctorName || "Doctor");

                    // Extract patient info
                    const patientId = appt.patient_id?._id || appt.patient_id;
                    const patientName =
                        appt.patient_id?.full_name ||
                        (appt.patient_id?.first_name && appt.patient_id?.last_name
                            ? `${appt.patient_id.first_name} ${appt.patient_id.last_name}`.trim()
                            : appt.patientName || "Patient");

                    // Show "with whom" based on role
                    const withPerson = userRole === 'doctor' ? patientName : doctorName;

                    return {
                        _id: appt._id,  // Mongo _id
                        id: appt._id,   // alias for calendar
                        title: appt.description || appt.title || "Appointment",
                        start: new Date(appt.appointment_date),
                        end: new Date(appt.appointment_date),
                        with: withPerson,
                        status: appt.status || "scheduled",
                        doctorId,
                        patientId,
                        doctorName,
                        patientName,
                        notes: appt.description,
                        appointment_date: appt.appointment_date
                    };
                })
                .filter(appt => appt.start && !isNaN(appt.start));

            console.log("Formatted appointments:", formattedAppointments);
            setAppointments(formattedAppointments);
            setErrorAppointments(null);
        })
        .catch(err => {
            console.error("Error fetching appointments:", err.response || err);
            console.log('Error details:', err.response?.data || err.message);
            setErrorAppointments(`Failed to load appointments: ${err.response?.data?.message || err.message}`);
            setAppointments([]);
        })
        .finally(() => setLoadingAppointments(false));
}, [user?.linkedDoctorId, user?.linkedPatientId, userRole, token]);


    // Function to check if a date has appointments (for the current user only)
    const hasAppointment = (date) => {
        if (!date || !userAppointments || !Array.isArray(userAppointments)) return false;

        const dateWithoutTime = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

        return userAppointments.some(appointment => {
            if (!appointment.start && !appointment.appointment_date) return false;

            // Try both start and appointment_date fields
            const appointmentDate = appointment.start ?
                new Date(appointment.start) :
                new Date(appointment.appointment_date);

            if (isNaN(appointmentDate.getTime())) return false;

            const appointmentWithoutTime = new Date(
                appointmentDate.getFullYear(),
                appointmentDate.getMonth(),
                appointmentDate.getDate()
            );

            return appointmentWithoutTime.getTime() === dateWithoutTime.getTime();
        });
    };

// Callback function to customize date cell rendering - UPDATED
const customDayPropGetter = (date) => {
    if (hasAppointment(date)) {
        return {
            className: 'has-appointment',
            style: {
                position: 'relative'
            }
        };
    }
    return {};
};

    // Updated handleJoinCall function to use the _id
    const handleJoinCall = async (appointment) => {
        if (!appointment) {
            console.error("Cannot start call: Missing appointment data");
            return;
        }

        if (!socket) {
            console.error("Socket connection not established. Cannot start call.");
            alert("Video connection not ready. Please try again in a moment.");
            return;
        }

        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                console.error("User data not found in localStorage");
                return;
            }

            const parsedUser = JSON.parse(userData);
            const userName = parsedUser.name || parsedUser.user?.name || 'You';

            // Use appointmentId as the shared room identifier
            const roomId = appointment._id; // Ensure this is consistent across both sides

            console.log(`Joining call room with appointment ID: ${roomId}`);

            // Prepare call data
            const callData = {
                callerId: user._id,
                callerName: userName,
                roomId: roomId, // Shared room identifier
                contactId: userRole === 'patient' ? appointment.doctorId : appointment.patientId,
                contactName: userRole === 'patient' ? appointment.doctorName : appointment.patientName,
                isReceiver: false // We're initiating the call
            };

            // Store call data in session storage
            sessionStorage.setItem('callData', JSON.stringify(callData));

            // Emit socket event to notify the other user
            socket.emit('join-call-room', {
                roomId: roomId, // Shared room identifier
                callerId: user._id,
                callerName: userName
            });

            navigate('/videocall');
        } catch (error) {
            console.error('Error initiating call:', error);
        }
    };

    // Function to initiate a video call
    const initiateVideoCall = (appointment) => {
        if (!appointment || !socket) {
            console.error('Please select an appointment or wait for connection');
            return;
        }

        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                console.error('User data not found');
                return;
            }

            const parsedUser = JSON.parse(userData);
            const userName = parsedUser.name || parsedUser.user?.name || 'You';

            // Prepare call data
            const callData = {
                callerId: user._id,
                callerName: userName,
                contactId: userRole === 'patient' ? appointment.doctorId : appointment.patientId,
                contactName: userRole === 'patient' ? appointment.doctorName : appointment.patientName,
                isReceiver: false
            };

            // Store call data in session storage
            sessionStorage.setItem('callData', JSON.stringify(callData));

            // Emit socket event to notify the other user
            socket.emit('call-user', {
                targetId: userRole === 'patient' ? appointment.doctorId : appointment.patientId,
                callerId: user._id,
                callerName: userName
            });

            console.log('Call initiated to:', userRole === 'patient' ? appointment.doctorName : appointment.patientName);

            // Navigate to video call page
            navigate('/videocall');
        } catch (error) {
            console.error('Error initiating call:', error);
        }
    };

    const handleModalClick = (e) => {
        if (e.target.className === 'home-dash-prescription-modal-overlay') {
            setSelectedPrescription(null);
        }
        if (e.target.className === 'home-dash-doctor-modal-overlay') {
            setSelectedDoctor(null);
        }
        if (e.target.className === 'home-dash-patient-modal-overlay') {
            setSelectedPatient(null);
        }
        if (e.target.className === 'home-dash-appointment-modal-overlay') {
            setSelectedAppointment(null);
        }
    };

    // Function to navigate calendar months
    const navigateCalendar = (action) => {
        const newDate = new Date(calendarDate);
        if (action === 'PREV') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else if (action === 'NEXT') {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCalendarDate(newDate);
    };

    console.log("Current appointments state:", appointments);
    console.log("User role:", userRole);
    console.log("Loading state:", loadingAppointments);
    console.log("Error state:", errorAppointments);
    console.log("Appointments:", appointments);
    console.log("Calendar Date:", calendarDate);

    // Debugging useEffect to track user and userRole changes
    useEffect(() => {
        console.log("User object:", user);
        console.log("User role:", userRole);
    }, [user, userRole]);

    // Add a function to get a token
    const getToken = async () => {
        try {
            const response = await fetch('https://havenbloom-api.onrender.com/api/messages/test-token');
            const data = await response.json();
            setToken(data.token);
            return data.token;
        } catch (error) {
            console.error("Error getting token:", error);
            return null;
        }
    };

    // Initialize socket connection
    useEffect(() => {
        if (user && user._id && token) {
            const initializeSocket = async () => {
                try {
                    const newToken = await getToken();
                    
                    if (!newToken) {
                        console.error("Failed to get token for socket connection");
                        return;
                    }
                    
                    // Changed socket URL to localhost
                    const newSocket = io('https://havenbloom-api.onrender.com', {
                        auth: { token: newToken }
                    });
                    
                    newSocket.on('connect', () => {
                        console.log('Socket connected to havenbloom-api.onrender');
                    });
                    
                    newSocket.on('error', (error) => {
                        console.error('Socket error:', error);
                    });
                    
                    // New event listeners for SDP and ICE candidates
                    newSocket.on('sdp', async ({ sdp, type }) => {
                        console.log(`Received SDP: ${type}`, sdp);
                        if (type === 'offer') {
                            await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
                            const answer = await peerConnection.createAnswer();
                            await peerConnection.setLocalDescription(answer);
                            socket.emit('sdp', { sdp: answer, type: 'answer' });
                        } else if (type === 'answer') {
                            await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
                        }
                    });

                    newSocket.on('ice-candidate', async (candidate) => {
                        console.log('Received ICE candidate:', candidate);
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    });
                    
                    // Add event listener for incoming calls
                    newSocket.on('incoming-call', ({ callerId, callerName }) => {
                        console.log(`Incoming call from ${callerName}`);

                        // Play ringtone if we have one
                        if (ringToneRef.current) {
                            ringToneRef.current.play().catch(err => console.log('Could not play ringtone:', err));
                        }

                        // Set incoming call data
                        setIncomingCall({
                            callerId,
                            callerName
                        });
                    });
                    
                    setSocket(newSocket);
                    
                    return () => {
                        newSocket.disconnect();
                    };
                } catch (error) {
                    console.error("Error initializing socket:", error);
                }
            };
            
            initializeSocket();
        }
    }, [user]);

    // Add this to ensure current user's full details are loaded
    useEffect(() => {
        const loadCurrentUserDetails = async () => {
            if (!user || !user._id || !userRole || !token) return;
            
            try {
                const userData = await fetchUserDetails(user._id, userRole);
            if (userData) {
                setUser(prevUser => ({
                    ...prevUser,
                    ...userData,
                    linkedDoctorId: userRole === 'doctor' ? userData._id : undefined,
                    linkedPatientId: userRole === 'patient' ? userData._id : undefined
                }));
                }
            } catch (error) {
                console.error('Error loading current user details:', error);
            }
        };
        
        loadCurrentUserDetails();
    }, [user?._id, userRole, token]);

    // Update the formatDoctorSchedule function
    const formatDoctorSchedule = (doctor) => {
        // First priority: Check for schedule_info field
        if (doctor.schedule_info) {
            return typeof doctor.schedule_info === 'string' 
                ? doctor.schedule_info 
                : JSON.stringify(doctor.schedule_info);
        }
        
        // Second priority: Check for schedule field
        if (doctor.schedule) {
            return typeof doctor.schedule === 'string' ? doctor.schedule : 'Available';
        }
        
        // Check for availability formats
        if (doctor.availability) {
            if (typeof doctor.availability === 'string') {
                return doctor.availability;
            }
            
            if (Array.isArray(doctor.availability)) {
                return doctor.availability.join(', ');
            }
            
            if (typeof doctor.availability === 'object') {
                // Try to parse common availability object formats
                const days = [];
                if (doctor.availability.monday) days.push('Mon');
                if (doctor.availability.tuesday) days.push('Tues');
                if (doctor.availability.wednesday) days.push('Wed');
                if (doctor.availability.thursday) days.push('Thurs');
                if (doctor.availability.friday) days.push('Fri');
                if (doctor.availability.saturday) days.push('Sat');
                if (doctor.availability.sunday) days.push('Sun');
                
                if (days.length > 0) {
                    return `Available: ${days.join(', ')}`;
                }
            }
        }
        
        // Check for working_hours
        if (doctor.working_hours) {
            return typeof doctor.working_hours === 'string' ? 
                doctor.working_hours : 
                'Working hours available';
        }
        
        // Default fallback
        return "Schedule not specified";
    };
    
    // Now we also need to adjust the fetchDoctorSchedules method to use our new helper
    useEffect(() => {
        if (!doctors.length || !token) return;
        
        const fetchDoctorSchedules = async () => {
            const schedules = {};
            
            for (const doctor of doctors) {
                try {
                    // Use the improved authenticated request helper
                    const response = await createAuthenticatedRequest(`/api/doctors/${doctor._id}`);
                    
                    if (response.data && response.data.schedule) {
                        schedules[doctor._id] = response.data.schedule;
                    } else {
                        schedules[doctor._id] = formatDoctorSchedule(doctor);
                    }
                } catch (err) {
                    console.log(`Could not fetch schedule for doctor ${doctor._id}, using fallback`);
                    schedules[doctor._id] = formatDoctorSchedule(doctor);
                }
            }
            
            setDoctorSchedules(schedules);
        };
        
        fetchDoctorSchedules();
    }, [doctors, appointments, token]);

    // Update the doctor item rendering to use the schedule from state
    const renderDoctorItem = (doctor) => (
        <div className="home-dash-doctor-item" key={doctor._id} onClick={() => setSelectedDoctor(doctor)}>
            <div className="home-dash-doctor-avatar">
                {(doctorNames[doctor._id] || 'Doc')
                    .split(' ')
                    .filter(word => word)
                    .map(word => word[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
            </div>
            <div className="home-dash-doctor-info">
                <div className="home-dash-doctor-name">
                    {doctorNames[doctor._id] ? "Dr. " + doctorNames[doctor._id] : 'Loading...'}
                </div>
                <div className="home-dash-doctor-specialization">
                    {doctor.specialization || doctor.specialty || "General Practice"}
                </div>
            </div>
            <div className="home-dash-doctor-schedule">
                {doctorSchedules[doctor._id] || "Fetching schedule..."}
            </div>
        </div>
    );

    // Add function to handle form input changes
const handlePrescriptionFormChange = (e) => {
  setPrescriptionForm({
    ...prescriptionForm,
    [e.target.name]: e.target.value
  });
};

// Add function to handle medication form input changes
const handleMedicationChange = (index, field, value) => {
  const medications = [...prescriptionForm.medications];
  medications[index][field] = value;
  setPrescriptionForm({
    ...prescriptionForm,
    medications
  });
};

// Add function to handle removing medications
const removeMedication = (index) => {
  const medications = [...prescriptionForm.medications];
  medications.splice(index, 1);
  setPrescriptionForm({
    ...prescriptionForm,
    medications
  });
};

// Add function to handle adding more medications
const addMedication = () => {
  setPrescriptionForm({
    ...prescriptionForm,
    medications: [
      ...prescriptionForm.medications,
      { name: '', dosage: '', frequency: '', duration: '' }
    ]
  });
};

// Add this function to handle form submission
const handlePrescriptionSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setPrescriptionError(null);
  setPrescriptionSuccess(false);
  
  if (!user || !user._id) {
    setPrescriptionError('Doctor information not available. Please try again.');
    setIsSubmitting(false);
    return;
  }
  
  try {
    const prescriptionData = {
      doctor_id: user._id,
      patient_id: prescriptionForm.patient_id,
      prescription: prescriptionForm.prescription,
      remarks: prescriptionForm.remarks,
      medications: prescriptionForm.medications
    };
    
    console.log('Submitting prescription data:', prescriptionData);
    
    await createAuthenticatedRequest(
      '/api/prescriptions/create',
      'POST',
      prescriptionData
    );
    
    setPrescriptionSuccess(true);

    // Immediately refresh the prescription list
    await fetchPrescriptions();

    setTimeout(() => {
      setPrescriptionForm({
        patient_id: '',
        prescription: '',
        remarks: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '' }]
      });
      setIsPrescriptionModalOpen(false);
      setPrescriptionSuccess(false);
    }, 2000);
    
  } catch (error) {
    setPrescriptionError(`Failed to create prescription: ${error.response?.data?.message || error.message}`);
  } finally {
    setIsSubmitting(false);
  }
};

    // Add this helper function to format the user display name based on role
const getFormattedUserName = () => {
  if (!user) return 'Guest';

  // Try different field combinations for the name
  let displayName = '';
  
  // Check for full_name first
  if (user.full_name) {
    displayName = user.full_name;
  }
  // Check for firstName + lastName
  else if (user.firstName && user.lastName) {
    displayName = `${user.firstName} ${user.lastName}`;
  }
  // Check for first_name + last_name
  else if (user.first_name && user.last_name) {
    displayName = `${user.first_name} ${user.last_name}`;
  }
  // Check for name field
  else if (user.name) {
    displayName = user.name;
  }
  // Check for username
  else if (user.username) {
    displayName = user.username;
  }
  // Fallback to email username part
  else if (user.email) {
    displayName = user.email.split('@')[0];
  }
  else {
    displayName = 'User';
  }

  // Add role prefix only for doctors
  if (userRole === 'doctor') {
    return displayName.startsWith('Dr.') ? displayName : `Dr. ${displayName}`;
  }
  
  return displayName;
};

    // Admin functions for editing and deleting
const handleEditDoctor = async () => {
    if (!selectedDoctor) return;
    
    try {
        setEditLoading(true);
        
        const response = await createAuthenticatedRequest(`/api/doctors/${selectedDoctor._id}`);
        const fullDoctorData = response.data;
        
        console.log('Full doctor data for edit:', fullDoctorData);
        
        setEditDoctorForm({
            _id: selectedDoctor._id,
            first_name: fullDoctorData.first_name || '',
            last_name: fullDoctorData.last_name || '',
            full_name: fullDoctorData.full_name || '',
            specialization: fullDoctorData.specialization || '',
            license_number: fullDoctorData.license_number || '',
            contact_number: fullDoctorData.contact_number || '',
            schedule_info: fullDoctorData.schedule_info || '',
            hospital_clinic: fullDoctorData.hospital_clinic || ''
        });
        
        setSelectedDoctor(null);
        setIsEditDoctorModalOpen(true);
        
    } catch (error) {
        console.error('Error fetching doctor details for edit:', error);
        alert(`Failed to load doctor details: ${error.response?.data?.message || error.message}`);
    } finally {
        setEditLoading(false);
    }
};

const handleEditPatient = async () => {
    if (!selectedPatient) return;
    
    try {
        setEditLoading(true);
        
        const response = await createAuthenticatedRequest(`/api/patients/${selectedPatient._id}`);
        const fullPatientData = response.data;
        
        console.log('Full patient data for edit:', fullPatientData);
        
        let formattedBirthDate = '';
        if (fullPatientData.birth_date) {
            formattedBirthDate = new Date(fullPatientData.birth_date).toISOString().split('T')[0];
        }
        
        let allergiesString = '';
        if (fullPatientData.allergies && Array.isArray(fullPatientData.allergies)) {
            allergiesString = fullPatientData.allergies.join(', ');
        }
        
        setEditPatientForm({
            _id: selectedPatient._id,
            first_name: fullPatientData.first_name || '',
            last_name: fullPatientData.last_name || '',
            birth_date: formattedBirthDate,
            address: fullPatientData.address || '',
            contact_number: fullPatientData.contact_number || '',
            blood_type: fullPatientData.blood_type || '',
            medical_history: fullPatientData.medical_history || '',
            allergies: allergiesString,
            insurance: fullPatientData.insurance || '',
            emergency_contact: {
                name: fullPatientData.emergency_contact?.name || '',
                relationship: fullPatientData.emergency_contact?.relationship || '',
                contact_number: fullPatientData.emergency_contact?.contact_number || ''
            }
        });
        
        setSelectedPatient(null);
        setIsEditPatientModalOpen(true);
        
    } catch (error) {
        console.error('Error fetching patient details for edit:', error);
        alert(`Failed to load patient details: ${error.response?.data?.message || error.message}`);
    } finally {
        setEditLoading(false);
    }
};

const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    
    try {
        const updateData = {
            title: editDoctorForm.title,
            first_name: editDoctorForm.first_name,
            last_name: editDoctorForm.last_name,
            specialization: editDoctorForm.specialization,
            gender: editDoctorForm.gender,
            license_number: editDoctorForm.license_number,
            contact_number: editDoctorForm.contact_number,
            schedule_info: editDoctorForm.schedule_info,
            hospital_clinic: editDoctorForm.hospital_clinic
        };
        
        console.log('Updating doctor with ID:', editDoctorForm._id);
        console.log('Update data:', updateData);
        
        let response;
        try {
            response = await createAuthenticatedRequest(
                `/api/doctors/${editDoctorForm._id}`,
                'PATCH',
                updateData
            );
        } catch (patchError) {
            console.log('PATCH failed, trying PUT:', patchError);
            response = await createAuthenticatedRequest(
                `/api/doctors/${editDoctorForm._id}`,
                'PUT',
                updateData
            );
        }
        
        setDoctors(doctors.map(doctor => 
            doctor._id === editDoctorForm._id ? 
            { ...doctor, ...response.data } : doctor
        ));
        
        setIsEditDoctorModalOpen(false);
        setEditDoctorForm({
            _id: '',
            title: '',
            first_name: '',
            last_name: '',
            full_name: '',
            specialization: '',
            gender: '',
            license_number: '',
            contact_number: '',
            schedule_info: '',
            hospital_clinic: ''
        });
        
        alert('Doctor updated successfully!');
    } catch (error) {
        console.error('Error updating doctor:', error);
        console.error('Error response:', error.response?.data);
        alert(`Failed to update doctor: ${error.response?.data?.message || error.message}`);
    } finally {
        setEditLoading(false);
    }
};

const handleUpdatePatient = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    
    try {
        const updateData = {
            first_name: editPatientForm.first_name,
            last_name: editPatientForm.last_name,
            birth_date: editPatientForm.birth_date,
            address: editPatientForm.address,
            contact_number: editPatientForm.contact_number,
            blood_type: editPatientForm.blood_type,
            medical_history: editPatientForm.medical_history,
            allergies: editPatientForm.allergies.split(',').map(item => item.trim()).filter(item => item),
            insurance: editPatientForm.insurance,
            emergency_contact: editPatientForm.emergency_contact
        };
        
        console.log('Updating patient with ID:', editPatientForm._id);
        console.log('Update data:', updateData);
        
        let response;
        const patientId = editPatientForm._id;
        
        try {
            response = await createAuthenticatedRequest(
                `/api/patients/${patientId}`,
                'PATCH',
                updateData
            );
        } catch (patchError) {
            console.log('PATCH failed, trying PUT:', patchError);
            try {
                response = await createAuthenticatedRequest(
                    `/api/patients/${patientId}`,
                    'PUT',
                    updateData
                );
            } catch (putError) {
                console.log('PUT failed, trying alternative endpoint:', putError);
                try {
                    response = await createAuthenticatedRequest(
                        `/api/patients/update/${patientId}`,
                        'POST',
                        updateData
                    );
                } catch (altError) {
                    console.log('Alternative endpoint failed, trying edit endpoint:', altError);
                    response = await createAuthenticatedRequest(
                        `/api/patients/edit/${patientId}`,
                        'POST',
                        updateData
                    );
                }
            }
        }
        
        setPatients(patients.map(patient => 
            patient._id === editPatientForm._id ? 
            { ...patient, ...response.data } : patient
        ));
        
        setIsEditPatientModalOpen(false);
        setEditPatientForm({
            _id: '',
            first_name: '',
            last_name: '',
            birth_date: '',
            address: '',
            contact_number: '',
            blood_type: '',
            medical_history: '',
            allergies: '',
            insurance: '',
            emergency_contact: {
                name: '',
                relationship: '',
                contact_number: ''
            }
        });
        
        alert('Patient updated successfully!');
    } catch (error) {
        console.error('Error updating patient:', error);
        console.error('Error response:', error.response?.data);
        console.error('Available endpoints might be different. Check your backend routes.');
        
        let errorMessage = 'Failed to update patient';
        if (error.response?.status === 404) {
            errorMessage = 'Patient update endpoint not found. Please check if the backend supports patient updates.';
        } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else {
            errorMessage = error.message;
        }
        
        alert(`${errorMessage}. Please contact the system administrator.`);
    } finally {
        setEditLoading(false);
    }
};

const handleDeleteDoctor = async () => {
    if (!selectedDoctor) return;
    
    const confirmDelete = window.confirm(
        `Are you sure you want to delete Dr. ${selectedDoctor.full_name || selectedDoctor.name || 'this doctor'}? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
        setDeleteLoading(true);
        
        await createAuthenticatedRequest(
            `/api/doctors/${selectedDoctor._id}`,
            'DELETE'
        );
        
        setDoctors(doctors.filter(doctor => doctor._id !== selectedDoctor._id));
        setSelectedDoctor(null);
        
        alert('Doctor deleted successfully!');
    } catch (error) {
        console.error('Error deleting doctor:', error);
        alert(`Failed to delete doctor: ${error.response?.data?.message || error.message}`);
    } finally {
        setDeleteLoading(false);
    }
};

const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    
    const confirmDelete = window.confirm(
        `Are you sure you want to delete ${getUserFullName(selectedPatient)}? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
        setDeleteLoading(true);
        
        await createAuthenticatedRequest(
            `/api/patients/${selectedPatient._id}`,
            'DELETE'
        );
        
        setPatients(patients.filter(patient => patient._id !== selectedPatient._id));
        setSelectedPatient(null);
        
        alert('Patient deleted successfully!');
    } catch (error) {
        console.error('Error deleting patient:', error);
        alert(`Failed to delete patient: ${error.response?.data?.message || error.message}`);
    } finally {
        setDeleteLoading(false);
    }
};

const handleDoctorFormChange = (e) => {
    setEditDoctorForm({
        ...editDoctorForm,
        [e.target.name]: e.target.value
    });
};

const handlePatientFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('emergency_contact.')) {
        const field = name.split('.')[1];
        setEditPatientForm({
            ...editPatientForm,
            emergency_contact: {
                ...editPatientForm.emergency_contact,
                [field]: value
            }
        });
    } else {
        setEditPatientForm({
            ...editPatientForm,
            [name]: value
        });
    }
};

// Admin fetch effect
useEffect(() => {
    if (userRole === 'admin' && token) {
        const fetchAllDoctorsAndPatients = async () => {
            setLoadingDoctors(true);
            setLoadingPatients(true);
            setErrorDoctors(null);
            setErrorPatients(null);

            try {
                const doctorsResponse = await createAuthenticatedRequest('/api/doctors');
                setDoctors(doctorsResponse.data);
            } catch (err) {
                setErrorDoctors('Failed to load doctors: ' + (err.response?.data?.message || err.message));
                setDoctors([]);
            } finally {
                setLoadingDoctors(false);
            }

            try {
                const patientsResponse = await createAuthenticatedRequest('/api/patients');
                setPatients(patientsResponse.data);
            } catch (err) {
                setErrorPatients('Failed to load patients: ' + (err.response?.data?.message || err.message));
                setPatients([]);
            } finally {
                setLoadingPatients(false);
            }
        };

        fetchAllDoctorsAndPatients();
    }
}, [userRole, token]);

// Patient emails fetch effect
useEffect(() => {
    const fetchPatientEmails = async () => {
        if (!token || !patients.length || userRole !== 'admin') return;
        
        const emails = {};
        for (const patient of patients) {
            const email = await getPatientEmailFromUser(patient);
            emails[patient._id] = email;
        }
        setPatientEmails(emails);
    };
    
    fetchPatientEmails();
}, [patients, token, userRole]);

// Also add this missing function for redirectToMessages (around line 1450):
const redirectToMessages = (appointmentOrUser) => {
    // Store the appointment or user data for the messages page
    if (appointmentOrUser) {
        sessionStorage.setItem('messageTarget', JSON.stringify({
            targetId: userRole === 'patient' ? appointmentOrUser.doctorId : appointmentOrUser.patientId,
            targetName: userRole === 'patient' ? appointmentOrUser.doctorName : appointmentOrUser.patientName,
            appointmentId: appointmentOrUser._id || appointmentOrUser.id
        }));
    }
    
    // Navigate to messages page
    navigate('/messages');
};

    // Filter appointments for the current user
const userAppointments = appointments.filter(appointment => {
    if (userRole === 'patient') {
        return (
            appointment.patientId === user?._id ||
            (appointment.patientId && appointment.patientId._id === user?._id)
        );
    } else if (userRole === 'doctor') {
        return (
            appointment.doctorId === user?._id ||
            (appointment.doctorId && appointment.doctorId._id === user?._id)
        );
    }
    return false;
});

    return (
        <div className="home-dash-page-root">
            {/* Main Content */}
            <div className="home-dash-main-content">
                {/* Dashboard Header */}
                <div className="home-dash-dashboard-header">
                    <div>
                        <h1 className="home-dash-dashboard-title">Dashboard</h1>
                        <p className="home-dash-dashboard-subtitle">Welcome back! Here's your health overview</p>
                    </div>
                    <div className="home-dash-user-profile">
                        <div className="home-dash-user-info">
                            <h4 className="home-dash-patient-name">{getFormattedUserName()}</h4>
                            <p className="home-dash-patient-email">{user?.email || "No email available"}</p>
                        </div>
                        <div className="home-dash-profile-avatar"
                            onClick={() => {
                                if (userRole !== 'admin') {
                                    navigate('/profile');
                                }
                            }} 
                            style={{ 
                                cursor: userRole === 'admin' ? 'default' : 'pointer' 
                            }}
                            title={userRole === 'admin' ? 'Admin Profile' : 'View Profile'}>
                            {user && (getFormattedUserName().charAt(0) || '?')}
                        </div>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="home-dash-dashboard-content">
    {userRole === 'admin' ? (
        <>
            {/* Admin Dashboard Content */}
            <div className="home-dash-dashboard-main">
                <div className="home-dash-card">
                    <h3 className="home-dash-card-title">Manage Doctors</h3>
                    <div className="home-dash-doctors-list">
                        {loadingDoctors ? (
                            <p className="home-dash-loading-text">Loading doctors...</p>
                        ) : errorDoctors ? (
                            <p className="home-dash-error-text">{errorDoctors}</p>
                        ) : doctors.length > 0 ? (
                            doctors.map(doctor => (
                                <div 
                                    key={doctor._id} 
                                    className="home-dash-doctor-item"
                                    onClick={() => setSelectedDoctor(doctor)}
                                >
                                    <div className="home-dash-doctor-avatar">
                                        {doctor.full_name?.[0] || 'D'}
                                    </div>
                                    <div className="home-dash-doctor-info">
                                        <div className="home-dash-doctor-name">
                                            {doctor.full_name || "Unknown Doctor"}
                                        </div>
                                        <div className="home-dash-doctor-specialization">
                                            {doctor.specialization || doctor.specialty || "General Medicine"}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="home-dash-no-data-text">No doctors available</p>
                        )}
                    </div>
                </div>

                <div className="home-dash-card">
                    <h3 className="home-dash-card-title">Manage Patients</h3>
                    <div className="home-dash-doctors-list">
                        {loadingPatients ? (
                            <p className="home-dash-loading-text">Loading patients...</p>
                        ) : errorPatients ? (
                            <p className="home-dash-error-text">{errorPatients}</p>
                        ) : patients.length > 0 ? (
                            patients.map(patient => (
                                <div 
                                    key={patient._id} 
                                    className="home-dash-doctor-item"
                                    onClick={() => setSelectedPatient(patient)}
                                >
                                    <div className="home-dash-doctor-avatar">
                                        {(patientNames[patient._id] || getUserFullName(patient) || 'P')[0]?.toUpperCase()}
                                    </div>
                                    <div className="home-dash-doctor-info">
                                        <div className="home-dash-doctor-name">
                                            {patientNames[patient._id] || getUserFullName(patient) || 'Loading...'}
                                        </div>
                                        <div className="home-dash-doctor-specialization">
                                            {patient.birth_date ? `DOB: ${new Date(patient.birth_date).toLocaleDateString()}` : 
                                             patient.dateOfBirth ? `DOB: ${new Date(patient.dateOfBirth).toLocaleDateString()}` : 
                                             'Patient'}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="home-dash-no-data-text">No patients available</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="home-dash-dashboard-side">
                <div className="home-dash-card">
                    <h3 className="home-dash-card-title">System Overview</h3>
                    <div className="home-dash-admin-stats">
                        <div className="home-dash-stat-item">
                            <div className="home-dash-stat-value">{doctors.length}</div>
                            <div className="home-dash-stat-label">Doctors</div>
                        </div>
                        <div className="home-dash-stat-item">
                            <div className="home-dash-stat-value">{patients.length}</div>
                            <div className="home-dash-stat-label">Patients</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    ) : (
        <>
            {/* Left/Main Column */}
            <div className="home-dash-dashboard-main">
                {/* Doctors/Patients Section */}
                <div className="home-dash-card">
                    <h3 className="home-dash-card-title">{userRole === 'doctor' ? 'My Patients' : 'Your Doctors'}</h3>
                    {userRole === 'patient' ? (
                        <div className="home-dash-doctors-list">
                            {loadingDoctors ? (
                                <p className="home-dash-loading-text">Loading doctors...</p>
                            ) : errorDoctors ? (
                                <p className="home-dash-error-text">{errorDoctors}</p>
                            ) : doctors.length > 0 ? (
                                doctors.map(doctor => renderDoctorItem(doctor))
                            ) : (
                                <p className="home-dash-no-data-text">No doctors assigned</p>
                            )}
                        </div>
                    ) : (
                        <div className="home-dash-doctors-list">
                            {loadingPatients ? (
                                <p className="home-dash-loading-text">Loading patients...</p>
                            ) : errorPatients ? (
                                <p className="home-dash-error-text">{errorPatients}</p>
                            ) : patients.length === 0 ? (
                                <p className="home-dash-no-data-text">No patients found.</p>
                            ) : (
                                patients.map(patient => (
                                    <div 
                                        key={patient._id} 
                                        className="home-dash-doctor-item"
                                        onClick={() => setSelectedPatient(patient)}
                                    >
                                        <div className="home-dash-doctor-avatar">
                                            {(patientNames[patient._id] || getUserFullName(patient) || 'P')[0]?.toUpperCase()}
                                        </div>
                                        <div className="home-dash-doctor-info">
                                            <div className="home-dash-doctor-name">
                                                {patientNames[patient._id] || getUserFullName(patient) || 'Loading...'}
                                            </div>
                                            <div className="home-dash-doctor-specialization">
                                                {patient.birth_date ? `DOB: ${new Date(patient.birth_date).toLocaleDateString()}` : 
                                                 patient.dateOfBirth ? `DOB: ${new Date(patient.dateOfBirth).toLocaleDateString()}` : 
                                                 'Patient'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Prescriptions Section */}
                <div className="home-dash-card">
                    <h3 className="home-dash-card-title">{userRole === 'doctor' ? 'Prescribed Patients' : 'Prescription & Receipts'}</h3>
                    <div className="home-dash-prescriptions-list">
                        {loading ? (
                            <p className="home-dash-loading-text">Loading prescriptions...</p>
                        ) : error ? (
                            <p className="home-dash-error-text">{error}</p>
                        ) : prescriptions.length > 0 ? (
                            prescriptions
                                .filter(prescription => {
                                    if (userRole === 'patient') {
                                        return (
                                            prescription.patient_id === user._id ||
                                            (prescription.patient_id && prescription.patient_id._id === user._id)
                                        );
                                    } else if (userRole === 'doctor') {
                                        return (
                                            prescription.doctor_id === user._id ||
                                            (prescription.doctor_id && prescription.doctor_id._id === user._id)
                                        );
                                    }
                                    return false;
                                })
                                .map(prescription => (
                                    <div 
                                        key={prescription._id || Math.random().toString()} 
                                        className="home-dash-prescription-item"
                                        onClick={() => setSelectedPrescription(prescription)}
                                    >
                                        <div className="home-dash-prescription-info">
                                            <div className="home-dash-prescription-name">
                                                {prescription.medications && prescription.medications.length > 0 
                                                    ? prescription.medications[0].name
                                                    : prescription.name || "N/A"}
                                            </div>
                                            <div className="home-dash-prescription-date">
                                                {prescription.date instanceof Date && !isNaN(prescription.date) 
                                                    ? prescription.date.toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                      })
                                                    : "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                ))
    ) : (
        <p className="home-dash-no-data-text">No prescriptions available</p>
    )
}
                    </div>
                    
                    {/* Create Prescription Button - For doctors only */}
                    {userRole === 'doctor' && (
                        <div className="home-dash-create-prescription-btn-container">
                            <button 
                                className="home-dash-create-prescription-btn" 
                                onClick={() => setIsPrescriptionModalOpen(true)}
                            >
                                <span className="home-dash-create-prescription-btn-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </span>
                                Create Prescription
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column */}
            <div className="home-dash-dashboard-side">
                {/* Calendar */}
                <div className="home-dash-calendar-container">
                    <div className="home-dash-calendar-header">
                        <button onClick={() => navigateCalendar('PREV')} className="home-dash-calendar-nav-btn">&lt;</button>
                        <h3>{format(calendarDate, 'MMMM yyyy')}</h3>
                        <button onClick={() => navigateCalendar('NEXT')} className="home-dash-calendar-nav-btn">&gt;</button>
                    </div>
                    <div className='home-dash-calendar-widget small-calendar'>
                        <Calendar
                            localizer={localizer}
                            events={userAppointments}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 200 }}
                            views={['month']}
                            dayPropGetter={customDayPropGetter}
                            date={calendarDate}
                            onNavigate={(date) => setCalendarDate(date)}
                            toolbar={false}
                            components={{
                                dateCellWrapper: ({ children, value }) => (
                                    <div className="home-dash-date-cell-wrapper">
                                        {children}
                                        {hasAppointment(value) && <div className="home-dash-appointment-dot"></div>}
                                    </div>
                                ),
                                // Custom event content
                                event: ({ event }) => (
                                    <span className="rbc-event-content">
                                        {event.title}
                                        {event.with && (
                                            <span style={{ display: 'block', fontSize: '0.8em', color: '#eee' }}>
                                                with {event.with}
                                            </span>
                                        )}
                                    </span>
                                ),
                            }}
                        />
                    </div>
                </div>
                
                {/* Upcoming Appointments */}
                <div className="home-dash-upcoming-appointments">
                    <h3>Upcoming Appointments</h3>
                    {loadingAppointments ? (
                        <p className="home-dash-loading-text">Loading appointments...</p>
                    ) : errorAppointments ? (
                        <p className="home-dash-error-text">{errorAppointments}</p>
                    ) : appointments.length > 0 ? (
                        <div className="home-dash-appointments-scroll-container">
                            {appointments
                                .filter(appointment => {
                                    if (userRole === 'patient') {
                                        return (
                                            appointment.patientId === user._id ||
                                            (appointment.patientId && appointment.patientId._id === user._id)
                                        );
                                    } else if (userRole === 'doctor') {
                                        return (
                                            appointment.doctorId === user._id ||
                                            (appointment.doctorId && appointment.doctorId._id === user?._id)
                                        );
                                    }
                                    return false;
                                })
                                .filter((appointment) => new Date(appointment.start) >= new Date())
                                .sort((a, b) => new Date(a.start) - new Date(b.start))
                                .map((appointment, index) => (
                                    <div 
                                        key={appointment.id || index} 
                                        className="home-dash-appointment-card"
                                        onClick={() => setSelectedAppointment(appointment)}
                                    >
                                        <div className="home-dash-appointment-info">
                                            <div className="home-dash-doctor-name">{appointment.title}</div>
                                            <div className="home-dash-appointment-datetime">
                                                {format(new Date(appointment.start), "MMM dd, yyyy • h:mm a")}
                                            </div>
                                            
                                            <div className="home-dash-appointment-with">
                                                with {appointment.with || appointment.doctorName || appointment.patientName}
                                            </div>
                                            {appointment.status && (
                                                <div className={`home-dash-appointment-status ${appointment.status.toLowerCase()}`}>
                                                    Status: {appointment.status}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="home-dash-no-data-text">No upcoming appointments</p>
                    )}
                </div>
            </div>
        </>
    )}
</div>
            </div>

            {/* Prescription Detail Modal */}
            {selectedPrescription && (
                <div className="home-dash-prescription-modal-overlay" onClick={handleModalClick}>
                    <div className="home-dash-prescription-modal">
                        <div className="home-dash-prescription-modal-header">
                            <h3>Prescription Details</h3>
                        </div>
                        <div className="home-dash-prescription-modal-body">
                            <div className="home-dash-prescription-detail">
                                <p><strong>Date:</strong> {
                                    selectedPrescription.date instanceof Date && !isNaN(selectedPrescription.date) ? 
                                    selectedPrescription.date.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : 'No date'
                                }</p>
                                <p><strong>{userRole === 'patient' ? 'Doctor:' : 'Patient:'}</strong> {
                                    userRole === 'patient' ? selectedPrescription.doctorName : selectedPrescription.patientName
                                }</p>
                                <p><strong>Prescription:</strong> {selectedPrescription.prescription || 'No prescription provided'}</p>
                                
                                <h4>Medications:</h4>
                                <div className="home-dash-medications-list">
                                    {selectedPrescription.medications && selectedPrescription.medications.length > 0 ? 
                                        selectedPrescription.medications.map((med, index) => (
                                            <div key={index} className="home-dash-medication-item">
                                                <h5>{med.name} ({med.dosage})</h5>
                                                <p>Frequency: {med.frequency}</p>
                                                <p>Duration: {med.duration}</p>
                                            </div>
                                        )) : 
                                        <p>No medications listed</p>
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="home-dash-prescription-modal-footer">
                            <button className="home-dash-print-btn" onClick={() => window.print()}>Print</button>
                            <button className="home-dash-close-btn" onClick={() => setSelectedPrescription(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Doctor Detail Modal */}
            {selectedDoctor && userRole === 'patient' && (
                <div className="home-dash-doctor-modal-overlay" onClick={handleModalClick}>
                    <div className="home-dash-doctor-modal">
                        <div className="home-dash-doctor-modal-header">
                            <h3>Doctor Details</h3>
                        </div>
                        <div className="home-dash-doctor-modal-body">
                            <div className="home-dash-doctor-detail">
                                <p><strong>Name:</strong> {selectedDoctor.full_name || selectedDoctor.name}</p>
                                <p><strong>Specialization:</strong> {selectedDoctor.specialization || selectedDoctor.specialty || "Not specified"}</p>
                                {selectedDoctor.email && <p><strong>Email:</strong> {selectedDoctor.email}</p>}
                                {selectedDoctor.phone && <p><strong>Phone:</strong> {selectedDoctor.phone}</p>}
                                {selectedDoctor.hospital && <p><strong>Hospital:</strong> {selectedDoctor.hospital}</p>}
                            </div>
                            {/* Upcoming Appointment Section */}
                            {appointments.length > 0 && (
                                <div className="home-dash-upcoming-appointment-section">
                                    <h4>Upcoming Appointment</h4>
                                    {appointments
                                        .filter(
                                            (appointment) =>
                                                appointment.doctorId === selectedDoctor._id &&
                                                new Date(appointment.start) >= new Date()
                                        )
                                        .sort((a, b) => new Date(a.start) - new Date(b.start))
                                        .slice(0, 1)
                                        .map((appointment) => (
                                            <div key={appointment._id} className="home-dash-upcoming-appointment-details">
                                                <p><strong>Date & Time:</strong> {format(new Date(appointment.start), 'MMM dd, yyyy • h:mm a')}</p>
                                                {appointment.notes && <p><strong>Notes:</strong> {appointment.notes}</p>}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                        <div className="home-dash-doctor-modal-footer">
                            <button className="home-dash-close-btn" onClick={() => setSelectedDoctor(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Doctor Detail Modal for Admin */}
            {selectedDoctor && userRole === 'admin' && (
    <div className="home-dash-doctor-modal-overlay" onClick={handleModalClick}>
        <div className="home-dash-doctor-modal">
            <div className="home-dash-doctor-modal-header">
                <h3>Doctor Details</h3>
            </div>
            <div className="home-dash-doctor-modal-body">
                <div className="home-dash-doctor-detail">
                    <p><strong>Name:</strong> {selectedDoctor.full_name || selectedDoctor.name || "Unknown"}</p>
                    <p><strong>Specialization:</strong> {selectedDoctor.specialization || selectedDoctor.specialty || "Not specified"}</p>
                    {selectedDoctor.email && <p><strong>Email:</strong> {selectedDoctor.email}</p>}
                    {selectedDoctor.phone && <p><strong>Phone:</strong> {selectedDoctor.phone}</p>}
                    {selectedDoctor.hospital && <p><strong>Hospital:</strong> {selectedDoctor.hospital}</p>}
                    {selectedDoctor.schedule && <p><strong>Schedule:</strong> {selectedDoctor.schedule}</p>}
                    {selectedDoctor.user_id && <p><strong>User ID:</strong> {selectedDoctor.user_id}</p>}
                </div>
            </div>
            <div className="home-dash-doctor-modal-footer">
                <button 
                    className="home-dash-edit-btn" 
                    onClick={handleEditDoctor}
                    disabled={editLoading}
                >
                    {editLoading ? 'Loading...' : 'Edit'}
                </button>
                <button 
                    className="home-dash-delete-btn" 
                    onClick={handleDeleteDoctor}
                    disabled={deleteLoading}
                >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
                <button className="home-dash-close-btn" onClick={() => setSelectedDoctor(null)}>Close</button>
            </div>
        </div>
    </div>
)}

{/* Patient Detail Modal for Admin */}
{selectedPatient && userRole === 'admin' && (
    <div className="home-dash-doctor-modal-overlay" onClick={handleModalClick}>
        <div className="home-dash-doctor-modal">
            <div className="home-dash-modal-header">
                <h3>Patient Details</h3>
            </div>
            <div className="home-dash-doctor-modal-body">
                <div className="home-dash-doctor-detail">
                    <p><strong>Name:</strong> {getUserFullName(selectedPatient)}</p>
                    {selectedPatient.dateOfBirth && (
                        <p><strong>Date of Birth:</strong> {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}</p>
                    )}
                    {selectedPatient.email && <p><strong>Email:</strong> {selectedPatient.email}</p>}
                    {!selectedPatient.email && selectedPatient.user && selectedPatient.user.email && (
                        <p><strong>Email:</strong> {selectedPatient.user.email}</p>
                    )}
                    {selectedPatient.phone && <p><strong>Phone:</strong> {selectedPatient.phone}</p>}
                    {selectedPatient.address && <p><strong>Address:</strong> {selectedPatient.address}</p>}
                    {selectedPatient.user_id && <p><strong>User ID:</strong> {selectedPatient.user_id}</p>}
                </div>
            </div>
            <div className="home-dash-doctor-modal-footer">
                <button 
                    className="home-dash-edit-btn" 
                    onClick={handleEditPatient}
                    disabled={editLoading}
                >
                    {editLoading ? 'Loading...' : 'Edit'}
                </button>
                <button 
                    className="home-dash-delete-btn" 
                    onClick={handleDeletePatient}
                    disabled={deleteLoading}
                >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
                <button className="home-dash-close-btn" onClick={() => setSelectedPatient(null)}>Close</button>
            </div>
        </div>
    </div>
)}

{/* Patient Detail Modal for Doctor */}
{selectedPatient && userRole === 'doctor' && (
    <div className="home-dash-doctor-modal-overlay" onClick={handleModalClick}>
        <div className="home-dash-doctor-modal">
            <div className="home-dash-doctor-modal-header">
                <h3>Patient Details</h3>
            </div>
            <div className="home-dash-doctor-modal-body">
                <div className="home-dash-doctor-detail">
                    <p><strong>Name:</strong> {getUserFullName(selectedPatient)}</p>
                    {selectedPatient.birth_date && (
                        <p><strong>Date of Birth:</strong> {new Date(selectedPatient.birth_date).toLocaleDateString()}</p>
                    )}
                    {selectedPatient.dateOfBirth && (
                        <p><strong>Date of Birth:</strong> {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}</p>
                    )}
                    {selectedPatient.contact_number && <p><strong>Phone:</strong> {selectedPatient.contact_number}</p>}
                    {selectedPatient.address && <p><strong>Address:</strong> {selectedPatient.address}</p>}
                    {selectedPatient.blood_type && <p><strong>Blood Type:</strong> {selectedPatient.blood_type}</p>}
                    {selectedPatient.medical_history && <p><strong>Medical History:</strong> {selectedPatient.medical_history}</p>}
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                        <p><strong>Allergies:</strong> {selectedPatient.allergies.join(', ')}</p>
                    )}
                </div>
                {/* Upcoming Appointment Section */}
                {appointments.length > 0 && (
                    <div className="home-dash-upcoming-appointment-section">
                        <h4>Upcoming Appointment</h4>
                        {appointments
                            .filter(
                                (appointment) =>
                                    appointment.patientId === selectedPatient._id &&
                                    new Date(appointment.start) >= new Date()
                            )
                            .sort((a, b) => new Date(a.start) - new Date(b.start))
                            .slice(0, 1)
                            .map((appointment) => (
                                <div key={appointment._id} className="home-dash-upcoming-appointment-details">
                                    <p><strong>Date & Time:</strong> {format(new Date(appointment.start), 'MMM dd, yyyy • h:mm a')}</p>
                                    {appointment.notes && <p><strong>Notes:</strong> {appointment.notes}</p>}
                                </div>
                            ))}
                    </div>
                )}
            </div>
            <div className="home-dash-doctor-modal-footer">
                
                <button className="home-dash-close-btn" onClick={() => setSelectedPatient(null)}>Close</button>
            </div>
        </div>
    </div>
)}

            {/* Appointment Detail Modal */}
            {selectedAppointment && (
                <div className="home-dash-appointment-modal-overlay" onClick={handleModalClick}>
                    <div className="home-dash-appointment-modal">
                        <div className="home-dash-appointment-modal-header">
                            <h3>Appointment Details</h3>
                        </div>
                        <div className="home-dash-appointment-modal-body">
                            <div className="home-dash-appointment-detail">
                                <p><strong>Date & Time:</strong> {
                                    selectedAppointment.start ? 
                                    format(new Date(selectedAppointment.start), 'MMMM d, yyyy • h:mm a') : 
                                    'Time not specified'
                                }</p>
                                
                                <p><strong>Type:</strong> {selectedAppointment.title || 'Regular Checkup'}</p>
                                
                                <p><strong>With:</strong> {selectedAppointment.with || 'Not specified'}</p>
                                
                                {selectedAppointment.location && (
                                    <p><strong>Location:</strong> {selectedAppointment.location}</p>
                                )}
                                
                                {selectedAppointment.status && (
                                    <p><strong>Status:</strong>
                                        <span className={`home-dash-appointment-status ${selectedAppointment.status.toLowerCase()}`}>
                                            {selectedAppointment.status}
                                        </span>
                                    </p>
                                )}
                                
                                {selectedAppointment.notes && (
                                    <div className="home-dash-appointment-notes">
                                        <h4>Notes:</h4>
                                        <p>{selectedAppointment.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="home-dash-appointment-modal-footer">
                            <button 
                                className="home-dash-join-call-btn"
                                onClick={() => redirectToMessages(selectedAppointment)}
                            >
                                Join call
                            </button>
                            <button className="home-dash-close-btn" onClick={() => setSelectedAppointment(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Incoming Call Notification (Modal or Toast) */}
            {incomingCall && (
                <div className="home-dash-incoming-call-overlay">
                    <div className="home-dash-incoming-call-modal">
                        <div className="home-dash-incoming-call-header">
                            <h3>Incoming Call</h3>
                        </div>
                        <div className="home-dash-incoming-call-body">
                            <p>Call from: {incomingCall.callerName}</p>
                        </div>
                        <div className="home-dash-incoming-call-footer">
                            <button 
                                className="home-dash-accept-call-btn"
                                onClick={() => {
                                    // Stop ringtone if playing
                                    if (ringToneRef.current) {
                                        ringToneRef.current.pause();
                                        ringToneRef.current.currentTime = 0;
                                    }
                                    
                                    // Navigate to video call page
                                    navigate('/videocall');
                                }}
                            >
                                Accept
                            </button>
                            <button 
                                className="home-dash-decline-call-btn"
                                onClick={() => setIncomingCall(null)}
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ringtone for incoming call */}
            <audio ref={ringToneRef} src="/path/to/ringtone.mp3" preload="auto" />

            {/* Create New Prescription Modal */}
            {isPrescriptionModalOpen && (
  <div className="home-dash-modal-overlay" onClick={() => setIsPrescriptionModalOpen(false)}>
    <div className="home-dash-prescription-modal" onClick={e => e.stopPropagation()}>
      <div className="home-dash-modal-header">
        <h3>Create New Prescription</h3>
      </div>

      <form onSubmit={handlePrescriptionSubmit} className="home-dash-prescription-form">
        <div className="home-dash-form-group">
          <label>Doctor</label>
          <input 
            type="text" 
            value={user ? `Doctor ID: ${user._id}` : 'Loading...'} 
            disabled 
            className="home-dash-form-control"
          />
        </div>
        
        <div className="home-dash-form-group">
          <label>Patient</label>
          <div className="home-dash-form-control-select">
            <select 
              name="patient_id" 
              value={prescriptionForm.patient_id || ''} 
              onChange={handlePrescriptionFormChange}
              className="home-dash-form-control"
              required
            >
              <option value="">Select patient</option>
              {patients.map(patient => (
                <option key={patient._id} value={patient._id}>
                  {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>
            <span className="home-dash-select-arrow">▼</span>
          </div>
        </div>
        
        <div className="home-dash-form-group">
          <label>Prescription Details</label>
          <textarea 
            name="prescription" 
            value={prescriptionForm.prescription} 
            onChange={handlePrescriptionFormChange}
            className="home-dash-form-control"
            required
            placeholder="Enter prescription details"
          ></textarea>
        </div>
        
        <div className="home-dash-form-group">
          <label>Remarks</label>
          <textarea 
            name="remarks" 
            value={prescriptionForm.remarks} 
            onChange={handlePrescriptionFormChange}
            className="home-dash-form-control"
            placeholder="Add any remarks (optional)"
          ></textarea>
        </div>

        <div className="home-dash-medications-section">
          <div className="home-dash-medications-header">
            <h4>Medications</h4>
            <button 
              type="button" 
              className="home-dash-add-medication-btn"
              onClick={addMedication}
            >
              + Add
            </button>
          </div>
          
          {prescriptionForm.medications.map((medication, index) => (
            <div className="home-dash-medication-item" key={index}>
              <div className="home-dash-medication-number">#{index + 1}</div>
              
              <div className="home-dash-medication-inputs">
                <input 
                  type="text"
                  value={medication.name} 
                  onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                  className="home-dash-form-control"
                  required
                  placeholder="Medication name"
                />
                
                <input 
                  type="text"
                  value={medication.dosage} 
                  onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                  className="home-dash-form-control"
                  required
                  placeholder="Dosage"
                />
                
                <input 
                  type="text"
                  value={medication.frequency} 
                  onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                  className="home-dash-form-control"
                  required
                  placeholder="Frequency"
                />
                
                <input 
                  type="text"
                  value={medication.duration} 
                  onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                  className="home-dash-form-control"
                  required
                  placeholder="Duration"
                />
              </div>
              
              {index > 0 && (
                <button 
                  type="button" 
                  className="home-dash-remove-medication-btn"
                  onClick={() => removeMedication(index)}
                  style={{
                    position: 'absolute', 
                    right: '-10px',
                    top: '-10px',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#ff5252',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        
        <div className="home-dash-modal-footer">
          <button 
            type="button" 
            className="home-dash-cancel-btn" 
            onClick={() => setIsPrescriptionModalOpen(false)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="home-dash-create-btn"
          >
            Create Prescription
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Edit Doctor Modal - Admin */}
{isEditDoctorModalOpen && (
    <div className="home-dash-modal-overlay" onClick={() => setIsEditDoctorModalOpen(false)}>
        <div className="home-dash-doctor-modal" onClick={e => e.stopPropagation()}>
            <div className="home-dash-modal-header">
                <h3>Edit Doctor</h3>
            </div>

            <form onSubmit={(e) => { 
                handleUpdateDoctor(e); 
                setIsEditDoctorModalOpen(false); // Close modal on submit
            }} className="home-dash-doctor-form">
                <div className="home-dash-form-group">
                    <label>First Name</label>
                    <input 
                        type="text" 
                        name="first_name"
                        value={editDoctorForm.first_name}
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                        required
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Last Name</label>
                    <input 
                        type="text" 
                        name="last_name"
                        value={editDoctorForm.last_name}
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                        required
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Title</label>
                    <input 
                        type="text" 
                        name="title"
                        value={editDoctorForm.title}
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                        placeholder="Dr., Prof., etc."
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Specialization</label>
                    <input 
                        type="text" 
                        name="specialization"
                        value={editDoctorForm.specialization}
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                        placeholder="e.g. Cardiology, Dermatology"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Gender</label>
                    <select 
                        name="gender" 
                        value={editDoctorForm.gender} 
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                    >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div className="home-dash-form-group">
                    <label>License Number</label>
                    <input 
                        type="text" 
                        name="license_number"
                        value={editDoctorForm.license_number}
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                        placeholder="Medical license number"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Contact Number</label>
                    <input 
                        type="text" 
                        name="contact_number"
                        value={editDoctorForm.contact_number}
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                        placeholder="Phone number"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Schedule Info</label>
                    <textarea 
                        name="schedule_info" 
                        value={editDoctorForm.schedule_info} 
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                        placeholder="Enter schedule information"
                    ></textarea>
                </div>
                
                <div className="home-dash-form-group">
                    <label>Hospital/Clinic</label>
                    <input 
                        type="text" 
                        name="hospital_clinic"
                        value={editDoctorForm.hospital_clinic}
                        onChange={handleDoctorFormChange}
                        className="home-dash-form-control"
                        placeholder="Associated hospital or clinic"
                    />
                </div>

                <div className="home-dash-modal-footer">
                    <button 
                        type="button" 
                        className="home-dash-cancel-btn" 
                        onClick={() => setIsEditDoctorModalOpen(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="home-dash-update-btn"
                        disabled={editLoading}
                    >
                        {editLoading ? 'Updating...' : 'Update Doctor'}
                    </button>
                </div>
            </form>
        </div>
    </div>
)}

{/* Edit Patient Modal - Admin */}
{isEditPatientModalOpen && (
    <div className="home-dash-modal-overlay" onClick={() => setIsEditPatientModalOpen(false)}>
        <div className="home-dash-doctor-modal" onClick={e => e.stopPropagation()}>
            <div className="home-dash-modal-header">
                <h3>Edit Patient</h3>
            </div>

            <form onSubmit={(e) => { 
                handleUpdatePatient(e); 
                setIsEditPatientModalOpen(false); // Close modal on submit
            }} className="home-dash-doctor-form">
                <div className="home-dash-form-group">
                    <label>First Name</label>
                    <input 
                        type="text" 
                        name="first_name"
                        value={editPatientForm.first_name}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        required
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Last Name</label>
                    <input 
                        type="text" 
                        name="last_name"
                        value={editPatientForm.last_name}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        required
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Birth Date</label>
                    <input 
                        type="date" 
                        name="birth_date"
                        value={editPatientForm.birth_date}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Address</label>
                    <input 
                        type="text" 
                        name="address"
                        value={editPatientForm.address}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Contact Number</label>
                    <input 
                        type="text" 
                        name="contact_number"
                        value={editPatientForm.contact_number}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Blood Type</label>
                    <input 
                        type="text" 
                        name="blood_type"
                        value={editPatientForm.blood_type}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        placeholder="e.g. A+, O-"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Medical History</label>
                    <textarea 
                        name="medical_history" 
                        value={editPatientForm.medical_history} 
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        placeholder="Enter medical history details"
                    ></textarea>
                </div>
                
                <div className="home-dash-form-group">
                    <label>Allergies</label>
                    <input 
                        type="text" 
                        name="allergies"
                        value={editPatientForm.allergies}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        placeholder="e.g. Penicillin, Nuts"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Insurance</label>
                    <input 
                        type="text" 
                        name="insurance"
                        value={editPatientForm.insurance}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        placeholder="Insurance provider or policy number"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Emergency Contact</label>
                    <input 
                        type="text" 
                        name="emergency_contact.name"
                        value={editPatientForm.emergency_contact.name}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        placeholder="Contact person name"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Relationship</label>
                    <input 
                        type="text" 
                        name="emergency_contact.relationship"
                        value={editPatientForm.emergency_contact.relationship}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        placeholder="Relationship to contact person"
                    />
                </div>
                
                <div className="home-dash-form-group">
                    <label>Emergency Contact Number</label>
                    <input 
                        type="text" 
                        name="emergency_contact.contact_number"
                        value={editPatientForm.emergency_contact.contact_number}
                        onChange={handlePatientFormChange}
                        className="home-dash-form-control"
                        placeholder="Emergency contact phone number"
                    />
                </div>

                <div className="home-dash-modal-footer">
                    <button 
                        type="button" 
                        className="home-dash-cancel-btn" 
                        onClick={() => setIsEditPatientModalOpen(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="home-dash-update-btn"
                        disabled={editLoading}
                    >
                        {editLoading ? 'Updating...' : 'Update Patient'}
                    </button>
                </div>
            </form>
        </div>
    </div>
)}

{/* Toast Notification for Prescription Success */}
{prescriptionSuccess && (
  <div
    style={{
      position: 'fixed',
      top: '32px',
      right: '32px',
      zIndex: 9999,
      background: '#4caf50',
      color: 'white',
      padding: '16px 28px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontWeight: 'bold',
      fontSize: '1.1em',
      transition: 'opacity 0.3s'
    }}
  >
    Prescription created successfully!
  </div>
)}
        </div>
    );
};

export default Home;