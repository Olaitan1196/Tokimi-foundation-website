import express from 'express';
import {
    addEntry,
    getAllEntries,
    deleteEntry,
    reactivateEntry
} from '../controllers/lookupController.js';

const router = express.Router();

// ─────────────────────────────────────────
// Lookup routes — :type is one of:
// computer-training-schools, computer-training-classes,
// scholarship-schools, scholarship-classes, grant-schools
// ─────────────────────────────────────────
router.post('/:type',                addEntry);
router.get('/:type',                 getAllEntries);
router.delete('/:type/:id',          deleteEntry);
router.put('/:type/:id/reactivate',  reactivateEntry);

export default router;