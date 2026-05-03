import express from 'express';
import {
    addStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    exportStudents,
    importStudents,
    upload
} from '../controllers/enrollmentController.js';

const router = express.Router();

// ─────────────────────────────────────────
// Define all enrollment routes
// ─────────────────────────────────────────

router.post('/',            addStudent);          // Add student
router.get('/',             getStudents);         // Get all / filter by batch
router.get('/export',       exportStudents);      // Export to CSV
router.post('/import', upload.single('file'), importStudents); // Import from CSV
router.get('/:id',          getStudentById);      // Get one student
router.put('/:id',          updateStudent);       // Update student
router.delete('/:id',       deleteStudent);       // Delete student

export default router;