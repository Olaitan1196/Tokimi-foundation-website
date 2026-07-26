import express from 'express';
import {
    addScholarship,
    getScholarships,
    getScholarshipById,
    updateScholarship,
    deleteScholarship,
    exportScholarships
} from '../controllers/scholarshipController.js';

const router = express.Router();

// ─────────────────────────────────────────
// Scholarship routes
// ─────────────────────────────────────────
router.post('/',       addScholarship);      // Add scholarship
router.get('/',        getScholarships);     // Get all
router.get('/export',  exportScholarships);  // Export to CSV
router.get('/:id',     getScholarshipById);  // Get one
router.put('/:id',     updateScholarship);   // Update
router.delete('/:id',  deleteScholarship);   // Delete

export default router;