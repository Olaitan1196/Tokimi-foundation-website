import express from 'express';
import {
    markBatchAttendance,
    markSingleAttendance,
    getAttendanceByBatchAndDate,
    exportBatchAttendance,
    exportStudentAttendanceHistory,
    importAttendance,
    upload
} from '../controllers/attendanceController.js';

const router = express.Router();

router.post('/mark-batch',                  markBatchAttendance);
router.post('/mark-single',                 markSingleAttendance);
router.get('/',                             getAttendanceByBatchAndDate); // ?batch=&date=
router.get('/export',                       exportBatchAttendance);      // ?batch=&start_date=&end_date=
router.get('/export/student/:student_id',   exportStudentAttendanceHistory);
router.post('/import', upload.single('file'), importAttendance);

export default router;