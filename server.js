const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('./config/db'); // Import DB config
const Message = require('./models/Message'); // Import Message model
const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Serve static files (if needed)
app.use(express.static('public'));

// Socket.io connection
io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('set username', async (username) => {
        socket.username = username;

        io.emit('chat message', {
            type: 'notification',
            text: `${username} has joined the chat!`
        });

        const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
        socket.emit('chat history', messages);
    });

    socket.on('chat message', async (msg) => {
        if (!socket.username) return;

        const message = new Message({ username: socket.username, text: msg });
        await message.save();

        io.emit('chat message', {
            type: 'message',
            username: socket.username,
            text: msg,
            timestamp: message.timestamp,
        });
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('chat message', {
                type: 'notification',
                text: `${socket.username} has left the chat.`
            });
        }
        console.log('A user disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
