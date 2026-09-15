require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const WebSocket = require('ws');

// Import existing routes
const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');
const userRoutes = require('./routes/userRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const messageRoutes = require('./routes/messageRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const fetalHeartRateRoutes = require('./routes/fetalHeartRateRoutes');
const audioRoutes = require('./routes/audioRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const websocketRoutes = require('./routes/websocketRoutes');
const { startMqttListener } = require('./services/mqttService');
const { startWebSocketServer } = require('./services/websocketService');
const { connectToDb } = require('./db');
const otpRoutes = require("./routes/otpRoutes");



// init app & middleware
const app = express();
const httpServer = createServer(app);

// Critical: Create socket server with CORS settings
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, restrict this to your frontend URL
    methods: ["GET", "POST"]
  }
});

// Create WebSocket server for live BPM broadcasting
const wss = new WebSocket.Server({ 
  server: httpServer, 
  path: '/ws' 
});

// Make io and wss available to other services
app.set('io', io);
app.set('wss', wss);

// middleware
app.use(express.json());
app.use(cors());  // Add this line to enable CORS

// routes
app.use('/api/admins', adminRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/fetal-heart-rate', fetalHeartRateRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/watch-heart-rate', require('./routes/watchHeartRateRoutes'));
app.use('/api/websocket', websocketRoutes); // Add this line
app.use("/api/otp", otpRoutes);
// Landing page route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Havenbloom Backend API</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: linear-gradient(135deg, #fdf2f8, #f3e8ff, #e0e7ff);
          text-align: center; 
          padding: 60px 20px;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
        }
        h1 { 
          color: #D946EF; 
          font-size: 2.5rem;
          margin-bottom: 20px;
        }
        .progress-header {
          color: #818CF8;
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 8px;
          margin-top: 32px;
        }
        p { 
          color: #374151; 
          font-size: 1.2rem;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .endpoints {
          text-align: left;
          background: rgba(255,255,255,0.8);
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .endpoint {
          margin: 10px 0;
          font-family: monospace;
          background: #f3f4f6;
          padding: 8px;
          border-radius: 4px;
        }
        .progress-bar-bg {
          width: 100%;
          background: #e5e7eb;
          border-radius: 10px;
          height: 28px;
          margin: 10px 0 20px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .progress-bar-fill {
          width: 75%;
          height: 100%;
          background: linear-gradient(90deg, #D946EF, #818CF8);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          transition: width 0.5s;
          color: #fff;
          font-weight: bold;
          font-size: 1rem;
          padding-right: 16px;
          box-sizing: border-box;
        }
        .github-link {
          display: inline-block;
          background: #1f2937;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          transition: background-color 0.3s;
          margin: 20px 0;
        }
        .github-link:hover {
          background: #374151;
        }
        .footer {
          margin-top: 50px;
          color: #6b7280;
          font-size: 0.9rem;
        }
        .footer a {
          color: #D946EF;
          text-decoration: none;
        }
        .footer a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Havenbloom Backend API</h1>
        <p>Welcome to the Havenbloom Backend API server. This powerful backend provides secure and scalable endpoints for the Havenbloom application ecosystem.</p>
        
        <div class="endpoints">
          <h3>Live Data Endpoints:</h3>
          <div class="endpoint">WebSocket: ws://localhost:${process.env.PORT || 3000}/ws</div>
          <div class="endpoint">Socket.IO: http://localhost:${process.env.PORT || 3000}</div>
          <div class="endpoint">REST API: /api/*</div>
        </div>
        
        <div class="progress-header">Havenbloom Completion Progress</div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill">75%</div>
        </div>
        
        <a href="https://github.com/mavcay/havenbloom-backend" target="_blank" rel="noopener noreferrer" class="github-link">
          View Repository on GitHub
        </a>
        
        <div class="footer">
          <p>Created by <a href="https://github.com/mavcay" target="_blank" rel="noopener noreferrer">mavcay</a></p>
          <p>&copy; 2025 Havenbloom API</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Socket connection handler
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // --- Messaging: Join and send ---
  socket.on('join_room', (data) => {
    const { sender_id, receiver_id } = data;
    const messageRoomId = `msg_${[sender_id, receiver_id].sort().join('_')}`;
    // Only leave previous message rooms, NOT call rooms
    for (const room of socket.rooms) {
      if (room.startsWith('msg_') && room !== messageRoomId) {
        socket.leave(room);
      }
    }
    socket.join(messageRoomId);
    console.log(`User ${sender_id} joined messaging room: ${messageRoomId}`);
  });

  socket.on('send_message', (messageData) => {
    const messageRoomId = `msg_${[messageData.sender_id, messageData.receiver_id].sort().join('_')}`;
    console.log(`Sending message to room: ${messageRoomId}`);
    io.to(messageRoomId).emit('receive_message', messageData);
  });

  // --- Video Call: Join and signaling ---
  socket.on('join-call-room', ({ roomId, userId }) => {
    const callRoomId = `call_${roomId}`;
    // Only leave previous call rooms, NOT message rooms
    for (const room of socket.rooms) {
      if (room.startsWith('call_') && room !== callRoomId) {
        socket.leave(room);
      }
    }
    socket.join(callRoomId);
    console.log(`User ${userId} joined call room ${callRoomId}`);
  });

  socket.on('call-offer', ({ roomId, offer }) => {
    const callRoomId = `call_${roomId}`;
    console.log('Call offer received for room:', callRoomId);
    socket.to(callRoomId).emit('call-offer', { offer });
  });

  socket.on('call-answer', ({ roomId, answer }) => {
    const callRoomId = `call_${roomId}`;
    console.log('Call answer received for room:', callRoomId);
    socket.to(callRoomId).emit('call-answer', { answer });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    const callRoomId = `call_${roomId}`;
    console.log('ICE candidate received for room:', callRoomId);
    socket.to(callRoomId).emit('ice-candidate', { candidate });
  });

  socket.on('end-call', ({ roomId }) => {
    const callRoomId = `call_${roomId}`;
    console.log('Call ended for room:', callRoomId);
    socket.to(callRoomId).emit('call-ended');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

startMqttListener();
startWebSocketServer(wss);
// Important: Use httpServer not app to listen
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectToDb(() => {
    console.log('Ready to handle requests');
  });
});