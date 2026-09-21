import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../../components/Header/Header';
import './AdminPages.css';

const AssignPatient = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // API Base URL - Fixed to work without process.env
  const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://havenbloom-api.onrender.com';
  
  // Updated form data to include notes field from AdminDashboard
  const [formData, setFormData] = useState({
    doctor_id: '',
    patient_id: '',
    notes: ''
  });

  // Check if user is admin, if not redirect
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/home');
    }
  }, [navigate]);

  // Fetch doctors and patients using axios
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        const doctorsResponse = await axios.get(`${API_BASE_URL}/api/doctors`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const patientsResponse = await axios.get(`${API_BASE_URL}/api/patients`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setDoctors(doctorsResponse.data);
        setPatients(patientsResponse.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        const errorMessage = err.response?.data?.message || err.message;
        setError(`Failed to load data: ${errorMessage}`);
        toast.error(`Failed to load data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [API_BASE_URL]);

  // Fetch existing assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }
        
        const response = await axios.get(`${API_BASE_URL}/api/assignments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setAssignments(response.data);
      } catch (err) {
        console.error('Failed to load assignments:', err);
      } finally {
        setIsLoadingAssignments(false);
      }
    };

    fetchAssignments();
  }, [success, API_BASE_URL]); // Reload assignments when a new one is created

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/assignments/create`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setSuccess('Patient assigned successfully');
      toast.success('Patient assigned to doctor successfully!');
      
      // Reset form
      setFormData({
        doctor_id: '',
        patient_id: '',
        notes: ''
      });

      // Refresh assignments from server instead of just adding to state
      await refreshAssignments();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err) {
      console.error('Error assigning patient:', err);
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      toast.error(errorMessage || 'Failed to assign patient to doctor');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete assignment functionality - SIMPLIFIED to use the new /delete/:id endpoint
  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Are you sure you want to remove this assignment?')) {
      try {
        const token = localStorage.getItem('token');
        
        console.log('Attempting to delete assignment:', assignmentId);
        console.log('Using API URL:', API_BASE_URL);
        
        // Use the new /delete/:id endpoint
        const response = await axios.delete(`${API_BASE_URL}/api/assignments/delete/${assignmentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Check if the deletion was successful
        if (response.status === 200 || response.status === 204) {
          // Update assignments list by filtering out the deleted assignment
          setAssignments(prev => prev.filter(assignment => assignment._id !== assignmentId));
          
          toast.success('Assignment removed successfully!');
          
          // Force refresh of assignments from server to ensure consistency
          await refreshAssignments();
        } else {
          throw new Error('Failed to delete assignment');
        }
      } catch (err) {
        console.error('Error deleting assignment:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        
        const errorMessage = err.response?.data?.message || err.message || 'Failed to remove assignment';
        toast.error(errorMessage);
        
        // Refresh assignments in case of error to show current state
        await refreshAssignments();
      }
    }
  };

  // Add a function to refresh assignments from server
  const refreshAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/api/assignments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setAssignments(response.data);
    } catch (err) {
      console.error('Failed to refresh assignments:', err);
    }
  };

  // FIXED: Helper functions to format names without duplication
  const formatDoctorName = (doctor) => {
    if (!doctor) return 'Unknown Doctor';
    
    // If full_name exists, just use that
    if (doctor.full_name) {
      return `Dr. ${doctor.full_name}`;
    }
    
    // Otherwise construct from first/last name
    if (doctor.first_name || doctor.firstName || doctor.last_name || doctor.lastName) {
      const firstName = doctor.first_name || doctor.firstName || '';
      const lastName = doctor.last_name || doctor.lastName || '';
      return `Dr. ${firstName} ${lastName}`;
    }
    
    // Fallback
    return 'Dr. (Unknown)';
  };

  const formatPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    
    // If full_name exists, just use that
    if (patient.full_name) {
      return patient.full_name;
    }
    
    // If name exists (as a single field), just use that
    if (patient.name) {
      return patient.name;
    }
    
    // Otherwise construct from first/last name
    if (patient.first_name || patient.firstName || patient.last_name || patient.lastName) {
      const firstName = patient.first_name || patient.firstName || '';
      const lastName = patient.last_name || patient.lastName || '';
      return `${firstName} ${lastName}`;
    }
    
    // Fallback
    return 'Unknown Patient';
  };

  // Find names for display in the assignments table
  const getDoctorName = (doctorRef) => {
    // doctorRef could be an object or an ID
    if (!doctorRef) return 'Unknown Doctor';
    if (typeof doctorRef === 'object' && doctorRef.full_name) return formatDoctorName(doctorRef);
    const doctorId = typeof doctorRef === 'object' ? doctorRef._id : doctorRef;
    const doctor = doctors.find(doc => doc._id === doctorId);
    return doctor ? formatDoctorName(doctor) : `Unknown Doctor (${doctorId})`;
  };

  const getPatientName = (patientRef) => {
    // patientRef could be an object or an ID
    if (!patientRef) return 'Unknown Patient';
    if (typeof patientRef === 'object' && patientRef.full_name) return formatPatientName(patientRef);
    const patientId = typeof patientRef === 'object' ? patientRef._id : patientRef;
    const patient = patients.find(pat => pat._id === patientId);
    return patient ? formatPatientName(patient) : `Unknown Patient (${patientId})`;
  };
  
  return (
    <div className="admin-page">
      <Header />
      <ToastContainer position="top-right" autoClose={5000} />
      <div className="admin-content">
        <div className="admin-header">
          <h1>Assign Patient to Doctor</h1>
          <p>Create and manage doctor-patient assignments</p>
        </div>

        <div className="admin-card">
          <form onSubmit={handleSubmit} className="admin-form">
            {error && (
              <div className="alert alert-error">
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="alert alert-success">
                <p>{success}</p>
              </div>
            )}
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="doctor_id">Select Doctor</label>
                <select
                  id="doctor_id"
                  name="doctor_id"
                  value={formData.doctor_id}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                >
                  <option value="">-- Select a doctor --</option>
                  {doctors.map(doctor => (
                    <option key={doctor._id} value={doctor._id}>
                      {formatDoctorName(doctor)}
                      {doctor.specialization ? ` (${doctor.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="patient_id">Select Patient</label>
                <select
                  id="patient_id"
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                >
                  <option value="">-- Select a patient --</option>
                  {patients.map(patient => (
                    <option key={patient._id} value={patient._id}>
                      {formatPatientName(patient)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any notes about this doctor-patient assignment (optional)"
                className="form-control"
                rows={3}
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Assigning...' : 'Assign Patient'}
              </button>
            </div>
          </form>
        </div>

        <div className="admin-card">
          <h2>Current Assignments</h2>
          {isLoadingAssignments ? (
            <p className="loading-text">Loading assignments...</p>
          ) : assignments.length > 0 ? (
            <div className="assignments-list">
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Patient</th>
                    <th>Date Assigned</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(assignment => (
                    <tr key={assignment._id}>
                      <td>{getDoctorName(assignment.doctor_id)}</td>
                      <td>{getPatientName(assignment.patient_id)}</td>
                      <td>
                        {new Date(assignment.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric'
                        })}
                      </td>
                      <td>{assignment.notes || '-'}</td>
                      <td>
                        <button 
                          onClick={() => {
                            console.log('Deleting assignment with ID:', assignment._id);
                            handleDeleteAssignment(assignment._id);
                          }}
                          className="delete-btn"
                          title="Remove assignment"
                          disabled={isLoading}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data-text">No assignments found</p>
          )}
          
          {/* Add refresh button for debugging */}
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={refreshAssignments}
              className="submit-btn"
              style={{ backgroundColor: '#6c757d' }}
            >
              Refresh Assignments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignPatient;