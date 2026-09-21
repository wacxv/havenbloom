import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './Videocall.css';
// Add imports for icons
import { BsCameraVideo, BsCameraVideoOff } from 'react-icons/bs';
import { BsMic, BsMicMute } from 'react-icons/bs';
import { BsTelephone } from 'react-icons/bs';
import { FaArrowDown, FaArrowUp, FaHeart, FaBaby } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import axios from 'axios';

const Videocall = () => {
    // State and refs
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [callData, setCallData] = useState(null);
    const [socket, setSocket] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Initializing...');
    const [callStartTime, setCallStartTime] = useState(null);
    const [callDuration, setCallDuration] = useState('00:00:00');
    
    // Add state to track mute/video state for UI
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    
    // Add waiting and call ended states
    const [isWaiting, setIsWaiting] = useState(true);
    const [waitingMessage, setWaitingMessage] = useState('Connecting...');
    const [callEnded, setCallEnded] = useState(false);
    const [callEndedReason, setCallEndedReason] = useState('');
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const timerRef = useRef(null);
    
    const navigate = useNavigate();

    // Real-time monitoring states
    const [user, setUser] = useState(null);
    const [readings, setReadings] = useState([]); // array of { bpm, timestamp, deviceType }
    const [wsConnected, setWsConnected] = useState(false);
    const [wsError, setWsError] = useState(null);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    
    // Current BPM values from WebSocket/MQTT
    const [currentHeartRate, setCurrentHeartRate] = useState(0);
    const [currentFetalHeartRate, setCurrentFetalHeartRate] = useState(0);
    const [lastHeartRateTimestamp, setLastHeartRateTimestamp] = useState(null);
    const [lastFetalHeartRateTimestamp, setLastFetalHeartRateTimestamp] = useState(null);
    
    // Chart data for live display
    const [heartRateData, setHeartRateData] = useState(null);
    const [fetalHeartRateData, setFetalHeartRateData] = useState(null);
    
    // Summary stats
    const [minHeartRate, setMinHeartRate] = useState(null);
    const [maxHeartRate, setMaxHeartRate] = useState(null);
    const [minFetalBPM, setMinFetalBPM] = useState(null);
    const [maxFetalBPM, setMaxFetalBPM] = useState(null);

    // Use dynamic API base URL
    const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000'
        : 'https://havenbloom-api.onrender.com';

    const WS_BASE_URL = window.location.hostname === 'localhost' 
        ? 'ws://localhost:3000'
        : 'wss://havenbloom-api.onrender.com';
    
    // Get contact name and initials based on call data
    const getContactInfo = () => {
        if (!callData) return { name: 'Unknown', initials: 'U' };
        
        // Determine who we're calling based on isReceiver
        const contactName = callData.isReceiver ? callData.callerName : callData.contactName;
        const initials = contactName ? contactName.split(' ').map(word => word[0]).join('').toUpperCase() : 'U';
        
        return { name: contactName || 'Unknown', initials };
    };

    // Get patient ID for monitoring - FIXED
    const getPatientIdForMonitoring = () => {
        if (!callData) return null;
        
        console.log('Call data for monitoring:', callData);
        
        // Get current user data to determine their role
        const userData = localStorage.getItem('user');
        if (!userData) return null;
        
        const parsedUser = JSON.parse(userData);
        const currentUserRole = parsedUser.user?.role || parsedUser.role;
        const currentUserId = parsedUser.user?._id || parsedUser.user?.id || parsedUser._id || parsedUser.id;
        
        console.log('Current user role:', currentUserRole);
        console.log('Current user ID:', currentUserId);
        console.log('Call data caller ID:', callData.callerId);
        console.log('Call data contact ID:', callData.contactId);
        
        // FIXED LOGIC: 
        // If current user is a doctor, monitor the patient (the other participant)
        // If current user is a patient, monitor themselves (their own ID)
        if (currentUserRole === 'doctor') {
            // Return the patient's ID (the other participant)
            return callData.callerId === currentUserId ? callData.contactId : callData.callerId;
        } else {
            // If current user is patient, monitor themselves
            // But we need to check which patient ID is actually sending data
            // Let's also check if the data is coming for contactId (could be patient's device data)
            
            // For now, let's try both the current user ID and contact ID
            // We'll expand the filtering logic instead
            return currentUserId;
        }
    };

    // Initialize user data
    useEffect(() => {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                if (!parsedUser._id && parsedUser.id) {
                    parsedUser._id = parsedUser.id;
                }
                setUser(parsedUser);
            }
        } catch (err) {
            console.error("Error loading user data:", err);
        }
    }, []);

    // WebSocket connection management for real-time monitoring
    const connectWebSocket = () => {
        const patientId = getPatientIdForMonitoring();
        console.log('Attempting to connect WebSocket for patient ID:', patientId);
        
        if (!patientId) {
            console.error('No patient ID available for monitoring');
            setWsError('No patient ID for monitoring');
            return;
        }
        
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket already connecting...');
            return;
        }

        try {
            const wsUrl = `${WS_BASE_URL}/ws`;
            console.log('Connecting to WebSocket:', wsUrl);
            
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('WebSocket connected for video call monitoring');
                console.log('Monitoring patient ID:', patientId);
                setWsConnected(true);
                setWsError(null);
                reconnectAttempts.current = 0;
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Raw WebSocket message received:', data);
                    
                    const patientId = getPatientIdForMonitoring();
                    const userData = localStorage.getItem('user');
                    const parsedUser = JSON.parse(userData);
                    const currentUserRole = parsedUser.user?.role || parsedUser.role;
                    const currentUserId = parsedUser.user?._id || parsedUser.user?.id || parsedUser._id || parsedUser.id;
                    
                    // DYNAMIC FILTERING LOGIC - Handle patient _id vs user_id mismatch
                    let isForPatient = false;
                    
                    if (currentUserRole === 'doctor') {
                        // For doctors, during video calls, accept BPM data for the contact patient
                        // Handle both patient._id and patient.user_id scenarios
                        const contactPatientId = callData.contactId; // This is the user_id (685d44ebaa2b9794610f9779)
                        
                        isForPatient = (
                            // Direct matches
                            data.patientId === contactPatientId ||
                            data.assignedUserId === contactPatientId ||
                            data.userId === contactPatientId ||
                            data.user_id === contactPatientId ||
                            // During doctor video calls, be more permissive for any valid BPM data
                            // This handles the patient._id vs user_id mismatch
                            (data.type === 'bpm_reading' && data.deviceType && data.bpm)
                        );
                        
                        console.log('🩺 DOCTOR MODE - Contact patient user_id:', contactPatientId);
                        console.log('🩺 Incoming data patient_id:', data.patientId);
                        console.log('🩺 Is valid BPM data:', data.type === 'bpm_reading' && !!data.deviceType && !!data.bpm);
                    } else {
                        // Patient logic - accept data for themselves
                        isForPatient = (
                            data.patientId === currentUserId || 
                            data.assignedUserId === currentUserId ||
                            data.userId === currentUserId ||
                            data.user_id === currentUserId ||
                            // Also accept if it's their own BPM data during calls
                            (data.type === 'bpm_reading' && data.deviceType && data.bpm)
                        );
                    }
                    
                    console.log('Message is for current patient:', isForPatient);
                    console.log('Patient ID being monitored:', patientId);
                    console.log('Current user ID:', currentUserId);
                    console.log('Contact ID:', callData.contactId);
                    console.log('Caller ID:', callData.callerId);
                    console.log('Message patientId:', data.patientId);
                    console.log('Message assignedUserId:', data.assignedUserId);
                    
                    if (isForPatient && data.bpm && data.deviceType) {
                        console.log('✅ ACCEPTING BPM data:', data.bpm, 'Device:', data.deviceType);
                        
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
                            const newReadings = [...filtered, reading].slice(-60);
                            console.log('Updated readings array length:', newReadings.length);
                            return newReadings;
                        });

                        // Update current values and timestamps based on device type
                        if (data.deviceType === 'smartwatch') {
                            console.log('Updating heart rate:', reading.bpm);
                            setCurrentHeartRate(reading.bpm);
                            setLastHeartRateTimestamp(reading.timestamp);
                        } else if (data.deviceType === 'doppler') {
                            console.log('Updating fetal heart rate:', reading.bpm);
                            setCurrentFetalHeartRate(reading.bpm);
                            setLastFetalHeartRateTimestamp(reading.timestamp);
                        }
                    } else {
                        console.log('❌ Message filtered out - not for current patient or missing required fields');
                        console.log('Data received:', data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message during call:', error);
                }
            };

            wsRef.current.onclose = (event) => {
                console.log('WebSocket closed during call:', event.code, event.reason);
                setWsConnected(false);
                
                if (event.code !== 1000) { // Not a normal closure
                    setWsError('Connection lost');
                    scheduleReconnect();
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error during call:', error);
                setWsError('Connection error');
                setWsConnected(false);
            };

        } catch (error) {
            console.error('Error creating WebSocket connection during call:', error);
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
            const patientId = getPatientIdForMonitoring();
            if (patientId) {
                connectWebSocket();
            }
        }, delay);
    };

    // Update chart data when readings change - Fixed version
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

        console.log('Heart rate readings:', heartRateReadings.length);
        console.log('Fetal heart rate readings:', fetalHeartRateReadings.length);

        // Create chart data for heart rate - FIXED
        const heartRateChartData = Array(20).fill(0);
        const recentHeartRateReadings = heartRateReadings.slice(-20);
        
        // Fill from the end, so recent data appears on the right
        const startIndex = Math.max(0, 20 - recentHeartRateReadings.length);
        recentHeartRateReadings.forEach((reading, index) => {
            heartRateChartData[startIndex + index] = reading.bpm;
        });

        setHeartRateData({
            labels: heartRateChartData.map((_, i) => ''),
            datasets: [
                {
                    label: 'Heart Rate',
                    data: heartRateChartData,
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#FF6B6B',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }
            ]
        });

        // Create chart data for fetal heart rate - FIXED
        const fetalHeartRateChartData = Array(20).fill(0);
        const recentFetalHeartRateReadings = fetalHeartRateReadings.slice(-20);
        
        // Fill from the end, so recent data appears on the right
        const fetalStartIndex = Math.max(0, 20 - recentFetalHeartRateReadings.length);
        recentFetalHeartRateReadings.forEach((reading, index) => {
            fetalHeartRateChartData[fetalStartIndex + index] = reading.bpm;
        });

        setFetalHeartRateData({
            labels: fetalHeartRateChartData.map((_, i) => ''),
            datasets: [
                {
                    label: 'Fetal Heart Rate',
                    data: fetalHeartRateChartData,
                    borderColor: '#D67AB1',
                    backgroundColor: 'rgba(214, 122, 177, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#D67AB1',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }
            ]
        });

        // Update min/max values for current session
        const allHeartRates = heartRateReadings.map(r => r.bpm).filter(bpm => bpm > 0);
        const allFetalRates = fetalHeartRateReadings.map(r => r.bpm).filter(bpm => bpm > 0);

        setMinHeartRate(allHeartRates.length ? Math.min(...allHeartRates) : null);
        setMaxHeartRate(allHeartRates.length ? Math.max(...allHeartRates) : null);
        setMinFetalBPM(allFetalRates.length ? Math.min(...allFetalRates) : null);
        setMaxFetalBPM(allFetalRates.length ? Math.max(...allFetalRates) : null);

    }, [readings]);

    // Initialize placeholder data - Fixed version
    const generatePlaceholderData = () => {
        setHeartRateData({
            labels: Array(20).fill(''),
            datasets: [
                {
                    label: 'Heart Rate',
                    data: Array(20).fill(0),
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0
                }
            ]
        });

        setFetalHeartRateData({
            labels: Array(20).fill(''),
            datasets: [
                {
                    label: 'Fetal Heart Rate',
                    data: Array(20).fill(0),
                    borderColor: '#D67AB1',
                    backgroundColor: 'rgba(214, 122, 177, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0
                }
            ]
        });
    };

    // Chart options - Match Analytics.jsx exactly
    const lineChartOptions = {
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
                    font: { size: 11 }
                }
            },
            x: {
                display: false,
                grid: { display: false }
            }
        },
        elements: {
            line: { borderWidth: 3, tension: 0.4 },
            point: { radius: 0, hoverRadius: 6 }
        },
        interaction: { intersect: false, mode: 'index' },
        animation: { duration: 200, easing: 'easeInOutQuad' }
    };
    
    // Initialize socket connection and get call data
    useEffect(() => {
        console.log('Initializing video call component');
        
        // Get call data from session storage
        const callDataString = sessionStorage.getItem('callData');
        if (!callDataString) {
            console.error('No call data found');
            navigate('/messages');
            return;
        }
        
        const parsedCallData = JSON.parse(callDataString);
        console.log('Call data:', parsedCallData);
        setCallData(parsedCallData);
        
        // Connect to socket server
        const newSocket = io('https://havenbloom-api.onrender.com');
        setSocket(newSocket);
        console.log('Socket connected');
        
        // Set initial waiting message with contact name
        const contactInfo = parsedCallData.isReceiver ? parsedCallData.callerName : parsedCallData.contactName;
        setWaitingMessage(`Waiting for ${contactInfo || 'the other participant'} to join...`);
        
        // Handle when other user leaves
        newSocket.on('user-left-call', () => {
            console.log('Other user left the call');
            setCallEnded(true);
            setCallEndedReason('The other participant has left the call');
            setTimeout(() => {
                navigate('/messages');
            }, 5000);
        });
        
        // Handle call ended by other user
        newSocket.on('call-ended', (data) => {
            console.log('Call ended by other user', data);
            setCallEnded(true);
            const contactInfo = parsedCallData.isReceiver ? parsedCallData.callerName : parsedCallData.contactName;
            setCallEndedReason(`Call ended by ${contactInfo || 'the other participant'}`);
            setTimeout(() => {
                navigate('/messages');
            }, 5000);
        });
        
        // Handle end-call event
        newSocket.on('end-call', () => {
            console.log('Received end-call event');
            setCallEnded(true);
            const contactInfo = parsedCallData.isReceiver ? parsedCallData.callerName : parsedCallData.contactName;
            setCallEndedReason(`Call ended by ${contactInfo || 'the other participant'}`);
            setTimeout(() => {
                navigate('/messages');
            }, 5000);
        });
        
        // Handle user ended call event
        newSocket.on('user-ended-call', (data) => {
            console.log('User ended call event received', data);
            setCallEnded(true);
            const contactInfo = parsedCallData.isReceiver ? parsedCallData.callerName : parsedCallData.contactName;
            setCallEndedReason(`Call ended by ${contactInfo || 'the other participant'}`);
            setTimeout(() => {
                navigate('/messages');
            }, 5000);
        });
        
        // Initialize placeholder data
        generatePlaceholderData();
        
        // Clean up on unmount
        return () => {
            console.log('Cleaning up video call component');
            clearInterval(timerRef.current);
            
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            
            // Notify other user before disconnecting
            if (newSocket && parsedCallData) {
                const roomId = [parsedCallData.callerId, parsedCallData.contactId].sort().join('_');
                newSocket.emit('leaving-call', { roomId });
            }
            
            // Clean up WebSocket
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounting');
                wsRef.current = null;
            }
            
            newSocket.disconnect();
        };
    }, [navigate]);

    // Initialize WebSocket for monitoring when call data is available
    useEffect(() => {
        const patientId = getPatientIdForMonitoring();
        if (patientId && callData) {
            console.log('Initializing patient monitoring for:', patientId);
            connectWebSocket();
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close(1000, 'Call ended');
                wsRef.current = null;
            }
        };
    }, [callData]);
    
    // Initialize media devices and WebRTC when call data and socket are ready
    useEffect(() => {
        if (!socket || !callData || callEnded) return;

        const isInitiator = !callData.isReceiver;
        const roomId = [callData.callerId, callData.contactId].sort().join('_');

        const initializeCall = async () => {
            try {
                console.log('Initializing call...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                console.log('Joining call room:', roomId);
                socket.emit('join-call-room', { 
                    roomId, 
                    userId: callData.isReceiver ? callData.callerId : callData.contactId,
                    callData: callData
                });

                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                peerConnectionRef.current = pc;

                stream.getTracks().forEach(track => pc.addTrack(track, stream));

                pc.ontrack = event => {
                    console.log('Received remote track');
                    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
                    setRemoteStream(event.streams[0]);
                    setIsWaiting(false);
                    startCallTimer();
                };

                pc.onicecandidate = event => {
                    if (event.candidate) {
                        console.log('Sending ICE candidate:', event.candidate);
                        socket.emit('ice-candidate', { roomId, candidate: event.candidate });
                    }
                };

                // Handle connection state changes
                pc.onconnectionstatechange = () => {
                    console.log('Connection state:', pc.connectionState);
                    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                        setCallEnded(true);
                        setCallEndedReason('Connection lost');
                        setTimeout(() => {
                            navigate('/messages');
                        }, 3000);
                    }
                };

                if (isInitiator) {
                    console.log('Creating offer...');
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    console.log('Sending call offer:', offer);
                    socket.emit('call-offer', { roomId, offer });
                }
            } catch (err) {
                console.error('Error initializing call:', err);
            }
        };

        const handleCallOffer = async ({ offer }) => {
            try {
                console.log('Received call offer:', offer);
                setWaitingMessage('Call connecting...');
                const pc = peerConnectionRef.current;
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log('Sending call answer:', answer);
                socket.emit('call-answer', { roomId, answer });
            } catch (err) {
                console.error('Error handling call offer:', err);
            }
        };

        const handleCallAnswer = async ({ answer }) => {
            try {
                console.log('Received call answer:', answer);
                setWaitingMessage('Call connecting...');
                const pc = peerConnectionRef.current;
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
                console.error('Error handling call answer:', err);
            }
        };

        const handleIceCandidate = async ({ candidate }) => {
            try {
                console.log('Received ICE candidate:', candidate);
                const pc = peerConnectionRef.current;
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        };

        // Handle leaving call event
        const handleLeavingCall = () => {
            console.log('Other user is leaving the call');
            setCallEnded(true);
            setCallEndedReason('The other participant has left the call');
            setTimeout(() => {
                navigate('/messages');
            }, 3000);
        };

        socket.on('call-offer', handleCallOffer);
        socket.on('call-answer', handleCallAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('leaving-call', handleLeavingCall);

        initializeCall();

        return () => {
            socket.off('call-offer', handleCallOffer);
            socket.off('call-answer', handleCallAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('leaving-call', handleLeavingCall);
        };
    }, [socket, callData, navigate, callEnded]);
    
    // Handle call timer - Fixed version
    const startCallTimer = () => {
        if (timerRef.current) return; // Don't start multiple timers
        
        const startTime = Date.now();
        setCallStartTime(startTime);
        
        timerRef.current = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);
    };
    
    // End call and return to messages
    const endCall = () => {
        if (socket && callData) {
            const targetId = callData.isReceiver ? callData.callerId : callData.contactId;
            const roomId = [callData.callerId, callData.contactId].sort().join('_');
            
            console.log('Ending call, notifying:', targetId);
            console.log('Room ID:', roomId);
            
            // Emit to specific room instead of specific user
            socket.emit('end-call', { 
                targetId, 
                roomId,
                callerId: callData.callerId,
                contactId: callData.contactId
            });
            
            // Also emit call-ended event to the room
            socket.emit('call-ended', { 
                targetId, 
                roomId,
                callerId: callData.callerId,
                contactId: callData.contactId
            });
        }
        
        // Set call ended state
        setCallEnded(true);
        setCallEndedReason('Call ended');
        
        // Clean up local stream
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped track:', track.kind);
            });
        }
        
        // Always navigate back after a delay
        setTimeout(() => {
            navigate('/messages');
        }, 3000);
    };
    
    // Toggle video - updated to track state
    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
                console.log('Video track enabled:', videoTrack.enabled);
            }
        }
    };
    
    // Toggle audio - updated to track state
    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
                console.log('Audio track enabled:', audioTrack.enabled);
            }
        }
    };

    // Get contact info for current call
    const contactInfo = getContactInfo();

    // If call ended, show call ended screen
    if (callEnded) {
        return (
            <div className="videocall-page">
                <div className="call-ended-screen">
                    <div className="call-ended-content">
                        <div className="ended-icon">📞</div>
                        <h2>Call Ended</h2>
                        <p>{callEndedReason}</p>
                        <p className="redirect-message">
                            Redirecting to messages in a few seconds...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="videocall-page">
            {/* Top header */}
            <div className="call-header">
                <div className="caller-avatar">{contactInfo.initials}</div>
                <div className="caller-info">
                    <div className="caller-name">{contactInfo.name}</div>
                    <div className="call-duration">
                        {isWaiting ? waitingMessage : `Call Duration: ${callDuration}`}
                    </div>
                </div>
                <div className="session-type">
                    <span className="monitoring-status">
                        {wsConnected ? '🟢 Live Monitoring' : '🔴 Monitoring Offline'}
                    </span>
                    Fetal Monitoring Session
                </div>
            </div>
            
            {/* Main content area */}
            <div className="main-content">
                {/* LEFT SECTION - Video area */}
                <div className="left-section">
                    <div className="video-container">
                        {/* Waiting overlay */}
                        {isWaiting && (
                            <div className="waiting-overlay">
                                <div className="waiting-content">
                                    <div className="waiting-avatar">{contactInfo.initials}</div>
                                    <div className="waiting-text">
                                        <h3>{waitingMessage}</h3>
                                        <div className="waiting-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Remote video */}
                        <video
                            ref={remoteVideoRef}
                            className={`remote-video ${isWaiting ? 'hidden' : ''}`}
                            autoPlay
                            playsInline
                        />
                        
                        {/* Local video */}
                        <video
                            ref={localVideoRef}
                            className="local-video"
                            autoPlay
                            playsInline
                            muted
                        />
                    </div>
                </div>

                {/* RIGHT SECTION - Vital signs panel */}
                <div className="right-section">
                    <div className="vital-signs-panel">
                        {/* Heart Rate Metric */}
                        <div className="metric-box heart-rate-box">
                            <div className="metric-header">
                                <FaHeart className="metric-icon heart-icon" />
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
                                        options={{
                                            ...lineChartOptions,
                                            plugins: {
                                                ...lineChartOptions.plugins,
                                                tooltip: {
                                                    ...lineChartOptions.plugins.tooltip,
                                                    backgroundColor: 'rgba(255, 107, 107, 0.9)',
                                                    borderColor: '#FF6B6B'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {/* FIXED condition - check if we have any actual heart rate readings */}
                                {readings.filter(r => r.deviceType === 'smartwatch' && r.timestamp > new Date(Date.now() - 60000)).length === 0 ? (
                                    <div className="no-data-message">
                                        Waiting for heart rate data...
                                    </div>
                                ) : null}
                            </div>
                            <div className="metric-stats">
                                {minHeartRate !== null && maxHeartRate !== null && (
                                    <>
                                        <span className="stat-item low">
                                            <FaArrowDown />
                                            Low: <span className="stat-value">{minHeartRate}</span>
                                        </span>
                                        <span className="stat-item high">
                                            <FaArrowUp />
                                            High: <span className="stat-value">{maxHeartRate}</span>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Fetal Heart Rate Metric */}
                        <div className="metric-box fetal-rate-box">
                            <div className="metric-header">
                                <FaBaby className="metric-icon fetal-icon" />
                                <h3>Fetal Heart Rate</h3>
                                <div className="current-bpm">
                                    <span className="bpm-value">{currentFetalHeartRate}</span>
                                    <span className="bpm-unit">BPM</span>
                                </div>
                            </div>
                            <div className="chart-container">
                                {fetalHeartRateData && (
                                    <Line
                                        data={fetalHeartRateData}
                                        options={lineChartOptions}
                                    />
                                )}
                                {/* FIXED condition - check if we have any actual fetal readings */}
                                {readings.filter(r => r.deviceType === 'doppler' && r.timestamp > new Date(Date.now() - 60000)).length === 0 ? (
                                    <div className="no-data-message">
                                        Waiting for fetal heart rate data...
                                    </div>
                                ) : null}
                            </div>
                            <div className="metric-stats">
                                {minFetalBPM !== null && maxFetalBPM !== null && (
                                    <>
                                        <span className="stat-item low">
                                            <FaArrowDown />
                                            Low: <span className="stat-value">{minFetalBPM}</span>
                                        </span>
                                        <span className="stat-item high">
                                            <FaArrowUp />
                                            High: <span className="stat-value">{maxFetalBPM}</span>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Bottom control bar */}
            <div className="call-controls">
                <button className="control-btn video-toggle" onClick={toggleVideo}>
                    {isVideoEnabled ? <BsCameraVideo size={20} /> : <BsCameraVideoOff size={20} />}
                    <span>Toggle Video</span>
                </button>
                
                <button className="control-btn audio-toggle" onClick={toggleAudio}>
                    {isAudioEnabled ? <BsMic size={20} /> : <BsMicMute size={20} />}
                    <span>Toggle Audio</span>
                </button>
                
                <button className="end-call-btn" onClick={endCall}>
                    <BsTelephone size={20} />
                    <span>End Call</span>
                </button>
            </div>
        </div>
    );
};

export default Videocall;