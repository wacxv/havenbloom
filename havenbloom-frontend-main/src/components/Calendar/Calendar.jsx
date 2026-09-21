import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { IoCall } from 'react-icons/io5';

import './Calendar.css';

const demoCalendarUser = { _id: 'demo-patient', role: 'patient', first_name: 'Elena', last_name: 'Carter', email: 'elena.carter@example.com' };
const demoCalendarAppointments = [{ _id: 'demo-calendar-1', id: 'demo-calendar-1', title: 'Dr. Amelia Carter', start: new Date('2025-06-15T09:00:00'), end: new Date('2025-06-15T10:00:00'), doctorId: 'demo-doctor-1', patientId: 'demo-patient', doctorName: 'Dr. Amelia Carter', patientName: 'Elena Carter', status: 'scheduled', notes: 'Prenatal checkup', with: 'Dr. Amelia Carter' }, { _id: 'demo-calendar-2', id: 'demo-calendar-2', title: 'Dr. Noah Williams', start: new Date('2025-06-16T11:30:00'), end: new Date('2025-06-16T12:30:00'), doctorId: 'demo-doctor-2', patientId: 'demo-patient', doctorName: 'Dr. Noah Williams', patientName: 'Elena Carter', status: 'scheduled', notes: 'Ultrasound review', with: 'Dr. Noah Williams' }];


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

