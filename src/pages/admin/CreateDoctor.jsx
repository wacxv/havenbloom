import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../../components/Header/Header';
import './AdminPages.css';

const CreateDoctor = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Updated form data structure to match AdminDashboard fields
  const [formData, setFormData] = useState({
    title: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    specialization: '',
    gender: '',
    license_number: '',
    contact_number: '',
    schedule_info: ''
  });

  // Check if user is admin, if not redirect
  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/home');
    }
  }, [navigate]);

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

      // Restructure the data to match the expected API format
      const doctorData = {
        email: formData.email,
        password: formData.password,
        role: "doctor",
        profile_data: {
          title: formData.title,
          first_name: formData.first_name,
          last_name: formData.last_name,
          gender: formData.gender,
          specialization: formData.specialization,
          license_number: formData.license_number,
          contact_number: formData.contact_number,
          schedule_info: formData.schedule_info || "" // Ensure this has a default value
        }
      };
      
      // Use axios instead of fetch for more consistent error handling
      const response = await axios.post('https://havenbloom-api.onrender.com/api/users/register', doctorData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setSuccess(`Successfully created doctor account for ${formData.title} ${formData.first_name} ${formData.last_name}`);
      toast.success('Doctor account created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        specialization: '',
        gender: '',
        license_number: '',
        contact_number: '',
        schedule_info: ''
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);

    } catch (err) {
      console.error('Error creating doctor account:', err);
      
      // More detailed error handling
      if (err.response) {
        // The server responded with a status code outside 2xx range
        setError(err.response.data.message || 'Validation error: Please check all fields');
        toast.error(err.response.data.message || 'Validation error: Please check all fields');
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server. Please try again');
        toast.error('No response from server. Please try again');
      } else {
        // Something happened in setting up the request
        setError('Request error: ' + err.message);
        toast.error('Request error: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-page">
      {/* Inline style to fix input width and spacing */}
      <style>{`
        .admin-card {
          max-width: 700px;
          margin: 0 auto;
        }
        .admin-form .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        .admin-form .form-group {
          flex: 1 1 0;
          min-width: 0;
        }
        .admin-form .form-control {
          width: 100%;
          max-width: 320px;
          box-sizing: border-box;
        }
        .admin-form .form-row .form-group {
          display: flex;
          flex-direction: column;
        }
        .admin-form > .form-group {
          margin-bottom: 20px;
          max-width: 660px;
        }
        @media (max-width: 900px) {
          .admin-card {
            max-width: 98vw;
          }
          .admin-form .form-row {
            flex-direction: column;
            gap: 0;
          }
          .admin-form .form-control {
            max-width: 100%;
          }
        }
      `}</style>
      <Header />
      <ToastContainer position="top-right" autoClose={5000} />
      <div className="admin-content">
        <div className="admin-header">
          <h1>Create Doctor Account</h1>
          <p>Add a new doctor to the Havenbloom healthcare system</p>
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
                <label htmlFor="title">Title</label>
                <select
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                >
                  <option value="">-- Select Title --</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter first name"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter last name"
                  className="form-control"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter email address"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Create password"
                  className="form-control"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="specialization">Specialization</label>
                <input
                  type="text"
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Cardiology, Pediatrics"
                  className="form-control"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="license_number">License Number</label>
                <input
                  type="text"
                  id="license_number"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter medical license number"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="contact_number">Contact Number</label>
                <input
                  type="tel"
                  id="contact_number"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter phone number"
                  className="form-control"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="schedule_info">Schedule Information</label>
              <textarea
                id="schedule_info"
                name="schedule_info"
                value={formData.schedule_info}
                onChange={handleInputChange}
                placeholder="e.g., Mon-Wed: 9AM-5PM, Thu-Fri: 10AM-4PM"
                className="form-control"
                rows={3}
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Doctor Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDoctor;