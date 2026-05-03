import pool from '../config/db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createObjectCsvWriter } from 'csv-writer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// MULTER SETUP — for staff photo uploads
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/staff');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `staff_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('❌ Only JPEG, PNG and WEBP images are allowed'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ─────────────────────────────────────────────
// 1. ADD A STAFF MEMBER
// ─────────────────────────────────────────────
export const addStaff = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, role, department } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !role) {
            return res.status(400).json({
                message: '❌ First name, last name and role are required.'
            });
        }

        // Check if email already exists
        if (email) {
            const [existing] = await pool.query(
                'SELECT id FROM staff WHERE email = ?',
                [email]
            );
            if (existing.length > 0) {
                return res.status(400).json({
                    message: '❌ A staff member with this email already exists.'
                });
            }
        }

        // Handle photo upload
        const photo_url = req.file
            ? `/uploads/staff/${req.file.filename}`
            : null;

        const [result] = await pool.query(
            `INSERT INTO staff
            (first_name, last_name, email, phone, role, department, photo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, phone, role, department, photo_url]
        );

        res.status(201).json({
            message: `✅ Staff member ${first_name} ${last_name} added successfully!`,
            staffId: result.insertId,
            photo_url
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL STAFF MEMBERS
// ─────────────────────────────────────────────
export const getAllStaff = async (req, res) => {
    try {
        const { department } = req.query;

        let query = 'SELECT * FROM staff';
        let params = [];

        // Filter by department if provided
        if (department) {
            query += ' WHERE department = ?';
            params = [department];
        }

        query += ' ORDER BY department ASC, last_name ASC';

        const [staff] = await pool.query(query, params);

        res.status(200).json({
            message: '✅ Staff members retrieved successfully!',
            total: staff.length,
            staff
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. GET A SINGLE STAFF MEMBER
// ─────────────────────────────────────────────
export const getStaffById = async (req, res) => {
    try {
        const { id } = req.params;

        const [staff] = await pool.query(
            'SELECT * FROM staff WHERE id = ?',
            [id]
        );

        if (staff.length === 0) {
            return res.status(404).json({ message: '❌ Staff member not found.' });
        }

        res.status(200).json({
            message: '✅ Staff member found!',
            staff: staff[0]
        });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE A STAFF MEMBER
// ─────────────────────────────────────────────
export const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, email, phone, role, department } = req.body;

        // Check if staff exists
        const [existing] = await pool.query(
            'SELECT * FROM staff WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: '❌ Staff member not found.' });
        }

        // Handle photo update
        const photo_url = req.file
            ? `/uploads/staff/${req.file.filename}`
            : existing[0].photo_url;

        // Delete old photo if new one uploaded
        if (req.file && existing[0].photo_url) {
            const oldPhotoPath = path.join(__dirname, '..', existing[0].photo_url);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        await pool.query(
            `UPDATE staff SET
                first_name = ?,
                last_name  = ?,
                email      = ?,
                phone      = ?,
                role       = ?,
                department = ?,
                photo_url  = ?
            WHERE id = ?`,
            [first_name, last_name, email, phone, role, department, photo_url, id]
        );

        res.status(200).json({ message: '✅ Staff member updated successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE A STAFF MEMBER
// ─────────────────────────────────────────────
export const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.query(
            'SELECT * FROM staff WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: '❌ Staff member not found.' });
        }

        // Delete photo file from disk if it exists
        if (existing[0].photo_url) {
            const photoPath = path.join(__dirname, '..', existing[0].photo_url);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        }

        await pool.query('DELETE FROM staff WHERE id = ?', [id]);

        res.status(200).json({ message: '✅ Staff member deleted successfully!' });

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 6. EXPORT STAFF TO CSV
// ─────────────────────────────────────────────
export const exportStaff = async (req, res) => {
    try {
        const [staff] = await pool.query(
            'SELECT * FROM staff ORDER BY department ASC, last_name ASC'
        );

        // Make sure exports folder exists
        const exportsDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir);
        }

        const filePath = path.join(exportsDir, 'staff.csv');

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id',         title: 'ID' },
                { id: 'first_name', title: 'First Name' },
                { id: 'last_name',  title: 'Last Name' },
                { id: 'email',      title: 'Email' },
                { id: 'phone',      title: 'Phone' },
                { id: 'role',       title: 'Role' },
                { id: 'department', title: 'Department' },
                { id: 'created_at', title: 'Date Added' },
            ]
        });

        await csvWriter.writeRecords(staff);

        res.download(filePath, 'tokimi_staff.csv');

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};