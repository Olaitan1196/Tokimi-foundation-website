import express from 'express';
import {
    addGrant,
    getGrants,
    getGrantById,
    updateGrant,
    deleteGrant,
    exportGrants
} from '../controllers/grantController.js';

const router = express.Router();

// ─────────────────────────────────────────
// Grant routes
// ─────────────────────────────────────────
router.post('/',       addGrant);      // Add grant
router.get('/',        getGrants);     // Get all
router.get('/export',  exportGrants);  // Export to CSV
router.get('/:id',     getGrantById);  // Get one
router.put('/:id',     updateGrant);   // Update
router.delete('/:id',  deleteGrant);   // Delete

export default router;