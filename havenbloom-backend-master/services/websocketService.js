const WebSocket = require('ws');

let wss = null;
let connectedClients = new Map();
let pingInterval = null;

/**
 * Initialize WebSocket server
 */
function startWebSocketServer(websocketServer) {
    wss = websocketServer;
    
    wss.on('connection', (ws, req) => {
        const clientId = generateClientId();
        const clientInfo = {
            id: clientId,
            ws: ws,
            connectedAt: new Date(),
            isAlive: true,
            ip: req.socket.remoteAddress
        };
        
        connectedClients.set(clientId, clientInfo);
        
        console.log(`🔗 WebSocket client connected - ID: ${clientId}, IP: ${clientInfo.ip}, Total clients: ${connectedClients.size}`);
        
        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connection',
            message: 'Connected to Havenbloom BPM stream',
            clientId: clientId,
            timestamp: new Date().toISOString()
        }));
        
        // Handle pong responses
        ws.on('pong', () => {
            clientInfo.isAlive = true;
        });
        
        // Handle client messages (optional)
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                console.log(`📩 Message from client ${clientId}:`, data);
                
                // Handle client-specific requests if needed
                if (data.type === 'subscribe') {
                    clientInfo.subscribedUserId = data.userId;
                    console.log(`📋 Client ${clientId} subscribed to user ${data.userId}`);
                }
            } catch (error) {
                console.error(`❌ Error parsing message from client ${clientId}:`, error);
            }
        });
        
        // Handle client disconnect
        ws.on('close', (code, reason) => {
            connectedClients.delete(clientId);
            console.log(`❌ WebSocket client disconnected - ID: ${clientId}, Code: ${code}, Reason: ${reason}, Total clients: ${connectedClients.size}`);
        });
        
        // Handle errors
        ws.on('error', (error) => {
            console.error(`❌ WebSocket error for client ${clientId}:`, error);
            connectedClients.delete(clientId);
        });
    });
    
    // Start ping interval to keep connections alive
    startPingInterval();
    
    console.log('🔌 WebSocket server initialized and ready for connections');
}

/**
 * Broadcast BPM data to connected clients
 */
function broadcastBpmData(bpmData) {
    if (!wss || connectedClients.size === 0) {
        console.log(`📡 No WebSocket clients connected - skipping broadcast`);
        return;
    }
    
    // Map device type from device.type to deviceType
    let deviceType = 'unknown';
    if (bpmData.type === 'smartwatch') {
        deviceType = 'smartwatch';
    } else if (bpmData.type === 'doppler') {
        deviceType = 'doppler';
    }
    
    // Create consistent payload format
    const payload = JSON.stringify({
        type: 'bpm_reading', // Keep as bpm_reading for frontend compatibility
        bpm: bpmData.bpm,
        deviceType: deviceType, // 'smartwatch' or 'doppler'
        timestamp: bpmData.timestamp || new Date().toISOString(),
        patientId: bpmData.patientId, // Patient ID for filtering
        assignedUserId: bpmData.patientId, // For backward compatibility
        deviceId: bpmData.deviceId, // Device that sent the reading
        broadcastTime: new Date().toISOString()
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    connectedClients.forEach((clientInfo, clientId) => {
        if (clientInfo.ws.readyState === WebSocket.OPEN) {
            try {
                // Broadcast to all clients (frontend will filter by patient ID)
                clientInfo.ws.send(payload);
                successCount++;
            } catch (error) {
                console.error(`❌ Error sending to client ${clientId}:`, error);
                connectedClients.delete(clientId);
                errorCount++;
            }
        } else {
            connectedClients.delete(clientId);
            errorCount++;
        }
    });
    
    console.log(`📤 Broadcasted live BPM data (${deviceType}) for patient ${bpmData.patientId || 'unassigned'} to ${successCount} clients`);
}

/**
 * Broadcast heart rate data specifically
 */
function broadcastHeartRate(heartRateData) {
    broadcastBpmData({
        ...heartRateData,
        deviceType: 'smartwatch'
    });
}

/**
 * Broadcast fetal heart rate data specifically
 */
function broadcastFetalHeartRate(fetalHeartRateData) {
    broadcastBpmData({
        ...fetalHeartRateData,
        deviceType: 'doppler'
    });
}

/**
 * Start ping interval to keep connections alive
 */
function startPingInterval() {
    if (pingInterval) {
        clearInterval(pingInterval);
    }
    
    pingInterval = setInterval(() => {
        const deadClients = [];
        
        connectedClients.forEach((clientInfo, clientId) => {
            if (clientInfo.isAlive === false) {
                // Client didn't respond to previous ping
                clientInfo.ws.terminate();
                deadClients.push(clientId);
                return;
            }
            
            // Mark as potentially dead and send ping
            clientInfo.isAlive = false;
            
            if (clientInfo.ws.readyState === WebSocket.OPEN) {
                try {
                    clientInfo.ws.ping();
                } catch (error) {
                    console.error(`❌ Error pinging client ${clientId}:`, error);
                    deadClients.push(clientId);
                }
            } else {
                deadClients.push(clientId);
            }
        });
        
        // Remove dead clients
        deadClients.forEach(clientId => {
            connectedClients.delete(clientId);
        });
        
        if (deadClients.length > 0) {
            console.log(`🧹 Cleaned up ${deadClients.length} dead WebSocket connections`);
        }
        
        console.log(`💓 Ping sent to ${connectedClients.size} active WebSocket clients`);
    }, 30000); // 30 seconds
}

/**
 * Generate unique client ID
 */
function generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get connection statistics
 */
function getConnectionStats() {
    return {
        totalConnections: connectedClients.size,
        clients: Array.from(connectedClients.values()).map(client => ({
            id: client.id,
            connectedAt: client.connectedAt,
            ip: client.ip,
            subscribedUserId: client.subscribedUserId || null,
            isAlive: client.isAlive
        }))
    };
}

/**
 * Stop WebSocket server
 */
function stopWebSocketServer() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    
    if (wss) {
        wss.clients.forEach(ws => {
            ws.close(1000, 'Server shutting down');
        });
        wss.close();
        console.log('🛑 WebSocket server stopped');
    }
    
    connectedClients.clear();
}

module.exports = {
    startWebSocketServer,
    broadcastBpmData,
    broadcastHeartRate,      // New function
    broadcastFetalHeartRate, // New function
    getConnectionStats,
    stopWebSocketServer
};