const dotenv = require("dotenv");
// Load environment variables
dotenv.config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./lib/db");
const authRoutes = require("./routes/authRoutes");
const emailRoutes = require('./routes/emailRoutes');
const aiRoutes = require('./routes/aiRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Increase payload limit for voice data
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// CORS Configuration
app.use(cors({
    origin: ['https://smith-frontend.vercel.app', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
    exposedHeaders: ['set-cookie'],
}));

// Middleware to handle CORS issues
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/email", emailRoutes);

// Connect to DB before handling requests
connectDB();

module.exports = app;  
