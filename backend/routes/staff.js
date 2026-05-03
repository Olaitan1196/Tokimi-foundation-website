import express from 'express';
import {
    addStaff,
    getAllStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    exportStaff,
    upload
} from '../controllers/staffController.js';

const router = express.Router();

// ─────────────────────────────────────────
// Staff routes
// ─────────────────────────────────────────
router.post('/',     upload.single('photo'), addStaff);      // Add staff
router.get('/',                              getAllStaff);    // Get all staff
router.get('/export',                        exportStaff);   // Export to CSV
router.get('/:id',                           getStaffById);  // Get one staff
router.put('/:id',   upload.single('photo'), updateStaff);   // Update staff
router.delete('/:id',                        deleteStaff);   // Delete staff

export default router;