// backend/controllers/enrollmentController.js
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
// HELPER — Duplicate & history check
// ─────────────────────────────────────────────
const checkDuplicates = async (first_name, last_name, phone, school_id, class_id) => {
    const flags = [];

    // Name + Phone match
    const namePhone = await pool.query(
        `SELECT id, first_name, last_name, batch, year, status FROM computer_training_students
         WHERE first_name = $1 AND last_name = $2 AND phone = $3`,
        [first_name, last_name, phone]
    );
    if (namePhone.rows.length > 0) {
        flags.push({ type: 'name_phone_match', matches: namePhone.rows });
    }

    // Name + School + Class match
    const nameSchoolClass = await pool.query(
        `SELECT id, first_name, last_name, batch, year, status FROM computer_training_students
         WHERE first_name = $1 AND last_name = $2 AND school_id = $3 AND class_id = $4`,
        [first_name, last_name, school_id, class_id]
    );
    if (nameSchoolClass.rows.length > 0) {
        flags.push({ type: 'name_school_class_match', matches: nameSchoolClass.rows });
    }

    // Expelled / withdrawn history check (by name only)
    const history = await pool.query(
        `SELECT id, batch, year, status, status_reason FROM computer_training_students
         WHERE first_name = $1 AND last_name = $2 AND status IN ('expelled', 'withdrawn')`,
        [first_name, last_name]
    );
    if (history.rows.length > 0) {
        flags.push({ type: 'past_expelled_or_withdrawn', matches: history.rows });
    }

    return flags;
};

