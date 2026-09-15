const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication error'));
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = verified;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
};

module.exports = socketAuth;