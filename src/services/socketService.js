import { io } from 'socket.io-client';

let socket = null;

export const getSocket = async (token) => {
  if (!socket) {
    try {
      socket = io('https://havenbloom-api.onrender.com', {
        auth: { token }
      });
      
      // Add global error and connect events
      socket.on('connect', () => {
        console.log('Socket connected successfully');
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        socket = null;
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected us, we need to reconnect manually
          socket.connect();
        }
        // If the disconnection was initiated by the server, socket.io won't reconnect automatically
      });
    } catch (error) {
      console.error('Error initializing socket:', error);
      socket = null;
    }
  }
  
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
