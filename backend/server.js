// 1. Import the tools we installed
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import enrollmentRoutes from './routes/enrollment.js';
import scholarshipRoutes from './routes/scholarship.js';
import newsRoutes        from './routes/news.js';
import staffRoutes       from './routes/staff.js';
import generatorRoutes   from './routes/generator.js';
import authRoutes        from './routes/auth.js';

// 2. Load environment variables
dotenv.config();

// 3. Import database connection
import './config/db.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// 4. Create our Express application
const app = express();
// ── CORS — allow both local and production frontend ──
const allowedOrigins = [
    'http://localhost:5500',        // VS Code Live Server
    'http://127.0.0.1:5500',       // VS Code Live Server alt
    'https://tokimi-foundation-website.netlify.app' // ← Your Netlify URL here
];

// 5. Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ─────────────────────────────────────────
// Serve uploaded images as static files
// This means images can be accessed via URL
// e.g. http://localhost:5000/uploads/news/photo.jpg
// ─────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 6. Test route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Tokimi Foundation API!',
        status: 'Server is running successfully ✅'
    });
});

// Register routes
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/scholarship',  scholarshipRoutes);
app.use('/api/news',         newsRoutes);
app.use('/api/staff',        staffRoutes);
app.use('/api/generate',    generatorRoutes);
app.use('/api/auth',        authRoutes);
// 7. Define port
const PORT = process.env.PORT || 5000;

// 8. Start server
app.listen(PORT, () => {
    console.log(`✅ Tokimi Foundation server is running on port ${PORT}`);
});