import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// HELPER — Fill HTML template with real data
// ─────────────────────────────────────────────
const fillTemplate = (template, data) => {
    let filled = template;
    Object.keys(data).forEach(key => {
        // Replace all {{key}} placeholders with actual values
        const regex = new RegExp(`{{${key}}}`, 'g');
        filled = filled.replace(regex, data[key] || '');
    });

    // Handle {{#if photo_url}} blocks
    if (data.photo_url) {
        filled = filled.replace(/{{#if photo_url}}([\s\S]*?){{else}}[\s\S]*?{{\/if}}/g, '$1');
    } else {
        filled = filled.replace(/{{#if photo_url}}[\s\S]*?{{else}}([\s\S]*?){{\/if}}/g, '$1');
    }

    return filled;
};

// ─────────────────────────────────────────────
// HELPER — Convert HTML string to PDF buffer
// ─────────────────────────────────────────────
const htmlToPdf = async (htmlContent, options = {}) => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
        width:       options.width  || '400px',
        height:      options.height || '250px',
        printBackground: true,
    });

    await browser.close();
    return pdf;
};

// ─────────────────────────────────────────────
// 1. GENERATE STUDENT ID CARD
// ─────────────────────────────────────────────
export const generateStudentIdCard = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch student from database
        const [students] = await pool.query(
            'SELECT * FROM students WHERE id = ?',
            [id]
        );

        if (students.length === 0) {
            return res.status(404).json({ message: '❌ Student not found.' });
        }

        const student = students[0];

        // Build the full photo URL if it exists
        const photo_url = student.photo_url
            ? `http://localhost:${process.env.PORT || 5000}${student.photo_url}`
            : null;

        // Load the ID card template
        const templatePath = path.join(__dirname, '../templates/idcard.html');
        const template = fs.readFileSync(templatePath, 'utf-8');

        // Fill the template with student data
        const filledHtml = fillTemplate(template, {
            first_name:           student.first_name,
            last_name:            student.last_name,
            email:                student.email        || 'N/A',
            phone:                student.phone        || 'N/A',
            type:                 'Student',
            role_or_batch:        `Batch: ${student.batch}`,
            department_or_year:   `Year: ${student.year}`,
            photo_url:            photo_url,
            id:                   String(student.id).padStart(4, '0'),
            year:                 student.year,
        });

        // Convert to PDF
        const pdf = await htmlToPdf(filledHtml, {
            width: '400px',
            height: '250px'
        });

        // Send PDF as download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="ID_Card_${student.first_name}_${student.last_name}.pdf"`
        );
        res.send(pdf);

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. GENERATE STAFF ID CARD
// ─────────────────────────────────────────────
export const generateStaffIdCard = async (req, res) => {
    try {
        const { id } = req.params;

        const [staffList] = await pool.query(
            'SELECT * FROM staff WHERE id = ?',
            [id]
        );

        if (staffList.length === 0) {
            return res.status(404).json({ message: '❌ Staff member not found.' });
        }

        const staff = staffList[0];

        const photo_url = staff.photo_url
            ? `http://localhost:${process.env.PORT || 5000}${staff.photo_url}`
            : null;

        const templatePath = path.join(__dirname, '../templates/idcard.html');
        const template = fs.readFileSync(templatePath, 'utf-8');

        const filledHtml = fillTemplate(template, {
            first_name:         staff.first_name,
            last_name:          staff.last_name,
            email:              staff.email      || 'N/A',
            phone:              staff.phone      || 'N/A',
            type:               'Staff',
            role_or_batch:      staff.role,
            department_or_year: staff.department || 'N/A',
            photo_url:          photo_url,
            id:                 String(staff.id).padStart(4, '0'),
            year:               new Date().getFullYear(),
        });

        const pdf = await htmlToPdf(filledHtml, {
            width: '400px',
            height: '250px'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="ID_Card_${staff.first_name}_${staff.last_name}.pdf"`
        );
        res.send(pdf);

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. GENERATE STUDENT CERTIFICATE
// ─────────────────────────────────────────────
export const generateCertificate = async (req, res) => {
    try {
        const { id } = req.params;

        const [students] = await pool.query(
            'SELECT * FROM students WHERE id = ?',
            [id]
        );

        if (students.length === 0) {
            return res.status(404).json({ message: '❌ Student not found.' });
        }

        const student = students[0];

        // Format the current date nicely
        const date = new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const templatePath = path.join(__dirname, '../templates/certificate.html');
        const template = fs.readFileSync(templatePath, 'utf-8');

        const filledHtml = fillTemplate(template, {
            first_name: student.first_name,
            last_name:  student.last_name,
            batch:      student.batch,
            year:       student.year,
            date:       date,
            id:         String(student.id).padStart(4, '0'),
        });

        // Certificate is A4 landscape
        const pdf = await htmlToPdf(filledHtml, {
            width:  '842px',
            height: '595px'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Certificate_${student.first_name}_${student.last_name}.pdf"`
        );
        res.send(pdf);

    } catch (error) {
        res.status(500).json({ message: '❌ Server error', error: error.message });
    }
};