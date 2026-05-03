import pool from '../config/db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// MULTER SETUP — for image uploads
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Save images to backend/uploads/news/
        const uploadPath = path.join(__dirname, '../uploads/news');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Give each file a unique name using timestamp
        const uniqueName = `news_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Only allow image files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('❌ Only JPEG, PNG and WEBP images are allowed'), false);
    }
};

export const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

// ─────────────────────────────────────────────
// 1. CREATE A NEWS ARTICLE
// ─────────────────────────────────────────────
export const createNews = async (req, res) => {
    try {
        const { title, content, author } = req.body;

        // Validate required fields
        if (!title || !content) {
            return res.status(400).json({
                message: '❌ Title and content are required.'
            });
        }

        // If an image was uploaded, save its path
        const image_url = req.file 
            ? `/uploads/news/${req.file.filename}` 
            : null;

        const [result] = await pool.query(
            `INSERT INTO news 
            (title, content, image_url, author)
            VALUES (?, ?, ?, ?)`,
            [title, content, image_url, author]
        );

        res.status(201).json({
            message: '✅ News article created successfully!',
            newsId: result.insertId,
            image_url
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL NEWS ARTICLES
// ─────────────────────────────────────────────
export const getAllNews = async (req, res) => {
    try {
        // Support pagination — ?page=1&limit=10
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count first
        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM news'
        );

        // Get the actual articles with pagination
        const [news] = await pool.query(
            'SELECT * FROM news ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        res.status(200).json({
            message: '✅ News articles retrieved successfully!',
            total,
            page,
            totalPages: Math.ceil(total / limit),
            news
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. GET A SINGLE NEWS ARTICLE
// ─────────────────────────────────────────────
export const getNewsById = async (req, res) => {
    try {
        const { id } = req.params;

        const [news] = await pool.query(
            'SELECT * FROM news WHERE id = ?',
            [id]
        );

        if (news.length === 0) {
            return res.status(404).json({ message: '❌ News article not found.' });
        }

        res.status(200).json({
            message: '✅ News article found!',
            news: news[0]
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE A NEWS ARTICLE
// ─────────────────────────────────────────────
export const updateNews = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, author } = req.body;

        // Check if article exists
        const [existing] = await pool.query(
            'SELECT * FROM news WHERE id = ?', 
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: '❌ News article not found.' });
        }

        // If a new image was uploaded, use it. Otherwise keep the old one
        const image_url = req.file
            ? `/uploads/news/${req.file.filename}`
            : existing[0].image_url;

        // If new image uploaded, delete the old image file from disk
        if (req.file && existing[0].image_url) {
            const oldImagePath = path.join(__dirname, '..', existing[0].image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        await pool.query(
            `UPDATE news SET
                title     = ?,
                content   = ?,
                author    = ?,
                image_url = ?
            WHERE id = ?`,
            [title, content, author, image_url, id]
        );

        res.status(200).json({ message: '✅ News article updated successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE A NEWS ARTICLE
// ─────────────────────────────────────────────
export const deleteNews = async (req, res) => {
    try {
        const { id } = req.params;

        // Get the article first so we can delete its image
        const [existing] = await pool.query(
            'SELECT * FROM news WHERE id = ?', 
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: '❌ News article not found.' });
        }

        // Delete the image file from disk if it exists
        if (existing[0].image_url) {
            const imagePath = path.join(__dirname, '..', existing[0].image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await pool.query('DELETE FROM news WHERE id = ?', [id]);

        res.status(200).json({ message: '✅ News article deleted successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};