const Message = require('../models/messageModel');

// Get conversation between two users
const getAllMessages = async (req, res) => {
    try {
        const { sender_id, receiver_id } = req.query;
        
        if (!sender_id || !receiver_id) {
            return res.status(400).json({ error: 'Both sender_id and receiver_id are required' });
        }
        
        console.log('Finding conversation between:', sender_id, receiver_id);

        // THIS IS THE KEY FIX - Use $or to find messages in BOTH directions
        const messages = await Message.find({
            $or: [
                { sender_id: sender_id, receiver_id: receiver_id },
                { sender_id: receiver_id, receiver_id: sender_id } // This retrieves messages sent TO the user
            ]
        }).sort({ time_sent: 1 });
        
        console.log(`Found ${messages.length} messages in the conversation`);
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error retrieving messages:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get message by ID
const getMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create new message
const createMessage = async (req, res) => {
    try {
        const { sender_id, receiver_id, message, room } = req.body;
        
        if (!sender_id || !receiver_id || !message || !room) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Create room ID consistently
        const roomId = [sender_id, receiver_id].sort().join('_');
        
        const newMessage = new Message({
            sender_id: String(sender_id),
            receiver_id: String(receiver_id),
            message,
            room: roomId,
            time_sent: new Date()
        });
        
        const savedMessage = await newMessage.save();
        
        // Get socket.io instance and emit only once
        const io = req.app.get('io');
        if (io) {
            io.to(roomId).emit('receive_message', {
                ...savedMessage.toObject(),
                room: roomId
            });
        }
        
        res.status(201).json(savedMessage);
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllMessages,
    getMessage,
    createMessage
};