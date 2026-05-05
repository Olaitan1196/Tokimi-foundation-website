import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ─────────────────────────────────────────
// ADMIN LOGIN
// Checks password against .env secret
// Returns a simple session token
// ─────────────────────────────────────────
router.post('/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({
            message: '❌ Password is required.'
        });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
            message: '❌ Incorrect password. Please try again.'
        });
    }

    // Generate a simple token
    // (In production, use JWT — we will upgrade this later)
    const token = Buffer.from(
        `tokimi-admin:${Date.now()}`
    ).toString('base64');

    res.status(200).json({
        message: '✅ Login successful!',
        token,
        admin: 'Tokimi Admin'
    });
});

// ─────────────────────────────────────────
// VERIFY TOKEN
// Checks if a token is still valid
// ─────────────────────────────────────────
router.post('/verify', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ valid: false });
    }

    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        if (decoded.startsWith('tokimi-admin:')) {
            return res.status(200).json({ valid: true });
        }
        return res.status(401).json({ valid: false });
    } catch {
        return res.status(401).json({ valid: false });
    }
});

export default router;