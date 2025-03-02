const dotenv = require("dotenv");
// Load environment variables in development only
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./lib/db");
const authRoutes = require("./routes/authRoutes");
const emailRoutes = require('./routes/emailRoutes');
const aiRoutes = require('./routes/aiRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Adjust payload limit to match Vercel's limits
app.use(express.json({ limit: '4.5mb' }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://smith-frontend.vercel.app'
        : ['http://localhost:5173', 'https://smith-frontend.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
    exposedHeaders: ['set-cookie'],
    maxAge: 3600
}));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
    res.send('API is running');
});

// Routes
app.use("/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/email", emailRoutes);

// Connect to database
connectDB().catch(console.error);

// Development server
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
        console.log(`✨ Development server running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;

