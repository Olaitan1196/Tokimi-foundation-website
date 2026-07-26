import pool from '../config/db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// MULTER SETUP — for image uploads (unchanged, no DB involvement)
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/news');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `news_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

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
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ─────────────────────────────────────────────
// 1. CREATE A NEWS ARTICLE
// ─────────────────────────────────────────────
export const createNews = async (req, res) => {
    try {
        const { title, content, author } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                message: '❌ Title and content are required.'
            });
        }

        const image_url = req.file
            ? `/uploads/news/${req.file.filename}`
            : null;

        const result = await pool.query(
            `INSERT INTO news
            (title, content, image_url, author)
            VALUES ($1, $2, $3, $4)
            RETURNING id`,
            [title, content, image_url, author]
        );

        res.status(201).json({
            message: '✅ News article created successfully!',
            newsId: result.rows[0].id,
            image_url
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL NEWS ARTICLES (paginated)
// ─────────────────────────────────────────────
export const getAllNews = async (req, res) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count — note: Postgres returns COUNT(*) as a string, so we parseInt it
        const totalResult = await pool.query('SELECT COUNT(*) as total FROM news');
        const total = parseInt(totalResult.rows[0].total);

        // Get the paginated articles
        const result = await pool.query(
            'SELECT * FROM news ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        res.status(200).json({
            message: '✅ News articles retrieved successfully!',
            total,
            page,
            totalPages: Math.ceil(total / limit),
            news: result.rows
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

        const result = await pool.query(
            'SELECT * FROM news WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '❌ News article not found.' });
        }

        res.status(200).json({
            message: '✅ News article found!',
            news: result.rows[0]
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

        const existing = await pool.query(
            'SELECT * FROM news WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: '❌ News article not found.' });
        }

        const image_url = req.file
            ? `/uploads/news/${req.file.filename}`
            : existing.rows[0].image_url;

        if (req.file && existing.rows[0].image_url) {
            const oldImagePath = path.join(__dirname, '..', existing.rows[0].image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        await pool.query(
            `UPDATE news SET
                title     = $1,
                content   = $2,
                author    = $3,
                image_url = $4
            WHERE id = $5`,
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

        const existing = await pool.query(
            'SELECT * FROM news WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: '❌ News article not found.' });
        }

        if (existing.rows[0].image_url) {
            const imagePath = path.join(__dirname, '..', existing.rows[0].image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await pool.query('DELETE FROM news WHERE id = $1', [id]);

        res.status(200).json({ message: '✅ News article deleted successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};