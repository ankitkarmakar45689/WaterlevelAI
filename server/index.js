require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const Reading = require('./models/Reading');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- Database & Storage Abstraction ---
let useInMemory = false;
let memoryReadings = [];

// Try to connect to Mongo with short timeout so we fail fast to memory
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/water-monitor', {
    serverSelectionTimeoutMS: 2000 // 2 second timeout
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.log('MongoDB Connection Failed (Expected if no DB):', err.message);
        useInMemory = true;
    });

// Helper to save reading
async function saveReading(level, percentage) {
    const readingData = { level, percentage, timestamp: new Date() };

    // Use memory if explicitly set OR if DB is not fully connected (1)
    if (useInMemory || mongoose.connection.readyState !== 1) {
        if (!useInMemory && mongoose.connection.readyState !== 1) {
            console.log("DB connection pending/failed. Using memory.");
            useInMemory = true;
        }

        memoryReadings.push(readingData);
        if (memoryReadings.length > 500) memoryReadings.shift();
        return readingData;
    }

    // Try DB
    try {
        const reading = new Reading({ level, percentage });
        return await reading.save();
    } catch (e) {
        console.log("DB Write Error. Switching to memory.", e.message);
        useInMemory = true;
        memoryReadings.push(readingData);
        return readingData;
    }
}

// Helper to get history
async function getHistory() {
    if (useInMemory || mongoose.connection.readyState !== 1) {
        return memoryReadings.slice(-50).reverse();
    }

    try {
        const history = await Reading.find().sort({ timestamp: -1 }).limit(50);
        return history.reverse();
    } catch (e) {
        useInMemory = true;
        return memoryReadings.slice(-50).reverse();
    }
}

// Global Motor State
let motorOn = false;

// Simulation State
let lastReadingTime = 0; // 0 means never
let simLevel = 0;

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('motor_update', motorOn);
    getHistory().then(history => socket.emit('history_data', history));
});

// --- API Routes ---
app.post('/api/reading', async (req, res) => {
    const { level, percentage } = req.body;
    const reading = await saveReading(level, percentage);

    lastReadingTime = Date.now(); // Real data received

    if (percentage >= 100 && motorOn) {
        motorOn = false;
        io.emit('motor_update', motorOn);
    }

    io.emit('new_reading', reading);
    res.json({ success: true, motorOn });
});

app.get('/api/history', async (req, res) => {
    const history = await getHistory();
    res.json(history);
});

app.post('/api/motor', (req, res) => {
    const { state } = req.body;
    motorOn = state;
    io.emit('motor_update', motorOn);
    console.log('Motor toggled:', motorOn);
    res.json({ success: true, motorOn });
});

// --- RESET ENDPOINT ---
app.post('/api/reset', (req, res) => {
    simLevel = 0;
    motorOn = false;
    memoryReadings = []; // Clear history
    io.emit('motor_update', motorOn);

    // Broadcast reset state
    const resetReading = { level: 100, percentage: 0, timestamp: new Date() };
    io.emit('new_reading', resetReading);
    io.emit('history_data', []); // Clear graphs

    console.log('System RESET by User');
    res.json({ success: true });
});

// --- SIMULATION LOOP ---
// Runs every 500ms
setInterval(() => {
    // If no REAL data for 3 seconds, we simulate
    if (Date.now() - lastReadingTime > 3000) {

        if (motorOn) {
            simLevel += 2.0; // Fill
        }

        // Bounds
        if (simLevel > 100) simLevel = 100;
        if (simLevel < 0) simLevel = 0;

        // Auto-Cutoff
        if (simLevel >= 100 && motorOn) {
            motorOn = false;
            io.emit('motor_update', motorOn);
            console.log('Simulation: Tank Full, Motor Off');
        }

        const readingData = {
            level: (100 - simLevel),
            percentage: parseFloat(simLevel.toFixed(1)),
            timestamp: new Date()
        };

        if (useInMemory || mongoose.connection.readyState !== 1) {
            memoryReadings.push(readingData);
            if (memoryReadings.length > 50) memoryReadings.shift();
        }

        io.emit('new_reading', readingData);
    }
}, 500);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server v3 with RESET running on port ${PORT}`);
});
