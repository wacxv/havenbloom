import React, { useState, useEffect, useRef } from 'react';
import './Analytics.css';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';

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

const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [token, setToken] = useState(null);
  
  // WebSocket states
  const [readings, setReadings] = useState([]); // array of { bpm, timestamp, deviceType }
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  
  // Current BPM values from WebSocket
  const [currentHeartRate, setCurrentHeartRate] = useState(0);
  const [currentFetalHeartRate, setCurrentFetalHeartRate] = useState(0);
  const [lastHeartRateTimestamp, setLastHeartRateTimestamp] = useState(null);
  const [lastFetalHeartRateTimestamp, setLastFetalHeartRateTimestamp] = useState(null);
  
  // Chart data for live display
  const [heartRateData, setHeartRateData] = useState(null);
  const [fetalHeartRateData, setFetalHeartRateData] = useState(null);

  // Summary data states (keep existing)
  const [minFetalBPM, setMinFetalBPM] = useState(null);
  const [maxFetalBPM, setMaxFetalBPM] = useState(null);
  const [fetalHeartRateSummaryData, setFetalHeartRateSummaryData] = useState(null);
  const [summaryMinFetalBPM, setSummaryMinFetalBPM] = useState(null);
  const [summaryMaxFetalBPM, setSummaryMaxFetalBPM] = useState(null);
  const [summaryAvgFetalBPM, setSummaryAvgFetalBPM] = useState(null);

  const [heartRateSummaryData, setHeartRateSummaryData] = useState(null);
  const [summaryMinHeartRate, setSummaryMinHeartRate] = useState(null);
  const [summaryMaxHeartRate, setSummaryMaxHeartRate] = useState(null);
  const [summaryAvgHeartRate, setSummaryAvgHeartRate] = useState(null);

  const [fhrAnalyticsHistoryOpen, setFhrAnalyticsHistoryOpen] = useState(false);
  const [fhrAnalyticsHistory, setFhrAnalyticsHistory] = useState([]);
  const [fhrAnalyticsHistoryLoading, setFhrAnalyticsHistoryLoading] = useState(false);

  // Use dynamic API base URL
  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://havenbloom-api.onrender.com';

  const WS_BASE_URL = window.location.hostname === 'localhost' 
    ? 'ws://localhost:3000'
    : 'wss://havenbloom-api.onrender.com';

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      const authToken = localStorage.getItem('token');

      if (userData) {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser._id && parsedUser.id) {
          parsedUser._id = parsedUser.id;
        }
        setUser(parsedUser);
        setUserRole(parsedUser.role);
      } else {
        console.error("No user data in localStorage");
        navigate('/signin');
      }

      if (authToken) {
        setToken(authToken);
      } else {
        console.error("No auth token in localStorage");
        navigate('/signin');
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      navigate('/signin');
    }

    generatePlaceholderData();
  }, [navigate]);

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

  // WebSocket connection management
  const connectWebSocket = () => {
    if (!user?._id || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    try {
      const wsUrl = `${WS_BASE_URL}/ws`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        setWsError(null);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Filter messages for current user - check BOTH patientId and assignedUserId for compatibility
          const isForCurrentUser = (data.patientId === user._id || data.assignedUserId === user._id);
          
          if (isForCurrentUser && data.bpm && data.deviceType) {
            const reading = {
              bpm: parseInt(data.bpm),
              timestamp: new Date(data.timestamp || Date.now()),
              deviceType: data.deviceType
            };

            // Update readings array (keep only last 60 seconds)
            setReadings(prev => {
              const now = new Date();
              const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
              
              const filtered = prev.filter(r => r.timestamp > oneMinuteAgo);
              return [...filtered, reading].slice(-60); // Keep max 60 readings
            });

            // Update current values and timestamps based on device type
            if (data.deviceType === 'smartwatch') {
              setCurrentHeartRate(reading.bpm);
              setLastHeartRateTimestamp(reading.timestamp);
            } else if (data.deviceType === 'doppler') {
              setCurrentFetalHeartRate(reading.bpm);
              setLastFetalHeartRateTimestamp(reading.timestamp);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setWsConnected(false);
        
        if (event.code !== 1000) { // Not a normal closure
          setWsError('Connection lost');
          scheduleReconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsError('Connection error');
        setWsConnected(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setWsError('Failed to connect');
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;
    
    reconnectAttempts.current++;
    const delay = Math.min(5000 * reconnectAttempts.current, 30000); // Max 30 seconds
    
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (user?._id) {
        connectWebSocket();
      }
    }, delay);
  };

  // Initialize WebSocket when user is available
  useEffect(() => {
    if (user?._id) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [user?._id]);

  // Update chart data when readings change
  useEffect(() => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    // Filter readings by device type and time
    const heartRateReadings = readings.filter(r => 
      r.deviceType === 'smartwatch' && r.timestamp > oneMinuteAgo
    );
    const fetalHeartRateReadings = readings.filter(r => 
      r.deviceType === 'doppler' && r.timestamp > oneMinuteAgo
    );

    // Create chart data for heart rate
    const heartRateChartData = Array(20).fill(0);
    heartRateReadings.forEach((reading, index) => {
      if (index < 20) {
        heartRateChartData[index] = reading.bpm;
      }
    });

    setHeartRateData({
      labels: heartRateChartData.map((_, i) => ''),
      datasets: [
        {
          label: 'Heart Rate',
          data: heartRateChartData,
          borderColor: '#D67AB1',
          backgroundColor: 'rgba(214, 122, 177, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }
      ]

    });

    // Create chart data for fetal heart rate
    const fetalHeartRateChartData = Array(20).fill(0);
    fetalHeartRateReadings.forEach((reading, index) => {
      if (index < 20) {
        fetalHeartRateChartData[index] = reading.bpm;
      }
    });

    setFetalHeartRateData({
      labels: fetalHeartRateChartData.map((_, i) => ''),
      datasets: [
        {
          label: 'Fetal Heart Rate',
          data: fetalHeartRateChartData,
          borderColor: '#D67AB1',
          backgroundColor: 'rgba(214, 122, 177, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }
      ]
    });
  }, [readings]);

  const generatePlaceholderData = () => {
    // Start with flat data (all zeros)
    setHeartRateData({
      labels: ['', '', '', '', '', '', '', '', ''],
      datasets: [
        {
          label: 'Heart Rate',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          borderColor: '#D67AB1',
          backgroundColor: 'rgba(214, 122, 177, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }
      ]

    });

    setFetalHeartRateData({
      labels: ['', '', '', '', '', '', '', '', ''],
      datasets: [
        {
          label: 'Fetal Heart Rate',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          borderColor: '#D67AB1',
          backgroundColor: 'rgba(214, 122, 177, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2
        }
      ]
    });
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(214, 122, 177, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#D67AB1',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${context.parsed.y} BPM`;
          }
        }
      }
    },
    scales: {
      y: {
        display: true,
        beginAtZero: true,
        min: 0,
        max: 200,
        grid: {
          color: 'rgba(214, 122, 177, 0.1)',
          lineWidth: 1
        },
        ticks: {
          stepSize: 25,
          color: '#888',
          font: {
            size: 11
          }
        }
      },
      x: {
        display: false,
        grid: {
          display: false
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2.5,
        tension: 0.3
      },
      point: {
        radius: 0,
        hoverRadius: 0
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 200,
      easing: 'easeInOutQuad'
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'No data';
    return timestamp.toLocaleTimeString();
  };

  // Keep existing summary data fetching logic
  useEffect(() => {
    if (!fhrAnalyticsHistoryOpen || !token || !user?._id) return;

    const fetchFhrAnalyticsHistory = async () => {
      setFhrAnalyticsHistoryLoading(true);
      try {
        console.log('Fetching FHR analytics history for user:', user._id);
        const response = await axios.get(`${API_BASE_URL}/api/fetal-heart-rate`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('FHR API Response:', response.data);
        
        // Ensure we have a valid array
        let data = response.data;
        if (!Array.isArray(data)) {
          console.warn('API response is not an array:', data);
          // Try to extract array from response if it's wrapped in an object
          if (data && typeof data === 'object') {
            if (Array.isArray(data.data)) {
              data = data.data;
            } else if (Array.isArray(data.records)) {
              data = data.records;
            } else if (Array.isArray(data.results)) {
              data = data.results;
            } else {
              console.error('Cannot find array in response:', data);
              data = [];
            }
          } else {
            data = [];
          }
        }

        // Filter data by current user's ID
        const userSpecificData = data.filter(record => {
          // Check if the record belongs to the current user
          return record.patientId === user._id || record.userId === user._id || record.assignedUserId === user._id;
        });

        console.log('User specific data:', userSpecificData);

        const groupedByDate = {};
        userSpecificData.forEach(record => {
          if (record.timestamp && record.bpm) {
            const dateStr = record.timestamp.split('T')[0];
            if (!groupedByDate[dateStr]) {
              groupedByDate[dateStr] = [];
            }
            
            const bpms = record.bpm
              .split(',')
              .map(x => parseInt(x.trim()))
              .filter(x => !isNaN(x) && x > 0);
            
            groupedByDate[dateStr] = groupedByDate[dateStr].concat(bpms);
          }
        });

        const historyData = Object.keys(groupedByDate)
          .sort((a, b) => new Date(b) - new Date(a))
          .map(date => {
            const allBpms = groupedByDate[date];
            const nonZeroBpms = allBpms.filter(bpm => bpm > 0);
            
            return {
              date: date,
              bpms: allBpms,
              count: allBpms.length,
              min: nonZeroBpms.length > 0 ? Math.min(...nonZeroBpms) : null,
              max: nonZeroBpms.length > 0 ? Math.max(...nonZeroBpms) : null,
              avg: nonZeroBpms.length > 0 
                ? Math.round(nonZeroBpms.reduce((a, b) => a + b, 0) / nonZeroBpms.length)
                : null
            };
          });

        console.log('Processed history data:', historyData);
        setFhrAnalyticsHistory(historyData);
      } catch (error) {
        console.error('Error fetching FHR analytics history:', error);
        console.error('Error details:', error.response?.data || error.message);
        setFhrAnalyticsHistory([]);
      } finally {
        setFhrAnalyticsHistoryLoading(false);
      }
    };

    fetchFhrAnalyticsHistory();
  }, [fhrAnalyticsHistoryOpen, token, user?._id, API_BASE_URL]);

  useEffect(() => {
    if (!token) return;

    const fetchFetalHeartRateSummary = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/fetal-heart-rate`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ensure we have a valid array
        let data = response.data;
        if (!Array.isArray(data)) {
          console.warn('FHR Summary API response is not an array:', data);
          if (data && typeof data === 'object') {
            if (Array.isArray(data.data)) {
              data = data.data;
            } else if (Array.isArray(data.records)) {
              data = data.records;
            } else if (Array.isArray(data.results)) {
              data = data.results;
            } else {
              data = [];
            }
          } else {
            data = [];
          }
        }
        
        // Filter data by current user's ID
        const userSpecificData = data.filter(record => {
          return record.patientId === user._id || record.userId === user._id || record.assignedUserId === user._id;
        });
        
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const todaysRecords = userSpecificData.filter(d =>
          d.timestamp &&
          d.bpm &&
          d._id &&
          d.timestamp.startsWith(todayStr)
        );

        let graphBPMs = [];
        let allBPMs = [];
        todaysRecords.forEach(rec => {
          if (rec.bpm) {
            let bpms = rec.bpm
              .split(',')
              .map(x => parseInt(x.trim()))
              .filter(x => !isNaN(x));
            allBPMs = allBPMs.concat(bpms);

            if (bpms.length > 0) {
              const sampleCount = Math.min(10, bpms.length);
              const step = bpms.length / sampleCount;
              for (let i = 0; i < sampleCount; i++) {
                graphBPMs.push(bpms[Math.floor(i * step)]);
              }
            }
          }
        });

        setFetalHeartRateSummaryData({
          labels: graphBPMs.map((_, i) => (i + 1).toString()),
          datasets: [
            {
              label: 'Fetal Heart Rate (Summary)',
              data: graphBPMs,
              borderColor: '#D67AB1',
              backgroundColor: 'rgba(214, 122, 177, 0.15)',
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointHoverRadius: 8,
              pointHoverBackgroundColor: '#D67AB1',
              pointHoverBorderColor: '#fff',
              pointHoverBorderWidth: 3
            }
          ]
        });

        const nonZeroBPMs = allBPMs.filter(bpm => bpm > 0);
        setSummaryMinFetalBPM(nonZeroBPMs.length ? Math.min(...nonZeroBPMs) : null);
        setSummaryMaxFetalBPM(nonZeroBPMs.length ? Math.max(...nonZeroBPMs) : null);
        setSummaryAvgFetalBPM(
          nonZeroBPMs.length
            ? Math.round(nonZeroBPMs.reduce((a, b) => a + b, 0) / nonZeroBPMs.length)
            : null
        );
      } catch (error) {
        console.error('Error fetching fetal heart rate summary:', error);
        setFetalHeartRateSummaryData({
          labels: Array(9).fill(''),
          datasets: [
            {
              label: 'Fetal Heart Rate (Summary)',
              data: Array(9).fill(0),
              borderColor: '#D67AB1',
              backgroundColor: 'rgba(214, 122, 177, 0.2)',
              fill: true,
              tension: 0.4,
              borderWidth: 2
            }
          ]
        });
        setSummaryMinFetalBPM(null);
        setSummaryMaxFetalBPM(null);
        setSummaryAvgFetalBPM(null);
      }
    };

    fetchFetalHeartRateSummary();
  }, [token, user?._id, API_BASE_URL]);

  useEffect(() => {
    if (!token || !user?._id) return;

    const fetchHeartRateSummary = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/watch-heart-rate`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ensure we have a valid array
        let data = response.data;
        if (!Array.isArray(data)) {
          console.warn('Heart Rate Summary API response is not an array:', data);
          if (data && typeof data === 'object') {
            if (Array.isArray(data.data)) {
              data = data.data;
            } else if (Array.isArray(data.records)) {
              data = data.records;
            } else if (Array.isArray(data.results)) {
              data = data.results;
            } else {
              data = [];
            }
          } else {
            data = [];
          }
        }
        
        // Filter data by current user's ID
        const userSpecificData = data.filter(record => {
          return record.patientId === user._id || record.userId === user._id || record.assignedUserId === user._id;
        });
        
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const todaysRecords = userSpecificData.filter(d =>
          d.timestamp &&
          d.bpm &&
          d._id &&
          d.timestamp.startsWith(todayStr)
        );

        let graphBPMs = [];
        let allBPMs = [];
        todaysRecords.forEach(rec => {
          if (rec.bpm) {
            let bpms = rec.bpm
              .split(',')
              .map(x => parseInt(x.trim()))
              .filter(x => !isNaN(x));
            allBPMs = allBPMs.concat(bpms);

            if (bpms.length > 0) {
              const sampleCount = Math.min(10, bpms.length);
              const step = bpms.length / sampleCount;
              for (let i = 0; i < sampleCount; i++) {
                graphBPMs.push(bpms[Math.floor(i * step)]);
              }
            }
          }
        });

        setHeartRateSummaryData({
          labels: graphBPMs.map((_, i) => (i + 1).toString()),
          datasets: [
            {
              label: 'Heart Rate (Summary)',
              data: graphBPMs,
              borderColor: '#D67AB1',
              backgroundColor: 'rgba(214, 122, 177, 0.15)',
              fill: true,
              tension: 0.4,
              borderWidth: 3,
              pointHoverRadius: 8,
              pointHoverBackgroundColor: '#D67AB1',
              pointHoverBorderColor: '#fff',
              pointHoverBorderWidth: 3
            }
          ]
        });

        const nonZeroBPMs = allBPMs.filter(bpm => bpm > 0);
        setSummaryMinHeartRate(nonZeroBPMs.length ? Math.min(...nonZeroBPMs) : null);
        setSummaryMaxHeartRate(nonZeroBPMs.length ? Math.max(...nonZeroBPMs) : null);
        setSummaryAvgHeartRate(
          nonZeroBPMs.length
            ? Math.round(nonZeroBPMs.reduce((a, b) => a + b, 0) / nonZeroBPMs.length)
            : null
        );
      } catch (error) {
        console.error('Error fetching heart rate summary:', error);
        setHeartRateSummaryData({
          labels: Array(9).fill(''),
          datasets: [
            {
              label: 'Heart Rate (Summary)',
              data: Array(9).fill(0),
              borderColor: '#D67AB1',
              backgroundColor: 'rgba(214, 122, 177, 0.2)',
              fill: true,
              tension: 0.4,
              borderWidth: 2
            }
          ]
        });
        setSummaryMinHeartRate(null);
        setSummaryMaxHeartRate(null);
        setSummaryAvgHeartRate(null);
      }
    };

    fetchHeartRateSummary();
  }, [token, user?._id, API_BASE_URL]);

  useEffect(() => {
    if (!fhrAnalyticsHistoryOpen || !token || !user?._id) return;

    const fetchFhrAnalyticsHistory = async () => {
      setFhrAnalyticsHistoryLoading(true);
      try {
        console.log('Fetching FHR analytics history for user:', user._id);
        const response = await axios.get(`${API_BASE_URL}/api/fetal-heart-rate`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('FHR API Response:', response.data);
        
        // Ensure we have a valid array
        let data = response.data;
        if (!Array.isArray(data)) {
          console.warn('API response is not an array:', data);
          // Try to extract array from response if it's wrapped in an object
          if (data && typeof data === 'object') {
            if (Array.isArray(data.data)) {
              data = data.data;
            } else if (Array.isArray(data.records)) {
              data = data.records;
            } else if (Array.isArray(data.results)) {
              data = data.results;
            } else {
              console.error('Cannot find array in response:', data);
              data = [];
            }
          } else {
            data = [];
          }
        }

        // Filter data by current user's ID
        const userSpecificData = data.filter(record => {
          // Check if the record belongs to the current user
          return record.patientId === user._id || record.userId === user._id || record.assignedUserId === user._id;
        });

        console.log('User specific data:', userSpecificData);

        const groupedByDate = {};
        userSpecificData.forEach(record => {
          if (record.timestamp && record.bpm) {
            const dateStr = record.timestamp.split('T')[0];
            if (!groupedByDate[dateStr]) {
              groupedByDate[dateStr] = [];
            }
            
            const bpms = record.bpm
              .split(',')
              .map(x => parseInt(x.trim()))
              .filter(x => !isNaN(x) && x > 0);
            
            groupedByDate[dateStr] = groupedByDate[dateStr].concat(bpms);
          }
        });

        const historyData = Object.keys(groupedByDate)
          .sort((a, b) => new Date(b) - new Date(a))
          .map(date => {
            const allBpms = groupedByDate[date];
            const nonZeroBpms = allBpms.filter(bpm => bpm > 0);
            
            return {
              date: date,
              bpms: allBpms,
              count: allBpms.length,
              min: nonZeroBpms.length > 0 ? Math.min(...nonZeroBpms) : null,
              max: nonZeroBpms.length > 0 ? Math.max(...nonZeroBpms) : null,
              avg: nonZeroBpms.length > 0 
                ? Math.round(nonZeroBpms.reduce((a, b) => a + b, 0) / nonZeroBpms.length)
                : null
            };
          });

        console.log('Processed history data:', historyData);
        setFhrAnalyticsHistory(historyData);
      } catch (error) {
        console.error('Error fetching FHR analytics history:', error);
        console.error('Error details:', error.response?.data || error.message);
        setFhrAnalyticsHistory([]);
      } finally {
        setFhrAnalyticsHistoryLoading(false);
      }
    };

    fetchFhrAnalyticsHistory();
  }, [fhrAnalyticsHistoryOpen, token, user?._id, API_BASE_URL]);

  return (
    <div className="analytics-page">
      <div className="main-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Analytics</h1>
          <div className="user-profile">
            <div className="user-info">
              <h4 className="patient-name">{getUserFullName(user)}</h4>
              <p className="patient-email">{user?.email || "user@example.com"}</p>
            </div>
            <div className="profile-avatar"
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer' }}
              title="View Profile"
            >
              
            </div>
          </div>
        </div>

        {/* WebSocket Status Indicator */}
        <div style={{ 
          marginBottom: 16,
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          backgroundColor: wsConnected ? '#e8f5e8' : '#ffebee',
          color: wsConnected ? '#2e7d32' : '#c62828',
          border: `1px solid ${wsConnected ? '#4caf50' : '#f44336'}`
        }}>
          {wsConnected ? '🟢 Live data connected' : '🔴 Live data unavailable'}
          {wsError && ` - ${wsError}`}
        </div>

        <div className="health-metrics-card">
          <h2 className="metrics-title">Health Metrics</h2>
          <div className="metrics-grid" style={{ display: 'flex', alignItems: 'stretch', position: 'relative', gap: 16 }}>
            {/* Heart Rate Metric Box */}
            <div className="metric-box" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <div className="metric-header">
                <h3>Heart Rate</h3>
                <div className="current-bpm">
                  <span className="bpm-value">{currentHeartRate}</span>
                  <span className="bpm-unit">BPM</span>
                </div>
                
              </div>
              <div className="chart-container">
                {heartRateData && (
                  <Line
                    data={heartRateData}
                    options={lineChartOptions}
                  />
                )}
              </div>
            </div>

            {/* Fetal Heart Rate Metric Box */}
            <div className="metric-box" style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
              <div className="metric-header">
                <h3>Fetal Heart Rate</h3>
                <div className="current-bpm">
                  <span className="bpm-value">{currentFetalHeartRate}</span>
                  <span className="bpm-unit"> BPM</span>
                </div>
                
              </div>
              <div className="chart-container">
                {fetalHeartRateData && (
                  <Line
                    data={fetalHeartRateData}
                    options={lineChartOptions}
                  />
                )}
              </div>
            </div>

            {/* FHR History Button */}
            <div
              className="fhr-analytics-history-btn-container"
              style={{
                flex: '0 0 120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                padding: 0,
                marginLeft: 8
              }}
            >
              <button
                id="fhr-analytics-view-history-btn"
                className="fhr-analytics-view-history-btn"
                style={{
                  background: '#D67AB1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(214,122,177,0.10)'
                }}
                onClick={() => setFhrAnalyticsHistoryOpen(true)}
              >
                View FHR History
              </button>
            </div>
          </div>
        </div>

        {/* Modal for FHR History */}
        {fhrAnalyticsHistoryOpen && (
          <div className="fhr-analytics-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="fhr-analytics-modal" style={{
              background: '#fff', 
              borderRadius: 16, 
              padding: 32, 
              minWidth: '85vw', 
              maxWidth: '95vw', 
              maxHeight: '85vh', 
              overflowY: 'auto', 
              boxShadow: '0 4px 24px rgba(214,122,177,0.13)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ color: '#D67AB1', fontWeight: 700, fontSize: 24, margin: 0 }}>FHR Daily History</h2>
                <button
                  className="fhr-analytics-modal-close"
                  style={{
                    background: 'none', border: 'none', fontSize: 24, color: '#D67AB1', cursor: 'pointer', fontWeight: 700
                  }}
                  onClick={() => setFhrAnalyticsHistoryOpen(false)}
                  aria-label="Close"
                >×</button>
              </div>
              {fhrAnalyticsHistoryLoading ? (
                <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>Loading...</div>
              ) : (
                <div className="fhr-analytics-history-grid" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                  gap: 24,
                  maxHeight: '70vh',
                  overflowY: 'auto'
                }}>
                  {fhrAnalyticsHistory.length === 0 ? (
                    <div style={{ 
                      gridColumn: '1 / -1', 
                      textAlign: 'center', 
                      color: '#888', 
                      padding: 40,
                      fontSize: 16 
                    }}>
                      No FHR data found.
                    </div>
                  ) : (
                    fhrAnalyticsHistory.map(day => {
                      const bpms = day.bpms || [];
                      let chartBPMs = [];
                      
                      if (bpms.length > 0) {
                        const sampleCount = Math.min(50, bpms.length);
                        const step = bpms.length / sampleCount;
                        for (let i = 0; i < sampleCount; i++) {
                          chartBPMs.push(bpms[Math.floor(i * step)]);
                        }
                      }

                      const historyChartData = {
                        labels: chartBPMs.map((_, i) => ''),
                        datasets: [{
                          label: 'FHR',
                          data: chartBPMs,
                          borderColor: '#D67AB1',
                          backgroundColor: 'rgba(214, 122, 177, 0.15)',
                          fill: true,
                          tension: 0.4,
                          borderWidth: 3,
                          pointRadius: 0,
                          pointHoverRadius: 6,
                          pointHoverBackgroundColor: '#D67AB1',
                          pointHoverBorderColor: '#fff',
                          pointHoverBorderWidth: 2
                        }]
                      };

                      const historyChartOptions = {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                          legend: { display: false }, 
                          tooltip: { 
                            enabled: true,
                            backgroundColor: 'rgba(214, 122, 177, 0.9)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#D67AB1',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: false,
                            callbacks: {
                              label: function(context) {
                                return `${context.parsed.y} BPM`;
                              }
                            }
                          }
                        },
                        scales: { 
                          x: { display: false }, 
                          y: { 
                            display: true,
                            beginAtZero: true,
                            min: 0,
                            max: 200,
                            grid: {
                              color: 'rgba(214, 122, 177, 0.1)',
                              lineWidth: 1
                            },
                            ticks: {
                              stepSize: 50,
                              color: '#888',
                              font: { size: 10 }
                            }
                          }
                        },
                        elements: { 
                          line: { borderWidth: 3, tension: 0.4 }, 
                          point: { radius: 0 }
                        },
                        interaction: {
                          intersect: false,
                          mode: 'index'
                        }
                      };

                      return (
                        <div key={day.date} className="fhr-analytics-day-card" style={{
                          background: '#fff',
                          borderRadius: 16,
                          boxShadow: '0 2px 8px rgba(214,122,177,0.07)',
                          padding: 24,
                          border: '1px solid rgba(214,122,177,0.1)',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <h3 style={{ 
                            color: '#D67AB1', 
                            marginBottom: 16, 
                            fontSize: 18, 
                            fontWeight: 600,
                            textAlign: 'center'
                          }}>
                            {new Date(day.date).toLocaleDateString(undefined, { 
                              weekday: 'short',
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </h3>
                          
                          <div style={{ width: '100%', height: 180, marginBottom: 16 }}>
                            {chartBPMs.length > 1 ? (
                              <Line
                                data={historyChartData}
                                options={historyChartOptions}
                              />
                            ) : (
                              <div style={{ 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#bbb', 
                                fontSize: 14,
                                background: '#f8f9fa',
                                borderRadius: 8
                              }}>
                                Insufficient data for graph
                              </div>
                            )}
                          </div>
                          
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: 14, 
                            color: '#888', 
                            marginBottom: 8 
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FaArrowDown style={{ color: '#4ECDC4', fontSize: '12px' }} />
                              Min: <span style={{ color: '#4ECDC4', fontWeight: 600 }}>{day.min ?? '--'}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FaArrowUp style={{ color: '#FF6B6B', fontSize: '12px' }} />
                              Max: <span style={{ color: '#FF6B6B', fontWeight: 600 }}>{day.max ?? '--'}</span>
                            </span>
                          </div>
                          
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: 13, 
                            color: '#666'
                          }}>
                            <span>
                              Average: <span style={{ color: '#D67AB1', fontWeight: 600 }}>{day.avg ?? '--'} BPM</span>
                            </span>
                            <span>
                              Count: <span style={{ fontWeight: 600 }}>{day.count}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Daily Summary Section with Graphs */}
        <div style={{ marginTop: 40, marginBottom: 8 }}>
          <h2 style={{
            color: '#D67AB1',
            fontWeight: 700,
            fontSize: 22,
            margin: 0,
            letterSpacing: 0.5
          }}>
            Summary for {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
        </div>
        <div className="summary-graphs-row" style={{ display: 'flex', gap: 24, marginTop: 12 }}>
          {/* Smart Watch Heart Rate (Summary for the day) */}
          <div className="summary-graph-card" style={{
            flex: 1,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(214,122,177,0.07)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}>
            <h3 style={{ color: '#D67AB1', marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Heart Rate</h3>
            <div style={{ width: '100%', height: 200, marginBottom: 16 }}>
              {heartRateSummaryData && <Line data={heartRateSummaryData} options={lineChartOptions} />}
            </div>
            <div style={{ fontSize: 15, color: '#888', marginBottom: 8, width: '100%' }}>
              Min: <span style={{ color: '#4ECDC4', fontWeight: 600 }}>{summaryMinHeartRate ?? '--'}</span>
              &nbsp;|&nbsp;
              Max: <span style={{ color: '#FF6B6B', fontWeight: 600 }}>{summaryMaxHeartRate ?? '--'}</span>
            </div>
            <div style={{ fontSize: 14, color: '#666', width: '100%' }}>
              {summaryAvgHeartRate !== null
                ? `Average: ${summaryAvgHeartRate} BPM`
                : 'No data for today.'}
            </div>
          </div>

          {/* Fetal Heart Rate (Summary for the day) */}
          <div className="summary-graph-card" style={{
            flex: 1,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(214,122,177,0.07)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}>
            <h3 style={{ color: '#D67AB1', marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Fetal Heart Rate</h3>
            <div style={{ width: '100%', height: 200, marginBottom: 16 }}>
              {fetalHeartRateSummaryData && <Line data={fetalHeartRateSummaryData} options={lineChartOptions} />}
            </div>
            <div style={{ fontSize: 15, color: '#888', marginBottom: 8, width: '100%' }}>
              Min: <span style={{ color: '#4ECDC4', fontWeight: 600 }}>{summaryMinFetalBPM ?? '--'}</span>
              &nbsp;|&nbsp;
              Max: <span style={{ color: '#FF6B6B', fontWeight: 600 }}>{summaryMaxFetalBPM ?? '--'}</span>
            </div>
            <div style={{ fontSize: 14, color: '#666', width: '100%' }}>
              {summaryAvgFetalBPM !== null
                ? `Average: ${summaryAvgFetalBPM} BPM`
                : 'No data for today.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
