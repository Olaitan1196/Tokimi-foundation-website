import express from 'express';
import {
    generateStudentIdCard,
    generateStaffIdCard,
    generateCertificate
} from '../controllers/generatorController.js';

const router = express.Router();

// ─────────────────────────────────────────
// Generator routes
// ─────────────────────────────────────────
router.get('/idcard/student/:id',  generateStudentIdCard); // Student ID card
router.get('/idcard/staff/:id',    generateStaffIdCard);   // Staff ID card
router.get('/certificate/:id',     generateCertificate);   // Student certificate

export default router;