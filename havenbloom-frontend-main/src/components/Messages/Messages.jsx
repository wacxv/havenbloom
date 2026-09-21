import React, { useState, useEffect, useRef } from 'react';
import { IoCall } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios'; // Make sure this is imported
import './Messages.css';

const demoMessageUser = { user_id: 'demo-patient', role: 'patient', first_name: 'Elena', last_name: 'Carter', email: 'elena.carter@example.com' };
const demoReceiver = { _id: 'demo-doctor-1', user_id: 'demo-doctor-1', full_name: 'Dr. Amelia Carter' };
const demoMessages = [{ id: 'demo-message-1', type: 'received', content: 'Hello Elena. Your care plan is looking great this week.' }, { id: 'demo-message-2', type: 'sent', content: 'Thank you. I feel good and will see you at my appointment.' }];

const Messages = () => {
    // Existing state variables
    const [socket, setSocket] = useState(null);
    const [currentUserId, setCurrentUserId] = useState('demo-patient');
    const [receiverId, setReceiverId] = useState('');
    const [token, setToken] = useState(null);
    const [messages, setMessages] = useState(demoMessages);
    const [currentRoom, setCurrentRoom] = useState('demo-patient_demo-doctor-1');
    const [receivers, setReceivers] = useState([demoReceiver]);
    const [selectedReceiver, setSelectedReceiver] = useState(demoReceiver);
    
    // Add state for incoming call notification
    const [incomingCall, setIncomingCall] = useState(null);
    
    const messagesEndRef = useRef(null);
    const messageInputRef = useRef(null);
    const ringToneRef = useRef(null);
    
    const navigate = useNavigate();

    // Modify your existing useEffect for socket connection to include call handling
    useEffect(() => {
        if (socket) {
            // Add event listener for incoming calls
            socket.on('incoming-call', ({ callerId, callerName }) => {
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
            
            return () => {
                socket.off('incoming-call');
            };
        }
    }, [socket]);
    
    // Function to handle accepting a call
    const acceptCall = () => {
        if (!incomingCall) return;
        
        // Stop ringtone if it's playing
        if (ringToneRef.current) {
            ringToneRef.current.pause();
            ringToneRef.current.currentTime = 0;
        }
        
        // Notify caller that call was accepted
        if (socket) {
            socket.emit('call-accepted', {
                targetId: incomingCall.callerId
            });
        }
        
        // Set up call data for the video call page
        const callData = {
            callerId: incomingCall.callerId,
            callerName: incomingCall.callerName,
            contactId: currentUserId,
            contactName: 'You', // This should be your name
            isReceiver: true
        };
        
        // Store call data and navigate to call screen
        sessionStorage.setItem('callData', JSON.stringify(callData));
        navigate('/videocall');
    };
    
    // Function to handle rejecting a call
    const rejectCall = () => {
        if (!incomingCall || !socket) return;
        
        // Stop ringtone if it's playing
        if (ringToneRef.current) {
            ringToneRef.current.pause();
            ringToneRef.current.currentTime = 0;
        }
        
        // Notify caller that call was rejected
        socket.emit('call-rejected', {
            targetId: incomingCall.callerId
        });
        
        // Clear the incoming call state
        setIncomingCall(null);
    };

    // Replace the current useEffect with this one
    useEffect(() => {
        const initializeUser = async () => {
            if (!token) return;
            try {
                const userData = localStorage.getItem('user');
                if (!userData) {
                    navigate('/signin');
                    return;
                }
                
                const parsedUser = JSON.parse(userData);
                const role = parsedUser.user?.role || parsedUser.role;
                const userId = parsedUser.user_id || parsedUser.user?.user_id || parsedUser._id || parsedUser.id;

                if (!role || !userId) throw new Error('Role or user_id not found');

                // Use the correct endpoint format
                const endpoint = role === 'doctor' ? '/api/doctors' : '/api/patients';
                const authToken = localStorage.getItem('token');
                
                const response = await fetch(`https://havenbloom-api.onrender.com${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch user list');
                const users = await response.json();
                
                // Find user by matching either MongoDB _id or user_id
                const foundUser = users.find(u => 
                    u._id === userId || 
                    u.user_id === userId
                );

                if (!foundUser) throw new Error('User not found');
                
                // Set both MongoDB _id and user_id
                setCurrentUserId(foundUser.user_id);
                
                // Load receivers after setting currentUserId
                if (role) {
                    loadReceivers(role);
                }

            } catch (error) {
                console.error('Initialization error:', error);
                navigate('/signin');
            }
        };
        initializeUser();
    }, [navigate]);

    // Add a new useEffect that depends on currentUserId
    useEffect(() => {
        if (currentUserId) {
            try {
                const userData = localStorage.getItem('user');
                if (!userData) return;
                const parsedUser = JSON.parse(userData);
                const role = parsedUser.user?.role || parsedUser.role;
                if (!role) throw new Error('Role not found');
                
                console.log('Loading receivers with userId:', currentUserId, 'role:', role);
                loadReceivers(role);
            } catch (error) {
                console.error('Error loading receivers:', error);
            }
        }
    }, [currentUserId]);

    const getToken = async () => {
        const response = await fetch('https://havenbloom-api.onrender.com/api/messages/test-token');
        const data = await response.json();
        setToken(data.token);
        return data.token;
    };

    const loadReceivers = async (userRole) => {
        try {
            if (!currentUserId) {
                console.error("Cannot load receivers: currentUserId is null");
                return;
            }

            const newToken = await getToken();

            // Use the correct endpoint for assignments
            let assignmentsUrl;
            let targetField;
            let targetType;
            if (userRole === 'doctor') {
                assignmentsUrl = `https://havenbloom-api.onrender.com/api/assignments/doctor/${currentUserId}`;
                targetField = 'patient_id';
                targetType = 'patients';
            } else {
                assignmentsUrl = `https://havenbloom-api.onrender.com/api/assignments/patient/${currentUserId}`;
                targetField = 'doctor_id';
                targetType = 'doctors';
            }

            const response = await fetch(assignmentsUrl, {
                headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const assignments = await response.json();

            if (!Array.isArray(assignments) || assignments.length === 0) {
                setReceivers([]);
                return;
            }

            // Get the assigned MongoDB _id values as strings
            const assignedMongoIds = assignments
                .map(assignment => {
                    const field = assignment[targetField];
                    if (!field) return null;
                    if (typeof field === 'object' && field._id) return field._id.toString();
                    if (typeof field === 'string') return field;
                    return null;
                })
                .filter(Boolean);

            // Fetch all users of the target type
            const allUsersUrl = `https://havenbloom-api.onrender.com/api/${targetType}`;

            const allUsersResponse = await fetch(allUsersUrl, {
                headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!allUsersResponse.ok) {
                throw new Error(`Failed to fetch all ${targetType}`);
            }

            const allUsers = await allUsersResponse.json();

            // Filter to only those assigned to current user by comparing _id
            const assignedUsers = allUsers.filter(user =>
                assignedMongoIds.includes(user._id?.toString())
            );

            // For messaging, use user.user_id as the receiverId
            const processedReceivers = assignedUsers.map(user => ({
                _id: user._id, // MongoDB _id
                user_id: user.user_id, // This is the user_id used for messaging
                full_name: getUserFullName(user)
            }));

            setReceivers(processedReceivers);
        } catch (error) {
            console.error('Failed to load receivers:', error);
            appendMessage('System', 'Failed to load receivers');
        }
    };

    const loadMessageContacts = async () => {
        try {
            // Get user info from localStorage
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const parsedUser = JSON.parse(userData);
            const role = parsedUser.user?.role || parsedUser.role;
            const userId = parsedUser.user_id || parsedUser.user?.user_id || parsedUser._id || parsedUser.id;

            if (!role || !userId) throw new Error('Role or user_id not found');

            // Fetch all users of this type to get MongoDB _id for assignments API
            const endpoint = role === 'doctor' ? '/api/doctors' : '/api/patients';
            const authToken = localStorage.getItem('token');
            const response = await fetch(`https://havenbloom-api.onrender.com${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Failed to fetch user list');
            const users = await response.json();
            const foundUser = users.find(u => u.user_id === userId);
            if (!foundUser || !foundUser._id) throw new Error('MongoDB _id not found for user');

            // Now fetch assignments for this user
            let assignmentsUrl, targetField, targetType;
            if (role === 'doctor') {
                assignmentsUrl = `https://havenbloom-api.onrender.com/api/assignments/doctor/${foundUser._id}`;
                targetField = 'patient_id';
                targetType = 'patients';
            } else {
                assignmentsUrl = `https://havenbloom-api.onrender.com/api/assignments/patient/${foundUser._id}`;
                targetField = 'doctor_id';
                targetType = 'doctors';
            }

            const assignmentsRes = await fetch(assignmentsUrl, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!assignmentsRes.ok) throw new Error('Failed to fetch assignments');
            const assignments = await assignmentsRes.json();

            // Get the assigned MongoDB _id values as strings
            const assignedMongoIds = assignments
                .map(assignment => {
                    const field = assignment[targetField];
                    if (!field) return null;
                    if (typeof field === 'object' && field._id) return field._id.toString();
                    if (typeof field === 'string') return field;
                    return null;
                })
                .filter(Boolean);

            // Fetch all users of the target type
            const allUsersUrl = `https://havenbloom-api.onrender.com/api/${targetType}`;
            const allUsersResponse = await fetch(allUsersUrl, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!allUsersResponse.ok) throw new Error('Failed to fetch all contacts');
            const allUsers = await allUsersResponse.json();

            // Filter to only those assigned to current user by comparing _id
            const assignedUsers = allUsers.filter(user =>
                assignedMongoIds.includes(user._id?.toString())
            );

            // For messaging, use user.user_id as the receiverId
            const processedReceivers = assignedUsers.map(user => ({
                _id: user._id, // MongoDB _id
                user_id: user.user_id, // This is the user_id used for messaging
                full_name: getUserFullName(user)
            }));

            setReceivers(processedReceivers);
            setCurrentUserId(foundUser.user_id); // Use user_id for messaging
        } catch (error) {
            console.error('Failed to load message contacts:', error);
            setReceivers([]);
        }
    };

    const handleSelectReceiver = async (receiver) => {
        setSelectedReceiver(receiver);
        setReceiverId(receiver.user_id);
        await fetchPreviousMessages(receiver.user_id); // Fetch old messages
        await connectUser(receiver.user_id);
    };

    const connectUser = async (selectedReceiverId = null) => {
        const receiverToUse = selectedReceiverId || receiverId;
        if (!currentUserId || !receiverToUse) {
            appendMessage('System', 'Please select a contact');
            return;
        }

        if (!token) {
            setCurrentRoom([currentUserId, receiverToUse].sort().join('_'));
            return;
        }

        try {
            const newToken = await getToken();
            const newRoom = [currentUserId, receiverToUse].sort().join('_');
            setCurrentRoom(newRoom);

            if (socket) {
                socket.off(); // clear previous listeners
                socket.disconnect();
            }

            const newSocket = io('https://havenbloom-api.onrender.com', {
                auth: { token: newToken }
            });

            newSocket.on('connect', () => {
                newSocket.emit('join_room', {
                    sender_id: currentUserId,
                    receiver_id: receiverToUse,
                    room: newRoom
                });
                appendMessage('System', 'Connected to conversation');
            });

            newSocket.on('receive_message', (message) => {
                if (message.room === newRoom) {
                    if (message.sender_id === currentUserId) return; // already appended
                    appendMessage('Received', message.message);
                }
            });

            setSocket(newSocket);

            if (messageInputRef.current) {
                messageInputRef.current.focus();
            }
        } catch (error) {
            console.error('Connection error:', error);
            appendMessage('System', 'Failed to connect');
        }
    };

    const fetchPreviousMessages = async (receiverUserId) => {
        if (!token) return;
        try {
            const newToken = await getToken();
            const response = await fetch(
                `https://havenbloom-api.onrender.com/api/messages?sender_id=${currentUserId}&receiver_id=${receiverUserId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const data = await response.json();
            if (Array.isArray(data)) {
                setMessages(
                    data.map(msg => ({
                        id: msg._id,
                        type: msg.sender_id === currentUserId ? 'sent' : 'received',
                        content: msg.message
                    }))
                );
            }
        } catch (error) {
            console.error('Failed to fetch previous messages:', error);
            appendMessage('System', 'Failed to load previous messages');
        }
    };

    const handleSendMessage = async () => {
        const messageInput = messageInputRef.current;
        const content = messageInput.value;

        if (!content.trim()) return;

        if (!currentRoom) {
            appendMessage('System', 'Please select a contact first');
            return;
        }

        const messageData = {
            sender_id: currentUserId,
            receiver_id: receiverId,
            message: content,
            room: currentRoom
        };

        if (!token) {
            appendMessage('Sent', content);
            messageInput.value = '';
            return;
        }

        try {
            const response = await fetch('https://havenbloom-api.onrender.com/api/messages/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(messageData)
            });

            const savedMessage = await response.json();
            socket.emit('send_message', { ...savedMessage, room: currentRoom });

            appendMessage('Sent', content); // append immediately
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage('System', 'Failed to send message');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const appendMessage = (type, content) => {
        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.content === content && lastMsg.type === type.toLowerCase()) {
                return prev; // prevent accidental duplication
            }
            return [...prev, {
                id: Date.now(),
                type: type.toLowerCase(),
                content
            }];
        });
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Existing initiateVideoCall function...
    const initiateVideoCall = () => {
        if (!selectedReceiver || !socket) {
            appendMessage('System', 'Please select a contact first or wait for connection');
            return;
        }

        try {
            const userData = localStorage.getItem('user');
            if (!userData) {
                appendMessage('System', 'User data not found');
                return;
            }

            const parsedUser = JSON.parse(userData);
            const userName = parsedUser.name || parsedUser.user?.name || 'You';

            // Prepare call data
            const callData = {
                callerId: currentUserId,
                callerName: userName,
                contactId: selectedReceiver.user_id,
                contactName: selectedReceiver.full_name,
                isReceiver: false
            };

            // Store call data in session storage
            sessionStorage.setItem('callData', JSON.stringify(callData));

            // IMPORTANT: Emit socket event to notify the other user
            socket.emit('call-user', {
                targetId: selectedReceiver.user_id,
                callerId: currentUserId,
                callerName: userName
            });
            
            console.log('Call initiated to:', selectedReceiver.full_name);
            appendMessage('System', `Calling ${selectedReceiver.full_name}...`);

            // Navigate to video call page
            navigate('/videocall');
        } catch (error) {
            console.error('Error initiating call:', error);
            appendMessage('System', 'Failed to start video call');
        }
    };

    // Function to get user name (same as Home/Calendar/Analytics)
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

    // Add user info for header
    const [user, setUser] = useState(demoMessageUser);
    const [userRole, setUserRole] = useState('patient');
    // const [token, setToken] = useState(null);

    // Get user data from localStorage (same as Calendar/Analytics)
    useEffect(() => {
        try {
            const userData = localStorage.getItem('user');
            const authToken = localStorage.getItem('token');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                // Ensure we have the correct user_id
                const userId = parsedUser.user_id || parsedUser.user?.user_id || parsedUser._id || parsedUser.id;
                setUser({
                    ...parsedUser,
                    user_id: userId
                });
                setUserRole(parsedUser.role || parsedUser.user?.role);
            }
            if (authToken) setToken(authToken);
        } catch (err) {
            console.error("Error loading user data:", err);
        }
    }, []);

    // Fetch latest user details from API (doctor or patient)
    useEffect(() => {
        const fetchUserDetails = async () => {
            if (!user || !userRole || !token) return;
            
            try {
                // Use user_id instead of _id for the API endpoint
                const endpoint = userRole === 'doctor'
                    ? `/api/doctors/user/${user.user_id}`  // Changed endpoint format
                    : `/api/patients/user/${user.user_id}`; // Changed endpoint format
                    
                const response = await axios.get(`https://havenbloom-api.onrender.com${endpoint}`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.data) {
                    // Update user state with response data
                    setUser(prev => ({ 
                        ...prev, 
                        ...response.data,
                        firstName: response.data.first_name || response.data.firstName,
                        lastName: response.data.last_name || response.data.lastName
                    }));
                }
            } catch (error) {
                console.error(`Error fetching ${userRole} details:`, error);
            }
        };
        fetchUserDetails();
    }, [user?.user_id, userRole, token]); // Changed dependency to user_id

    useEffect(() => {
        setReceivers([demoReceiver]);
        setSelectedReceiver(demoReceiver);
        // eslint-disable-next-line
    }, []);

    return (
        <div className="messages-page-root">
            <div className="main-content">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Messages</h1>
                    <div className="user-profile">
                        <div className="user-info">
                            <h4 className="patient-name">{getUserFullName(user)}</h4>
                            <p className="patient-email">{user?.email || "patient-name@gmail.com"}</p>
                        </div>
                        <div className="profile-avatar" onClick={() => navigate('/profile')} 
            style={{ cursor: 'pointer' }}
            title="View Profile"></div>
                    </div>
                </div>
                <div className="messages-card">
                    <div className="contacts-panel">
                        <div className="contacts-title">Contacts</div>
                        <div className="contacts-list">
                            {receivers.length === 0 ? (
                                <div className="no-contacts">No contacts available</div>
                            ) : (
                                receivers.map(receiver => (
                                    <div 
                                        key={receiver._id}
                                        className={`contact-item ${selectedReceiver?.user_id === receiver.user_id ? 'active' : ''}`}
                                        onClick={() => handleSelectReceiver(receiver)}
                                    >
                                        <div className="contact-avatar">
                                            {receiver.full_name.charAt(0)}
                                        </div>
                                        <div className="contact-info">
                                            <div className="contact-name">{receiver.full_name}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="chat-panel">
                        {selectedReceiver ? (
                            <>
                                <div className="chat-header">
                                    <div className="chat-contact">
                                        <div className="contact-avatar">{selectedReceiver.full_name.charAt(0)}</div>
                                        <div className="contact-name">{selectedReceiver.full_name}</div>
                                    </div>
                                    <button className="video-call-icon-btn" onClick={initiateVideoCall}>
                                        <IoCall size={22} color="#34C759" />
                                    </button>
                                </div>
                                <div className="messages-container">
                                    {messages.length === 0 ? (
                                        <div className="no-messages">
                                            Start a conversation with {selectedReceiver.full_name}
                                        </div>
                                    ) : (
                                        messages.map(msg => (
                                            msg.type === 'system' ? (
                                                <div key={msg.id} className="message system">
                                                    {msg.content}
                                                </div>
                                            ) : (
                                                <div key={msg.id} className={`message ${msg.type}`}>
                                                    <div className="message-bubble">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            )
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="message-input-bar">
                                    <input
                                        ref={messageInputRef}
                                        type="text"
                                        placeholder="Type a message..."
                                        onKeyPress={handleKeyPress}
                                    />
                                    <button className="send-btn" onClick={handleSendMessage}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#3A3AFF"><path d="M2 21l21-9-21-9v7l15 2-15 2z"/></svg>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="no-chat-selected">
                                <div className="placeholder-text">Select a contact to start chatting</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Messages;
