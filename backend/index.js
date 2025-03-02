const dotenv = require("dotenv");
// Load environment variables before any other imports
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

// Updated CORS configuration for Vercel deployment
app.use(cors({
    origin: ['https://smith-frontend.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept'],
    exposedHeaders: ['set-cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Enable trust proxy for Vercel
app.set('trust proxy', 1);

// Cookie configuration middleware
app.use((req, res, next) => {
    res.cookie('jwt', req.cookies?.jwt, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: 'vercel.app',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use("/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/email", emailRoutes);

const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`✨ Server deployed successfully!`);
           
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

