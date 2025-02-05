const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chatApp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
});

// Define message schema
const messageSchema = new mongoose.Schema({
    username: String,
    text: String,
    timestamp: { type: Date, default: Date.now },
});

// Create message model
const Message = mongoose.model('Message', messageSchema);

app.use(cors());
app.use(express.json()); // Ensure JSON data is processed correctly

// Handle socket connections
io.on('connection', (socket) => {
    console.log('🔗 A user connected:', socket.id);

    // Handle username submission
    socket.on('set username', async (username) => {
        socket.username = username;

        // Check if the username exists in the database
        const existingMessages = await Message.find({ username }).sort({ timestamp: 1 });

        if (existingMessages.length > 0) {
            // Send chat history only to returning users
            socket.emit('chat history', existingMessages);
        } else {
            // Notify all users about the new user
            io.emit('chat message', {
                type: 'notification',
                text: `🟢 ${username} has joined the chat!`
            });
        }
    });

    // Handle chat messages
    socket.on('chat message', async (msg) => {
        if (!socket.username) return;

        try {
            // Save the message to MongoDB
            const message = new Message({ username: socket.username, text: msg });
            await message.save();

            // Broadcast the message to all users
            io.emit('chat message', {
                type: 'message',
                username: socket.username,
                text: msg,
                timestamp: message.timestamp
            });
        } catch (error) {
            console.error('❌ Error saving message:', error);
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('chat message', {
                type: 'notification',
                text: `🔴 ${socket.username} has left the chat.`
            });
        }
        console.log('❌ A user disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
