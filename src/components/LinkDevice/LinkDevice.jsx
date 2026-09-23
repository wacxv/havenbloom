import React, { useState, useEffect, useRef } from 'react';
import './LinkDevice.css';
import { MdWatch } from 'react-icons/md';
import { AiFillHeart } from 'react-icons/ai';
import axios from 'axios';
import { MOCK_DEVICES, MOCK_USER } from '../../data/mockData';

const demoDeviceUser = MOCK_USER;
const demoDevices = MOCK_DEVICES;

const LinkDevice = () => {
  const [user, setUser] = useState(demoDeviceUser);
  const [userRole, setUserRole] = useState('patient');
  const [token, setToken] = useState(null);
  
  // New state for device management - Initialize as empty array
  const [devices, setDevices] = useState(demoDevices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // Track loading for individual devices
  const [liveHeartRate, setLiveHeartRate] = useState(null);
  const [bluetoothStatus, setBluetoothStatus] = useState('idle');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState('');
  const bluetoothDeviceRef = useRef(null);
  const heartRateCharacteristicRef = useRef(null);
  // Use localhost for development
  const API_BASE_URL = 'https://havenbloom-api.onrender.com';

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

  useEffect(() => {
    try {
      setUser(demoDeviceUser);
      setUserRole('patient');
      setToken(null);
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  }, []);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user || !user._id || !userRole || !token) return;
      try {
        const endpoint = userRole === 'doctor'
          ? `/api/doctors/user/${user._id}`
          : `/api/patients/user/${user._id}`;
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(prev => ({ ...prev, ...response.data }));
      } catch (error) {
        console.error(`Error fetching ${userRole} details:`, error);
      }
    };
    fetchUserDetails();
  }, [user?._id, userRole, token]);

  // Fetch devices from backend
  useEffect(() => {
    const fetchDevices = async () => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`${API_BASE_URL}/api/devices`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Debug: log the response
        console.log('Devices API response:', response.data);

        // Extract devices from response.data.data
        let devicesData = [];
        if (Array.isArray(response.data)) {
          devicesData = response.data;
        } else if (response.data && Array.isArray(response.data.devices)) {
          devicesData = response.data.devices;
        } else if (response.data && Array.isArray(response.data.data)) {
          devicesData = response.data.data;
        }

        setDevices(devicesData);
      } catch (err) {
        console.error('Error fetching devices:', err);
        setError('Failed to load devices. Please try again.');
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [token]);

  // Create a function to refetch devices
  const refetchDevices = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let devicesData = [];
      if (Array.isArray(response.data)) {
        devicesData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        devicesData = response.data.data;
      }

      setDevices(devicesData);
    } catch (err) {
      console.error('Error refetching devices:', err);
    }
  };

  const handleHeartRateMeasurement = (event) => {
    const value = event.target.value;
    if (!value || value.byteLength < 2) return;

    const flags = value.getUint8(0);
    const heartRate = flags & 0x01
      ? value.getUint16(1, true)
      : value.getUint8(1);

    setLiveHeartRate(heartRate);
  };

  const handleBluetoothDisconnected = () => {
    setBluetoothStatus('idle');
    setBluetoothDeviceName('');
    setLiveHeartRate(null);
    bluetoothDeviceRef.current = null;
    heartRateCharacteristicRef.current = null;
  };

  const connectBluetoothHeartRate = async () => {
    if (!navigator.bluetooth) {
      setBluetoothStatus('unsupported');
      setError('Bluetooth is not available in this browser. Use Chrome or Edge over HTTPS to connect a smartwatch.');
      return false;
    }

    setBluetoothStatus('searching');
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service', 'device_information']
      });

      device.addEventListener('gattserverdisconnected', handleBluetoothDisconnected);
      const server = await device.gatt.connect();
      const heartRateService = await server.getPrimaryService('heart_rate');
      const characteristic = await heartRateService.getCharacteristic('heart_rate_measurement');

      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);
      await characteristic.startNotifications();

      bluetoothDeviceRef.current = device;
      heartRateCharacteristicRef.current = characteristic;
      setBluetoothDeviceName(device.name || 'Bluetooth smartwatch');
      setBluetoothStatus('connected');
      return true;
    } catch (bluetoothError) {
      if (bluetoothError.name === 'NotFoundError') {
        setBluetoothStatus('idle');
        return false;
      }

      console.error('Bluetooth heart-rate connection failed:', bluetoothError);
      setBluetoothStatus('error');
      setError('The smartwatch connected, but its Heart Rate Data Broadcast could not be read.');
      return false;
    }
  };

  const disconnectBluetoothHeartRate = () => {
    const characteristic = heartRateCharacteristicRef.current;
    if (characteristic) {
      characteristic.removeEventListener('characteristicvaluechanged', handleHeartRateMeasurement);
    }

    if (bluetoothDeviceRef.current?.gatt?.connected) {
      bluetoothDeviceRef.current.gatt.disconnect();
    }

    handleBluetoothDisconnected();
  };

  useEffect(() => () => disconnectBluetoothHeartRate(), []);

  // Connect device to current patient
  const handleConnectDevice = async (deviceId) => {
    const device = devices.find(candidate => candidate.deviceId === deviceId);
    if (device?.type === 'smartwatch') {
      const bluetoothConnected = await connectBluetoothHeartRate();
      if (!bluetoothConnected) return;
    }

    if (!token) {
      setDevices(prev => prev.map(candidate => candidate.deviceId === deviceId ? { ...candidate, patientId: user._id } : candidate));
      return;
    }

    setActionLoading(prev => ({ ...prev, [deviceId]: true }));
    setError(null);

    // Debug: Log what we're sending
    console.log('Connecting device:', deviceId);
    console.log('Patient ID to assign:', user._id);
    console.log('Request payload:', { patientId: user._id }); // Changed from assignedUserId to patientId

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/devices/${deviceId}/connect`,
        { patientId: user._id }, // Changed from assignedUserId to patientId
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Debug: Log the response
      console.log('Connect response:', response.data);

      // Re-fetch devices to get the latest state
      await refetchDevices();

    } catch (err) {
      console.error('Error connecting device:', err);
      setError('Failed to connect device. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  // Disconnect device from current patient
  const handleDisconnectDevice = async (deviceId) => {
    const device = devices.find(candidate => candidate.deviceId === deviceId);
    if (device?.type === 'smartwatch') {
      disconnectBluetoothHeartRate();
    }

    if (!token) {
      setDevices(prev => prev.map(candidate => candidate.deviceId === deviceId ? { ...candidate, patientId: null } : candidate));
      return;
    }

    console.log('Attempting to disconnect device:', deviceId);
    console.log('Current user ID:', user?._id);

    setActionLoading(prev => ({ ...prev, [deviceId]: true }));
    setError(null);

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/devices/${deviceId}/disconnect`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Disconnect response:', response.data);

      // Re-fetch devices to get the latest state
      await refetchDevices();

    } catch (err) {
      console.error('Error disconnecting device:', err);
      setError('Failed to disconnect device. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  // Group devices by type - Add safety check
  const groupedDevices = Array.isArray(devices) ? devices.reduce((acc, device) => {
    if (!acc[device.type]) {
      acc[device.type] = [];
    }
    acc[device.type].push(device);
    return acc;
  }, {}) : {};

  const getDeviceStatus = (device) => {
    // Debug: Log device status check
    console.log('=== DEVICE STATUS CHECK ===');
    console.log('Device ID:', device.deviceId);
    console.log('Device patientId:', device.patientId);
    console.log('Device isActive:', device.isActive);
    console.log('Current user._id:', user?._id);

    // First check if device is offline (isActive: false)
    if (!device.isActive) {
      console.log('Status: offline (device inactive)');
      return 'offline';
    }

    // Check if device has no patient assigned
    if (!device.patientId && !device.assignedUserId) {
      console.log('Status: available (no assignment)');
      return 'available';
    }
    
    // Handle populated patientId (object) vs direct ID (string)
    let devicePatientId = device.patientId;
    if (typeof device.patientId === 'object' && device.patientId?._id) {
      devicePatientId = device.patientId._id;
    }
    
    let deviceAssignedUserId = device.assignedUserId;
    if (typeof device.assignedUserId === 'object' && device.assignedUserId?._id) {
      deviceAssignedUserId = device.assignedUserId._id;
    }

    console.log('Extracted devicePatientId:', devicePatientId);
    console.log('Extracted deviceAssignedUserId:', deviceAssignedUserId);
    console.log('Comparison result:', String(devicePatientId) === String(user?._id));
    
    // Check if device is assigned to current user
    if (String(devicePatientId) === String(user?._id) || String(deviceAssignedUserId) === String(user?._id)) {
      console.log('Status: connected (assigned to current user)');
      return 'connected';
    }
    
    console.log('Status: in-use (assigned to someone else)');
    return 'in-use';
  };

  const renderDeviceButton = (device) => {
    const status = getDeviceStatus(device);
    const isLoading = actionLoading[device.deviceId];

    // If device is offline (isActive: false), show disabled button
    if (status === 'offline') {
      return (
        <button
          disabled
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'not-allowed',
            opacity: 0.6
          }}
        >
          Device Offline
        </button>
      );
    }

    if (status === 'available') {
      return (
        <button
          onClick={() => handleConnectDevice(device.deviceId)}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#673AB7',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Connecting...' : 'Connect'}
        </button>
      );
    }

    if (status === 'connected') {
      return (
        <button
          onClick={() => handleDisconnectDevice(device.deviceId)}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#E53935',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      );
    }

    // status === 'in-use' (assigned to someone else)
    return (
      <button
        disabled
        style={{
          padding: '8px 16px',
          backgroundColor: '#ccc',
          color: '#666',
          border: 'none',
          borderRadius: '6px',
          cursor: 'not-allowed'
        }}
      >
        In Use
      </button>
    );
  };

  return (
    <div className="link-device-page-root">
      <div className="main-content">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Linked Devices</h1>
          <div className="user-profile">
            <div className="user-info">
              <h4 className="patient-name">{getUserFullName(user)}</h4>
              <p className="patient-email">{user?.email || "patient-name@gmail.com"}</p>
            </div>
            <div
              className="profile-avatar"
              onClick={() => window.location.href = '/profile'}
              style={{ cursor: 'pointer' }}
              title="View Profile"
            />
          </div>

        </div>

        <div className="link-device-content-grid">
          {/* Left Column */}
          <div className="device-cards-col">
            {/* Error Message */}
            {error && (
              <div style={{
                backgroundColor: '#ffebee',
                border: '1px solid #e57373',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#c62828'
              }}>
                {error}
              </div>
            )}

            {/* Available Devices */}
            <div className="device-card">
              <h2 className="section-title">Available Devices</h2>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #673AB7',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }}></div>
                  <p style={{ marginTop: '10px', color: '#666' }}>Loading devices...</p>
                </div>
              ) : (
                <>
                  {Object.keys(groupedDevices).length === 0 ? (
                    <div className="no-devices-found">No devices found</div>
                  ) : (
                    Object.entries(groupedDevices).map(([deviceType, deviceList]) => (
                      <div key={deviceType} style={{ marginBottom: '24px' }}>
                        <h3 style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          marginBottom: '12px',
                          textTransform: 'capitalize',
                          color: '#333'
                        }}>
                          {deviceType} Devices
                        </h3>
                        
                        <div className="device-list">
                          {deviceList.map(device => {
                            const status = getDeviceStatus(device);
                            return (
                              <div className="device-row" key={device._id}>
                                <div className="device-info">
                                  <span className={`device-icon ${device.type}`}>
                                    {device.type === 'smartwatch' ? (
                                      <MdWatch size={28} color="#2F1847" style={{ background: "#B6F5C3", borderRadius: 8, padding: 3 }} />
                                    ) : (
                                      <AiFillHeart size={28} color="#E53935" style={{ background: "#F8B6C3", borderRadius: 8, padding: 3 }} />
                                    )}
                                  </span>
                                  <div style={{ flex: 1 }}>
                                    <span className="device-name">{device.deviceId}</span>
                                    {device.connectedAt && status === 'connected' && (
                                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                        Connected: {new Date(device.connectedAt).toLocaleDateString()}
                                      </div>
                                    )}
                                    {status === 'offline' && (
                                      <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '2px' }}>
                                        Device is offline
                                      </div>
                                    )}
                                  </div>
                                  <div className="device-actions">
                                    {renderDeviceButton(device)}
                                  </div>
                                </div>
                                <div className="device-status-col">
                                  {status === 'connected' ? (
                                    <span className="status-indicator online">
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                        <rect width="24" height="24" rx="8" fill="#B6F5C3" />
                                        <path d="M7 13.5L11 17L17 9" stroke="#2F1847" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </span>
                                  ) : status === 'offline' ? (
                                    <span className="status-indicator offline">
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                        <rect width="24" height="24" rx="8" fill="#F8D7DA" />
                                        <path d="M15 9L9 15M9 9L15 15" stroke="#721C24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </span>
                                  ) : status === 'in-use' ? (
                                    <span className="status-indicator offline">
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                        <rect width="24" height="24" rx="8" fill="#FFF3CD" />
                                        <path d="M12 8V12M12 16H12.01" stroke="#856404" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                    </span>
                                  ) : (
                                    <span className="status-indicator offline">
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                        <rect width="24" height="24" rx="8" fill="#F8F9FA" />
                                        <circle cx="12" cy="12" r="3" stroke="#6C757D" strokeWidth="2" />
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>

          <div className="metrics-col">
            <div className="metrics-card">
              <div className="metrics-card-header">
                <div>
                  <h2 className="section-title">Health Metrics</h2>
                  <p className="metrics-source">
                    {bluetoothStatus === 'connected'
                      ? `Live from ${bluetoothDeviceName}`
                      : 'Demo values until a smartwatch is connected'}
                  </p>
                </div>
                <span className={`metrics-live-status ${bluetoothStatus === 'connected' ? 'is-live' : ''}`}>
                  {bluetoothStatus === 'connected' ? 'LIVE' : 'DEMO'}
                </span>
              </div>

              <div className="metric-reading metric-reading-primary">
                <span className="metric-label">Heart rate</span>
                <strong>{liveHeartRate ?? 0}</strong>
                <span className="metric-unit">BPM</span>
                <span className="metric-unit">(you can connect a smartwatch to see live data, the smartwatch should have a HR Data Broadcast feature in order to work with this feature)</span>
              </div>
              {bluetoothStatus === 'unsupported' && (
                <p className="metrics-helper">Bluetooth is unavailable here, so demo values are being shown.</p>
              )}
              {bluetoothStatus === 'searching' && (
                <p className="metrics-helper">Choose a nearby smartwatch that supports Heart Rate Data Broadcast.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Fixed CSS for spinner animation - removed jsx attribute */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LinkDevice;
