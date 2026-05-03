import pool from '../config/db.js';
import { createObjectCsvWriter } from 'csv-writer';
import csvParser from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// ES Module fix for __dirname (not available in ES Modules by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// 1. ADD A NEW STUDENT
// ─────────────────────────────────────────────
export const addStudent = async (req, res) => {
    try {
        // Destructure the data sent from the frontend
        const { first_name, last_name, email, phone, batch, year } = req.body;

        // Make sure required fields are not empty
        if (!first_name || !last_name || !batch || !year) {
            return res.status(400).json({ 
                message: '❌ First name, last name, batch and year are required.' 
            });
        }

        // Insert student into the database
        const [result] = await pool.query(
            `INSERT INTO students 
            (first_name, last_name, email, phone, batch, year) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, phone, batch, year]
        );

        res.status(201).json({ 
            message: '✅ Student enrolled successfully!',
            studentId: result.insertId 
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL STUDENTS (with optional batch filter)
// ─────────────────────────────────────────────
export const getStudents = async (req, res) => {
    try {
        // Check if a batch filter was passed in the URL
        // e.g. /api/enrollment?batch=Batch-A
        const { batch, year } = req.query;

        let query = 'SELECT * FROM students';
        let params = [];

        // Build query dynamically based on filters
        if (batch && year) {
            query += ' WHERE batch = ? AND year = ?';
            params = [batch, year];
        } else if (batch) {
            query += ' WHERE batch = ?';
            params = [batch];
        } else if (year) {
            query += ' WHERE year = ?';
            params = [year];
        }

        query += ' ORDER BY year DESC, batch ASC, last_name ASC';

        const [students] = await pool.query(query, params);

        res.status(200).json({
            message: '✅ Students retrieved successfully!',
            total: students.length,
            students
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

        const [students] = await pool.query(
            'SELECT * FROM students WHERE id = ?', 
            [id]
        );

        // If no student found
        if (students.length === 0) {
            return res.status(404).json({ message: '❌ Student not found.' });
        }

        res.status(200).json({ 
            message: '✅ Student found!',
            student: students[0] 
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
        const { first_name, last_name, email, phone, batch, year, status } = req.body;

        const [result] = await pool.query(
            `UPDATE students SET 
                first_name = ?, last_name = ?, email = ?, 
                phone = ?, batch = ?, year = ?, status = ?
            WHERE id = ?`,
            [first_name, last_name, email, phone, batch, year, status, id]
        );

        if (result.affectedRows === 0) {
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

        const [result] = await pool.query(
            'DELETE FROM students WHERE id = ?', 
            [id]
        );

        if (result.affectedRows === 0) {
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

        let query = 'SELECT * FROM students';
        let params = [];

        if (batch && year) {
            query += ' WHERE batch = ? AND year = ?';
            params = [batch, year];
        } else if (batch) {
            query += ' WHERE batch = ?';
            params = [batch];
        }

        const [students] = await pool.query(query, params);

        // Define the CSV file path
        const filePath = path.join(__dirname, '../exports/students.csv');

        // Make sure the exports folder exists
        if (!fs.existsSync(path.join(__dirname, '../exports'))) {
            fs.mkdirSync(path.join(__dirname, '../exports'));
        }

        // Create the CSV writer
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id', title: 'ID' },
                { id: 'first_name', title: 'First Name' },
                { id: 'last_name', title: 'Last Name' },
                { id: 'email', title: 'Email' },
                { id: 'phone', title: 'Phone' },
                { id: 'batch', title: 'Batch' },
                { id: 'year', title: 'Year' },
                { id: 'status', title: 'Status' },
                { id: 'enrolled_at', title: 'Enrolled At' },
            ]
        });

        // Write to the CSV file
        await csvWriter.writeRecords(students);

        // Send the file as a download
        res.download(filePath, `tokimi_students_${batch || 'all'}.csv`);

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 7. IMPORT STUDENTS FROM CSV
// ─────────────────────────────────────────────

// Set up multer for file uploads
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

        const results = [];

        // Read and parse the CSV file
        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let successCount = 0;
                let errorCount = 0;

                // Loop through each row and insert into database
                for (const student of results) {
                    try {
                        await pool.query(
                            `INSERT INTO students 
                            (first_name, last_name, email, phone, batch, year)
                            VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                student['First Name'],
                                student['Last Name'],
                                student['Email'],
                                student['Phone'],
                                student['Batch'],
                                student['Year']
                            ]
                        );
                        successCount++;
                    } catch (err) {
                        errorCount++;
                    }
                }

                // Delete the uploaded file after processing
                fs.unlinkSync(req.file.path);

                res.status(200).json({
                    message: `✅ Import complete! ${successCount} students added, ${errorCount} failed.`
                });
            });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};