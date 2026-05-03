import express from 'express';
import {
    createNews,
    getAllNews,
    getNewsById,
    updateNews,
    deleteNews,
    upload
} from '../controllers/newsController.js';

const router = express.Router();

// ─────────────────────────────────────────
// News routes
// ─────────────────────────────────────────
router.post('/',    upload.single('image'), createNews);   // Create article
router.get('/',                            getAllNews);     // Get all articles
router.get('/:id',                         getNewsById);   // Get one article
router.put('/:id',  upload.single('image'), updateNews);   // Update article
router.delete('/:id',                      deleteNews);    // Delete article

export default router;