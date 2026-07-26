import pool from '../config/db.js';
import { createObjectCsvWriter } from 'csv-writer';
import csvParser from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// 1. MARK ATTENDANCE FOR A WHOLE BATCH (primary method)
// Body: { batch, date, marked_by, records: [{ student_id, status }, ...] }
// ─────────────────────────────────────────────
export const markBatchAttendance = async (req, res) => {
    try {
        const { batch, date, marked_by, records } = req.body;

        if (!batch || !date || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                message: '❌ Batch, date and a list of student records are required.'
            });
        }

        let successCount = 0;

        for (const record of records) {
            await pool.query(
                `INSERT INTO computer_training_attendance (student_id, date, status, marked_by)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (student_id, date)
                 DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
                [record.student_id, date, record.status, marked_by || null]
            );
            successCount++;
        }

        res.status(200).json({
            message: `✅ Attendance marked for ${successCount} student(s) on ${date}.`
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. MARK ATTENDANCE FOR A SINGLE STUDENT
// Body: { student_id, date, status, marked_by }
// ─────────────────────────────────────────────
export const markSingleAttendance = async (req, res) => {
    try {
        const { student_id, date, status, marked_by } = req.body;

        if (!student_id || !date || !status) {
            return res.status(400).json({ message: '❌ Student, date and status are required.' });
        }

        await pool.query(
            `INSERT INTO computer_training_attendance (student_id, date, status, marked_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (student_id, date)
             DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
            [student_id, date, status, marked_by || null]
        );

        res.status(200).json({ message: '✅ Attendance recorded successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. GET ATTENDANCE FOR A BATCH ON A SPECIFIC DATE
// (Useful for pre-filling a "mark attendance" screen)
// ─────────────────────────────────────────────
export const getAttendanceByBatchAndDate = async (req, res) => {
    try {
        const { batch, date } = req.query;

        if (!batch || !date) {
            return res.status(400).json({ message: '❌ Batch and date are required.' });
        }

        const result = await pool.query(
            `SELECT
                cts.id AS student_id,
                cts.first_name, cts.last_name,
                a.status
            FROM computer_training_students cts
            LEFT JOIN computer_training_attendance a
                ON a.student_id = cts.id AND a.date = $2
            WHERE cts.batch = $1
            ORDER BY cts.last_name ASC`,
            [batch, date]
        );

        res.status(200).json({
            message: '✅ Attendance retrieved successfully!',
            total: result.rows.length,
            attendance: result.rows
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// HELPER — map DB status to the sheet's short codes
// ─────────────────────────────────────────────
const STATUS_TO_CODE = { present: 'PRST', absent: 'ABS', excused: 'EXCS', late: 'LATE' };
const CODE_TO_STATUS = { PRST: 'present', ABS: 'absent', EXCS: 'excused', LATE: 'late' };

// ─────────────────────────────────────────────
// 4. EXPORT — BATCH + DATE RANGE (wide grid, matches your sheet)
// Query: ?batch=Batch20&start_date=2026-07-20&end_date=2026-07-24
// ─────────────────────────────────────────────
export const exportBatchAttendance = async (req, res) => {
    try {
        const { batch, start_date, end_date } = req.query;

        if (!batch || !start_date || !end_date) {
            return res.status(400).json({ message: '❌ Batch, start_date and end_date are required.' });
        }

        // All students in the batch
        const studentsResult = await pool.query(
            `SELECT id, first_name, last_name FROM computer_training_students
             WHERE batch = $1 ORDER BY last_name ASC`,
            [batch]
        );
        const students = studentsResult.rows;

        // All attendance rows in the date range for this batch
        const attResult = await pool.query(
            `SELECT a.student_id, a.date, a.status
             FROM computer_training_attendance a
             JOIN computer_training_students cts ON cts.id = a.student_id
             WHERE cts.batch = $1 AND a.date BETWEEN $2 AND $3`,
            [batch, start_date, end_date]
        );

        // Build the list of distinct dates present in range, sorted
        const dateSet = new Set(attResult.rows.map(r => r.date.toISOString().split('T')[0]));
        const dates = Array.from(dateSet).sort();

        // Build a lookup: studentId -> date -> status code
        const grid = {};
        attResult.rows.forEach(r => {
            const dateStr = r.date.toISOString().split('T')[0];
            grid[r.student_id] = grid[r.student_id] || {};
            grid[r.student_id][dateStr] = STATUS_TO_CODE[r.status] || '';
        });

        // Build CSV rows: S/N, Names, StudentID (hidden helper column), then one column per date
        const header = [
            { id: 'sn', title: 'S/N' },
            { id: 'name', title: 'NAMES' },
            { id: 'student_id', title: 'StudentID' },
            ...dates.map(d => ({ id: d, title: d }))
        ];

        const rows = students.map((s, index) => {
            const row = {
                sn: index + 1,
                name: `${s.first_name} ${s.last_name}`,
                student_id: s.id
            };
            dates.forEach(d => {
                row[d] = (grid[s.id] && grid[s.id][d]) || '';
            });
            return row;
        });

        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir);

        const filePath = path.join(exportsDir, `attendance_${batch}.csv`);
        const csvWriter = createObjectCsvWriter({ path: filePath, header });
        await csvWriter.writeRecords(rows);

        res.download(filePath, `tokimi_attendance_${batch}.csv`);

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 5. EXPORT — SINGLE STUDENT FULL HISTORY
// ─────────────────────────────────────────────
export const exportStudentAttendanceHistory = async (req, res) => {
    try {
        const { student_id } = req.params;

        const studentResult = await pool.query(
            'SELECT first_name, last_name FROM computer_training_students WHERE id = $1',
            [student_id]
        );
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: '❌ Student not found.' });
        }
        const student = studentResult.rows[0];

        const result = await pool.query(
            `SELECT date, status FROM computer_training_attendance
             WHERE student_id = $1 ORDER BY date ASC`,
            [student_id]
        );

        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir);

        const filePath = path.join(exportsDir, `attendance_history_${student_id}.csv`);
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'date', title: 'Date' },
                { id: 'status', title: 'Status' },
            ]
        });

        await csvWriter.writeRecords(
            result.rows.map(r => ({
                date: r.date.toISOString().split('T')[0],
                status: STATUS_TO_CODE[r.status] || r.status
            }))
        );

        res.download(filePath, `attendance_history_${student.first_name}_${student.last_name}.csv`);

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 6. IMPORT — WIDE GRID CSV (bulk, from Excel)
// Form fields: batch (text), file (the CSV)
// Expects columns: S/N, NAMES, StudentID (optional), then date columns with PRST/ABS/etc.
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => cb(null, `attendance_import_${Date.now()}_${file.originalname}`)
});
export const upload = multer({ storage });

export const importAttendance = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '❌ Please upload a CSV file.' });
        }
        const { batch } = req.body;
        if (!batch) {
            return res.status(400).json({ message: '❌ Batch is required.' });
        }

        const rows = [];
        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => rows.push(data))
            .on('end', async () => {
                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                // Non-date, non-metadata columns we skip when looking for date columns
                const metaColumns = ['S/N', 'NAMES', 'StudentID'];

                for (const row of rows) {
                    try {
                        let studentId = row['StudentID'];

                        // Fallback: match by full name within this batch if no ID given
                        if (!studentId) {
                            const nameMatch = await pool.query(
                                `SELECT id FROM computer_training_students
                                 WHERE batch = $1 AND CONCAT(first_name, ' ', last_name) = $2`,
                                [batch, (row['NAMES'] || '').trim()]
                            );
                            if (nameMatch.rows.length !== 1) {
                                errorCount++;
                                errors.push(`Could not uniquely match "${row['NAMES']}" in batch ${batch}`);
                                continue;
                            }
                            studentId = nameMatch.rows[0].id;
                        }

                        // Every remaining column is treated as a date column
                        const dateColumns = Object.keys(row).filter(k => !metaColumns.includes(k));

                        for (const dateCol of dateColumns) {
                            const code = (row[dateCol] || '').trim().toUpperCase();
                            if (!code) continue; // blank cell = no record for that day
                            const status = CODE_TO_STATUS[code];
                            if (!status) continue; // unrecognized code, skip silently

                            await pool.query(
                                `INSERT INTO computer_training_attendance (student_id, date, status)
                                 VALUES ($1, $2, $3)
                                 ON CONFLICT (student_id, date)
                                 DO UPDATE SET status = EXCLUDED.status`,
                                [studentId, dateCol, status]
                            );
                        }
                        successCount++;

                    } catch (err) {
                        errorCount++;
                        errors.push(err.message);
                    }
                }

                fs.unlinkSync(req.file.path);

                res.status(200).json({
                    message: `✅ Import complete! ${successCount} student rows processed, ${errorCount} failed.`,
                    errors
                });
            });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};