// ─────────────────────────────────────────────
// 1. ADD A NEW STUDENT
// ─────────────────────────────────────────────
export const addStudent = async (req, res) => {
    try {
        const {
            first_name, middle_name, last_name, gender,
            school_id, class_id, address, phone,
            batch, year, month,
            override_duplicate // boolean, sent when admin/staff confirms "add anyway"
        } = req.body;

        if (!first_name || !last_name || !gender || !school_id || !class_id || !batch || !year || !month) {
            return res.status(400).json({
                message: '❌ First name, last name, gender, school, class, batch, year and month are required.'
            });
        }

        const flags = await checkDuplicates(first_name, last_name, phone, school_id, class_id);

        if (flags.length > 0 && !override_duplicate) {
            return res.status(409).json({
                message: '⚠️ Possible duplicate or past-status match found. Review and confirm to proceed.',
                flags
            });
        }

        const result = await pool.query(
            `INSERT INTO computer_training_students
            (first_name, middle_name, last_name, gender, school_id, class_id, address, phone, batch, year, month, is_duplicate_flagged, duplicate_override_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id`,
            [
                first_name, middle_name || null, last_name, gender,
                school_id, class_id, address, phone,
                batch, year, month,
                flags.length > 0,
                flags.length > 0 ? (req.body.admin_id || null) : null
            ]
        );

        res.status(201).json({
            message: '✅ Student enrolled successfully!',
            studentId: result.rows[0].id,
            wasFlagged: flags.length > 0
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL STUDENTS (filters: batch, year, month, status)
// ─────────────────────────────────────────────
export const getStudents = async (req, res) => {
    try {
        const { batch, year, month, status } = req.query;

        let query = `
            SELECT
                cts.*,
                sc.name AS school_name,
                cl.name AS class_name
            FROM computer_training_students cts
            LEFT JOIN computer_training_schools sc ON cts.school_id = sc.id
            LEFT JOIN computer_training_classes cl ON cts.class_id = cl.id
        `;

        const conditions = [];
        const params = [];
        let i = 1;

        if (batch)  { conditions.push(`cts.batch = $${i++}`);  params.push(batch); }
        if (year)   { conditions.push(`cts.year = $${i++}`);   params.push(year); }
        if (month)  { conditions.push(`cts.month = $${i++}`);  params.push(month); }
        if (status) { conditions.push(`cts.status = $${i++}`); params.push(status); }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY cts.year DESC, cts.batch ASC, cts.last_name ASC';

        const result = await pool.query(query, params);

        res.status(200).json({
            message: '✅ Students retrieved successfully!',
            total: result.rows.length,
            students: result.rows
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. GET A SINGLE STUDENT BY ID
// ─────────────────────────────────────────────
export const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                cts.*,
                sc.name AS school_name,
                cl.name AS class_name
            FROM computer_training_students cts
            LEFT JOIN computer_training_schools sc ON cts.school_id = sc.id
            LEFT JOIN computer_training_classes cl ON cts.class_id = cl.id
            WHERE cts.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: '❌ Student not found.' });
        }

        res.status(200).json({
            message: '✅ Student found!',
            student: result.rows[0]
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE A STUDENT
// ─────────────────────────────────────────────
export const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name, middle_name, last_name, gender,
            school_id, class_id, address, phone,
            batch, year, month, status, status_reason
        } = req.body;

        const result = await pool.query(
            `UPDATE computer_training_students SET
                first_name = $1, middle_name = $2, last_name = $3, gender = $4,
                school_id = $5, class_id = $6, address = $7, phone = $8,
                batch = $9, year = $10, month = $11, status = $12, status_reason = $13
            WHERE id = $14`,
            [
                first_name, middle_name || null, last_name, gender,
                school_id, class_id, address, phone,
                batch, year, month, status, status_reason || null,
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: '❌ Student not found.' });
        }

        res.status(200).json({ message: '✅ Student updated successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE A STUDENT
// ─────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM computer_training_students WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: '❌ Student not found.' });
        }

        res.status(200).json({ message: '✅ Student deleted successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 6. EXPORT STUDENTS TO CSV
// ─────────────────────────────────────────────
export const exportStudents = async (req, res) => {
    try {
        const { batch, year } = req.query;

        let query = `
            SELECT
                cts.id, cts.first_name, cts.middle_name, cts.last_name, cts.gender,
                sc.name AS school, cl.name AS class,
                cts.address, cts.phone, cts.batch, cts.year, cts.month,
                cts.status, cts.enrolled_at
            FROM computer_training_students cts
            LEFT JOIN computer_training_schools sc ON cts.school_id = sc.id
            LEFT JOIN computer_training_classes cl ON cts.class_id = cl.id
        `;

        const conditions = [];
        const params = [];
        let i = 1;

        if (batch) { conditions.push(`cts.batch = $${i++}`); params.push(batch); }
        if (year)  { conditions.push(`cts.year = $${i++}`);  params.push(year); }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const result = await pool.query(query, params);

        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir);
        }

        const filePath = path.join(exportsDir, 'students.csv');

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id',          title: 'S/N' },
                { id: 'first_name',  title: 'First Name' },
                { id: 'middle_name', title: 'Middle Name' },
                { id: 'last_name',   title: 'Last Name' },
                { id: 'gender',      title: 'Sex' },
                { id: 'school',      title: 'School' },
                { id: 'class',       title: 'Class' },
                { id: 'address',     title: 'Address' },
                { id: 'phone',       title: 'Phone Number' },
                { id: 'batch',       title: 'Batch' },
                { id: 'year',        title: 'Year' },
                { id: 'month',       title: 'Month' },
                { id: 'status',      title: 'Status' },
                { id: 'enrolled_at', title: 'Enrolled At' },
            ]
        });

        await csvWriter.writeRecords(result.rows);

        res.download(filePath, `tokimi_students_${batch || 'all'}.csv`);

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 7. IMPORT STUDENTS FROM CSV (bulk registration)
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `import_${Date.now()}_${file.originalname}`);
    }
});

export const upload = multer({ storage });

export const importStudents = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '❌ Please upload a CSV file.' });
        }

        const { batch, year, month } = req.body; // applied to every row in the sheet
        const results = [];

        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let successCount = 0;
                let flaggedCount = 0;
                let errorCount = 0;
                const errors = [];

                for (const row of results) {
                    try {
                        const fullName = (row['NAMES'] || '').trim();
                        const [first_name, ...rest] = fullName.split(' ');
                        const last_name = rest.join(' ') || first_name;

                        const genderRaw = (row['SEX'] || '').trim().toLowerCase();
                        const gender = genderRaw.startsWith('m') ? 'male' : 'female';

                        const schoolName = (row['SCHOOL'] || '').trim();
                        const className  = (row['CLASS'] || '').trim();

                        const schoolResult = await pool.query(
                            'SELECT id FROM computer_training_schools WHERE name = $1 AND is_active = true',
                            [schoolName]
                        );
                        const classResult = await pool.query(
                            'SELECT id FROM computer_training_classes WHERE name = $1 AND is_active = true',
                            [className]
                        );

                        if (schoolResult.rows.length === 0 || classResult.rows.length === 0) {
                            errorCount++;
                            errors.push(`${fullName}: school or class not recognized ("${schoolName}" / "${className}")`);
                            continue;
                        }

                        const flags = await checkDuplicates(
                            first_name, last_name, row['PHONE NUMBER'],
                            schoolResult.rows[0].id, classResult.rows[0].id
                        );

                        await pool.query(
                            `INSERT INTO computer_training_students
                            (first_name, last_name, gender, school_id, class_id, address, phone, batch, year, month, is_duplicate_flagged)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                            [
                                first_name, last_name, gender,
                                schoolResult.rows[0].id, classResult.rows[0].id,
                                row['ADDRESS'], row['PHONE NUMBER'],
                                batch, year, month,
                                flags.length > 0
                            ]
                        );

                        if (flags.length > 0) flaggedCount++;
                        successCount++;

                    } catch (err) {
                        errorCount++;
                        errors.push(err.message);
                    }
                }

                fs.unlinkSync(req.file.path);

                res.status(200).json({
                    message: `✅ Import complete! ${successCount} added (${flaggedCount} flagged as possible duplicates), ${errorCount} failed.`,
                    errors
                });
            });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 8. PUBLIC — CHECK ENROLLMENT STATUS
// Only safe fields returned — no phone, email, or address
// ─────────────────────────────────────────────
export const checkEnrollmentStatus = async (req, res) => {
    try {
        const { first_name, last_name, school_id, year, month } = req.query;

        if (!first_name || !last_name || !school_id || !year || !month) {
            return res.status(400).json({
                message: '❌ First name, last name, school, year and month are all required.'
            });
        }

        const result = await pool.query(
            `SELECT
                cts.first_name, cts.middle_name, cts.last_name,
                sc.name AS school_name, cl.name AS class_name,
                cts.batch, cts.year, cts.month, cts.status, cts.enrolled_at
            FROM computer_training_students cts
            LEFT JOIN computer_training_schools sc ON cts.school_id = sc.id
            LEFT JOIN computer_training_classes cl ON cts.class_id = cl.id
            WHERE TRIM(LOWER(cts.first_name)) = TRIM(LOWER($1))
              AND TRIM(LOWER(cts.last_name))  = TRIM(LOWER($2))
              AND cts.school_id = $3
              AND cts.year = $4
              AND cts.month = $5`,
            [first_name, last_name, school_id, year, month]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: '❌ No matching enrollment found. Please check your details and try again.'
            });
        }

        res.status(200).json({
            message: '✅ Enrollment record found!',
            results: result.rows
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};