const Calendar = () => {
    const navigate = useNavigate();
    
    // User and authentication state
    const [user, setUser] = useState(demoCalendarUser);
    const [userRole, setUserRole] = useState('patient');
    const [token, setToken] = useState(null);
    
    // Calendar and appointments state
    const [appointments, setAppointments] = useState(demoCalendarAppointments);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Create appointment state
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [createAppointmentLoading, setCreateAppointmentLoading] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        patient_id: '',
        doctor_id: '',
        appointment_date: new Date(),
        description: '',
        is_available: false
    });
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Create calendar localizer
    const locales = { 'en-US': enUS };
    const localizer = dateFnsLocalizer({
        format,
        parse,
        startOfWeek,
        getDay,
        locales
    });

    // Load user data from localStorage on component mount
    useEffect(() => {
        try {
            setUser(demoCalendarUser);
            setUserRole('patient');
            setToken(null);
        } catch (err) {
            console.error("Error loading user data:", err);
            toast.error("Error loading user data. Please refresh or sign in again.");
        }
    }, [navigate]);

    // Fetch latest user details from API
    useEffect(() => {
        const fetchUserDetails = async () => {
            if (!user || !user._id || !userRole || !token) return;
            
            try {
                const endpoint = userRole === 'doctor'
                    ? `/api/doctors/user/${user._id}`
                    : `/api/patients/user/${user._id}`;

                const response = await axios.get(`https://havenbloom-api.onrender.com${endpoint}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                setUser(prev => ({ ...prev, ...response.data }));
            } catch (error) {
                console.error(`Error fetching ${userRole} details:`, error);
            }
        };
        
        fetchUserDetails();
    }, [user?._id, userRole, token]);

    // Fetch appointments from API
    useEffect(() => {
        if (!user || !user._id || !userRole || !token) {
            return;
        }
        
        setLoading(true);
        
        const endpoint = userRole === 'doctor'
            ? `/api/appointments?doctor_id=${user._id}`
            : `/api/appointments?patient_id=${user._id}`;
            
        console.log(`Fetching appointments from: ${endpoint}`);

        axios.get(`https://havenbloom-api.onrender.com${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => {
                const formattedAppointments = response.data.map(appt => {
                    // Extract doctor info
                    const doctorId = appt.doctor_id?._id || appt.doctor_id;
                    const doctorName = appt.doctor_id?.full_name || 
                                     (appt.doctor_id?.first_name && appt.doctor_id?.last_name ? 
                                     `Dr. ${appt.doctor_id.first_name} ${appt.doctor_id.last_name}`.trim() : 
                                     appt.doctorName || "Doctor");
                    
                    // Extract patient info
                    const patientId = appt.patient_id?._id || appt.patient_id;
                    const patientName = appt.patient_id?.full_name || 
                                      (appt.patient_id?.first_name && appt.patient_id?.last_name ? 
                                      `${appt.patient_id.first_name} ${appt.patient_id.last_name}`.trim() : 
                                      appt.patientName || "Patient");
                    
                    // Display name based on user role
                    const withPerson = userRole === 'doctor' ? patientName : doctorName;
                    const title = appt.description || appt.title || "Appointment";
                    
                    return {
                        _id: appt._id,
                        id: appt._id,
                        title: withPerson,
                        start: new Date(appt.appointment_date || appt.date_time),
                        end: addHours(new Date(appt.appointment_date || appt.date_time), 1),
                        doctorId: doctorId,
                        patientId: patientId,
                        doctorName: doctorName,
                        patientName: patientName,
                        status: appt.status || "scheduled",
                        notes: appt.description || title,
                        with: withPerson
                    };
                }).filter(appt => appt.start && !isNaN(appt.start));
                
                setAppointments(formattedAppointments);
                setError(null);
            })
            .catch(err => {
                console.error("Error fetching appointments:", err);
                setError(`Failed to load appointments: ${err.message || 'Unknown error'}`);
                setAppointments([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [user, userRole, token]);
    
    // Fetch doctors or patients for appointment creation
    useEffect(() => {
    if (!user || !user._id || !userRole || !token) return;
    
    const fetchContactsForAppointments = async () => {
        try {
            if (userRole === 'patient') {
                // Fetch doctors only assigned to this patient
                const response = await axios.get(
                    `https://havenbloom-api.onrender.com/api/assignments/patient/${user._id}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                setDoctors(response.data.map(a => a.doctor_id)); // each assignment has doctor_id
            } else if (userRole === 'doctor') {
                // Fetch patients only assigned to this doctor
                const response = await axios.get(
                    `https://havenbloom-api.onrender.com/api/assignments/doctor/${user._id}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                setPatients(response.data.map(a => a.patient_id)); // each assignment has patient_id
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
            toast.error('Could not load contacts for appointment creation');
        }
    };
    
    fetchContactsForAppointments();
}, [user, userRole, token]);

    // Handler to navigate to messages with the contact
    const handleContactMessage = (appointment) => {
        if (!user || !appointment) {
            console.error("Cannot open conversation: missing data", { appointment, user });
            return;
        }

        try {
            // Determine the contact ID based on user role
            const contactId = userRole === 'patient' ? appointment.doctorId : appointment.patientId;
            
            // Navigate to messages with the contact ID as a query parameter
            navigate(`/messages?contact=${contactId}`);
        } catch (error) {
            console.error('Error navigating to conversation:', error);
            toast.error('Failed to open conversation');
        }
    };
    
    // Handler for form input changes
    const handleNewAppointmentChange = (e) => {
        const { name, value } = e.target;
        setNewAppointment(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Handler for form submission
    const handleCreateAppointment = async (e) => {
        e.preventDefault();
        setCreateAppointmentLoading(true);
        
        try {
            // Set the patient_id or doctor_id based on user role
            let appointmentData = { ...newAppointment };
            if (userRole === 'patient') {
                appointmentData.patient_id = user._id;
            } else if (userRole === 'doctor') {
                appointmentData.doctor_id = user._id;
            }
            
            // Format the date for the API
            if (appointmentData.appointment_date instanceof Date) {
                appointmentData.appointment_date = appointmentData.appointment_date.toISOString();
            }
            
            // Send the request
            const response = await axios.post(
                'https://havenbloom-api.onrender.com/api/appointments/create',
                appointmentData,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            toast.success('Appointment created successfully!');
            
            // Close the modal
            setShowAppointmentModal(false);
            
            // Reset the form
            setNewAppointment({
                patient_id: '',
                doctor_id: '',
                appointment_date: new Date(),
                description: '',
                is_available: false
            });
            
            // Get the other party's name for display
            let otherPartyName = "";
            if (userRole === 'doctor' && appointmentData.patient_id) {
                const patient = patients.find(p => p._id === appointmentData.patient_id);
                otherPartyName = patient ? 
                    `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 
                    "Patient";
            } else if (userRole === 'patient' && appointmentData.doctor_id) {
                const doctor = doctors.find(d => d._id === appointmentData.doctor_id);
                otherPartyName = doctor ? 
                    `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() : 
                    "Doctor";
            }
            
            // Add the new appointment to the calendar
            const newAppointmentFormatted = {
                _id: response.data._id,
                id: response.data._id,
                title: otherPartyName,
                start: new Date(response.data.appointment_date),
                end: addHours(new Date(response.data.appointment_date), 1),
                doctorId: response.data.doctor_id,
                patientId: response.data.patient_id,
                status: "scheduled",
                notes: response.data.description,
            };
            
            setAppointments(prev => [...prev, newAppointmentFormatted]);
            
        } catch (error) {
            console.error('Error creating appointment:', error);
            toast.error(error.response?.data?.message || 'Failed to create appointment');
        } finally {
            setCreateAppointmentLoading(false);
        }
    };

    // Handle status change for an appointment
    const handleStatusChange = async (appointment, newStatus) => {
        if (!appointment || !appointment._id) return;
        
        setUpdatingStatus(true);
        
        try {
            // Update the appointment status in the API
            const response = await axios.patch(
                `https://havenbloom-api.onrender.com/api/appointments/${appointment._id}`,
                { 
                    status: newStatus,
                    appointment_id: appointment._id
                },
                { 
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    } 
                }
            );
            
            // Update the local appointment state
            setAppointments(prev => 
                prev.map(appt => 
                    appt._id === appointment._id ? { ...appt, status: newStatus } : appt
                )
            );
            
            // Also update the selected appointment if it's the same one
            if (selectedAppointment && selectedAppointment._id === appointment._id) {
                setSelectedAppointment(prev => ({ ...prev, status: newStatus }));
            }
            
            toast.success(`Appointment ${newStatus} successfully`);
        } catch (error) {
            console.error('Error updating appointment status:', error);
            
            // Log more details about the error
            if (error.response) {
                console.error('Error response:', error.response.data);
                console.error('Error status:', error.response.status);
                toast.error(error.response.data?.message || `Failed to update appointment status: ${error.response.status}`);
            } else {
                toast.error('Failed to update appointment status');
            }
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Get upcoming appointments (sorted by date) and only assigned to the user
    const upcomingAppointments = appointments
        .filter(apt => {
            if (userRole === 'doctor') {
                return apt.doctorId === user._id || (apt.doctorId && apt.doctorId._id === user._id);
            } else if (userRole === 'patient') {
                return apt.patientId === user._id || (apt.patientId && apt.patientId._id === user._id);
            }
            return false;
        })
        .filter(apt => new Date(apt.start) > new Date())
        .filter(apt => apt.status !== 'cancelled' && apt.status !== 'completed') // Exclude cancelled and completed
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    // Get appointment history (cancelled and completed appointments)
    const appointmentHistory = appointments
        .filter(apt => {
            if (userRole === 'doctor') {
                return apt.doctorId === user._id || (apt.doctorId && apt.doctorId._id === user._id);
            } else if (userRole === 'patient') {
                return apt.patientId === user._id || (apt.patientId && apt.patientId._id === user._id);
            }
            return false;
        })
        .filter(apt => apt.status === 'cancelled' || apt.status === 'completed')
        .sort((a, b) => new Date(b.start) - new Date(a.start)); // Sort by most recent first

    // Calendar event styling
    const eventStyleGetter = () => ({
        style: {
            backgroundColor: '#D67AB1',
            borderRadius: '4px',
            opacity: 0.8,
            color: 'white',
            border: '0',
            display: 'block'
        }
    });

    return (
        <div className="calendar-page">
            <div className="main-content">
                {/* Dashboard header */}
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">Calendar</h1>
                        <p className="dashboard-subtitle">Manage your appointments and schedule</p>
                    </div>
                    <div className="user-profile">
                        <div className="user-info">
                            <h4 className="patient-name">{getUserFullName(user)}</h4>
                            <p className="patient-email">{user?.email || 'user@example.com'}</p>
                        </div>
                        <div className="profile-avatar" onClick={() => navigate('/profile')} 
            style={{ cursor: 'pointer' }}
            title="View Profile"></div>
                    </div>
                </div>
                
                {/* Calendar content */}
                <div className="calendar-content-inner">
                    {/* Calendar section */}
                    <div className="calendar-section">
                        <div className="calendar-header">
                            <h2>{format(calendarDate, 'MMMM yyyy')}</h2>
                        </div>
                        
                        <div className="month-calendar-container">
                            {loading ? (
                                <div className="loading-container">Loading calendar...</div>
                            ) : (
                                <BigCalendar
                                    localizer={localizer}
                                    events={appointments.filter(apt => {
                                        if (userRole === 'doctor') {
                                            return apt.doctorId === user._id || (apt.doctorId && apt.doctorId._id === user._id);
                                        } else if (userRole === 'patient') {
                                            return apt.patientId === user._id || (apt.patientId && apt.patientId._id === user._id);
                                        }
                                        return false;
                                    })}
                                    startAccessor="start"
                                    endAccessor="end"
                                    views={['month']}
                                    defaultView="month"
                                    date={calendarDate}
                                    onNavigate={date => setCalendarDate(date)}
                                    toolbar={false}
                                    eventPropGetter={eventStyleGetter}
                                />
                            )}
                        </div>
                    </div>
                    
                    {/* Upcoming appointments */}
                    <div className="upcoming-appointments">
                        <div className="section-title">Upcoming Appointments 
                            {/* Create New Appointment Button - Only for Doctors */}
                            {userRole === 'doctor' && (
                                <div className="create-appointment-button-container">
                                    <button 
                                        className="create-appointment-btn" 
                                        onClick={() => setShowAppointmentModal(true)}
                                    >
                                        Create New Appointment
                                    </button>
                                </div>
                            )}

                            {/* Book Appointment Button - Only for Patients */}
                            {userRole === 'patient' && (
                                <div className="create-appointment-button-container">
                                    <button 
                                        className="create-appointment-btn" 
                                        onClick={() => setShowAppointmentModal(true)}
                                    >
                                        Book Appointment
                                    </button>
                                </div>
                            )}

                            {/* Create/Book Appointment Modal */}
                            {showAppointmentModal && (
                                <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
                                    <div className="create-appointment-modal" onClick={e => e.stopPropagation()}>
                                        <div className="modal-header">
                                            <h3>{userRole === 'doctor' ? 'Schedule New Appointment' : 'Book Appointment'}</h3>
                                            <button 
                                                className="modal-close-btn" 
                                                onClick={() => setShowAppointmentModal(false)}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                        
                                        <div className="modal-body">
                                            <form onSubmit={handleCreateAppointment} className="create-appointment-form">
                                                {/* Doctor Selection - For Patients */}
                                                {userRole === 'patient' && (
                                                    <div className="form-group">
                                                        <label htmlFor="doctor_id">Select Doctor</label>
                                                        <select 
                                                            id="doctor_id"
                                                            name="doctor_id"
                                                            value={newAppointment.doctor_id}
                                                            onChange={handleNewAppointmentChange}
                                                            required
                                                            className="form-control"
                                                        >
                                                            <option value="">-- Select Doctor --</option>
                                                            {doctors.map(doctor => (
                                                                <option key={doctor._id} value={doctor._id}>
                                                                    {doctor.full_name ||
                                                                     `${doctor.first_name || doctor.firstName || ''} ${doctor.last_name || doctor.lastName || ''}`.trim()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Patient Selection - For Doctors */}
                                                {userRole === 'doctor' && (
                                                    <div className="form-group">
                                                        <label htmlFor="patient_id">Select Patient</label>
                                                        <select 
                                                            id="patient_id"
                                                            name="patient_id"
                                                            value={newAppointment.patient_id}
                                                            onChange={handleNewAppointmentChange}
                                                            required
                                                            className="form-control"
                                                        >
                                                            <option value="">-- Select Patient --</option>
                                                            {patients.map(patient => (
                                                                <option key={patient._id} value={patient._id}>
                                                                    {patient.full_name ||
                                                                     `${patient.first_name || patient.firstName || ''} ${patient.last_name || patient.lastName || ''}`.trim()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Date and Time Picker */}
                                                <div className="form-group">
                                                    <label htmlFor="appointment_date">Appointment Date & Time</label>
                                                    <DatePicker
                                                        selected={newAppointment.appointment_date}
                                                        onChange={(date) => setNewAppointment({...newAppointment, appointment_date: date})}
                                                        showTimeSelect
                                                        timeFormat="HH:mm"
                                                        timeIntervals={30}
                                                        dateFormat="MMMM d, yyyy h:mm aa"
                                                        minDate={new Date()}
                                                        className="form-control"
                                                        placeholderText="Select date and time"
                                                        required
                                                    />
                                                </div>

                                                {/* Description */}
                                                <div className="form-group">
                                                    <label htmlFor="description">Description</label>
                                                    <textarea
                                                        id="description"
                                                        name="description"
                                                        value={newAppointment.description}
                                                        onChange={handleNewAppointmentChange}
                                                        placeholder={userRole === 'doctor' ? "Enter appointment details" : "Describe your concerns or reason for visit"}
                                                        className="form-control"
                                                        rows={3}
                                                        required
                                                    />
                                                </div>
                                            </form>
                                        </div>

                                        <div className="modal-footer">
                                            <button 
                                                type="button" 
                                                className="cancel-btn"
                                                onClick={() => setShowAppointmentModal(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="submit-btn"
                                                disabled={createAppointmentLoading}
                                                onClick={handleCreateAppointment}
                                            >
                                                {createAppointmentLoading ? 
                                                    (userRole === 'doctor' ? 'Scheduling...' : 'Booking...') : 
                                                    (userRole === 'doctor' ? 'Schedule Appointment' : 'Book Appointment')
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {loading ? (
                            <p>Loading appointments...</p>
                        ) : error ? (
                            <p className="error-message">{error}</p>
                        ) : upcomingAppointments.length === 0 ? (
                            <p>No upcoming appointments</p>
                        ) : (
                            <div className="appointments-scroll-container">
                                {upcomingAppointments.map(appointment => (
                                    <div 
                                        className="appointment-card" 
                                        key={appointment.id || appointment._id}
                                        onClick={() => setSelectedAppointment(appointment)}
                                    >
                                        <div className="appointment-info">
                                            <div>
                                                <div className="doctor-name">{appointment.title}</div>
                                                <div className="appointment-datetime">
                                                    {format(new Date(appointment.start), "MMMM d, yyyy")} &nbsp; 
                                                    {format(new Date(appointment.start), "h:mm a")}
                                                </div>
                                                {appointment.notes && (
                                                    <div className="appointment-notes">
                                                        {appointment.notes}
                                                    </div>
                                                )}
                                                {appointment.status && (
                                                    <div className={`appointment-status ${appointment.status.toLowerCase()}`}>
                                                        {appointment.status}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            className="call-button" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleContactMessage(appointment);
                                            }}
                                            aria-label="Open conversation"
                                        >
                                            <IoCall size={18} color="#34C759" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Appointment History Section */}
                    <div className="upcoming-appointments appointment-history">
                        <div className="section-title">Appointment History</div>
                        
                        {loading ? (
                            <p>Loading appointment history...</p>
                        ) : error ? (
                            <p className="error-message">{error}</p>
                        ) : appointmentHistory.length === 0 ? (
                            <p>No appointment history</p>
                        ) : (
                            <div className="appointments-scroll-container">
                                {appointmentHistory.map(appointment => (
                                    <div 
                                        className="appointment-card" 
                                        key={appointment.id || appointment._id}
                                        onClick={() => setSelectedAppointment(appointment)}
                                    >
                                        <div className="appointment-info">
                                            <div>
                                                <div className="doctor-name">{appointment.title}</div>
                                                <div className="appointment-datetime">
                                                    {format(new Date(appointment.start), "MMMM d, yyyy")} &nbsp; 
                                                    {format(new Date(appointment.start), "h:mm a")}
                                                </div>
                                                {appointment.notes && (
                                                    <div className="appointment-notes">
                                                        {appointment.notes}
                                                    </div>
                                                )}
                                                {appointment.status && (
                                                    <div className={`appointment-status ${appointment.status.toLowerCase()}`}>
                                                        {appointment.status}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    

                    {/* Appointment Detail Modal */}
                    {selectedAppointment && (
                        <div className="modal-overlay" onClick={() => setSelectedAppointment(null)}>
                            <div className="appointment-detail-modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Appointment Details</h3>
                                    <button 
                                        className="modal-close-btn" 
                                        onClick={() => setSelectedAppointment(null)}
                                    >
                                        &times;
                                    </button>
                                </div>
                                
                                <div className="modal-body">
                                    <div className="appointment-detail-group">
                                        <label>Date & Time:</label>
                                        <div className="detail-value">
                                            {format(new Date(selectedAppointment.start), 'MMMM d, yyyy • h:mm a')}
                                        </div>
                                    </div>
                                    
                                    <div className="appointment-detail-group">
                                        <label>With:</label>
                                        <div className="detail-value">{selectedAppointment.title}</div>
                                    </div>
                                    
                                    {selectedAppointment.notes && (
                                        <div className="appointment-detail-group">
                                            <label>Description:</label>
                                            <div className="detail-value">{selectedAppointment.notes}</div>
                                        </div>
                                    )}
                                    
                                    <div className="appointment-detail-group">
                                        <label>Status:</label>
                                        <div className={`appointment-status-display ${(selectedAppointment.status || 'scheduled').toLowerCase()}`}>
                                            {selectedAppointment.status || 'Scheduled'}
                                        </div>
                                    </div>

                                    {/* Action buttons - only show if status is scheduled or pending */}
                                    {(selectedAppointment.status === 'scheduled' || 
                                      selectedAppointment.status === 'pending' || 
                                      !selectedAppointment.status) && (
                                        <div className="appointment-actions">
                                            <button
                                                className="accept-btn"
                                                onClick={() => handleStatusChange(selectedAppointment, 'confirmed')}
                                                disabled={updatingStatus}
                                            >
                                                {updatingStatus ? 'Updating...' : 'Accept'}
                                            </button>
                                            <button
                                                className="cancel-appointment-btn"
                                                onClick={() => handleStatusChange(selectedAppointment, 'cancelled')}
                                                disabled={updatingStatus}
                                            >
                                                {updatingStatus ? 'Updating...' : 'Cancel'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Accomplished button - Only show for doctors when status is confirmed */}
                                    {userRole === 'doctor' && selectedAppointment.status === 'confirmed' && (
                                        <div className="appointment-actions">
                                            <button
                                                className="accomplished-btn"
                                                onClick={() => handleStatusChange(selectedAppointment, 'completed')}
                                                disabled={updatingStatus}
                                            >
                                                {updatingStatus ? 'Updating...' : 'Mark as Completed'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Show message for finalized appointments */}
                                    {(selectedAppointment.status === 'confirmed' || 
                                      selectedAppointment.status === 'cancelled' ||
                                      selectedAppointment.status === 'completed') && 
                                      selectedAppointment.status !== 'confirmed' && (
                                        <div className="appointment-finalized-message">
                                            <p>This appointment has been {selectedAppointment.status} and cannot be modified.</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="modal-footer">
                                    <button 
                                        className="contact-btn"
                                        onClick={() => {
                                            handleContactMessage(selectedAppointment);
                                            setSelectedAppointment(null);
                                        }}
                                    >
                                        Message
                                    </button>
                                    <button 
                                        className="close-btn" 
                                        onClick={() => setSelectedAppointment(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Toast notifications */}
            <ToastContainer position="top-right" autoClose={5000} />
        </div>
    );
};

export default Calendar;