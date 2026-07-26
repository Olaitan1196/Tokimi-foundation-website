-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE student_status AS ENUM ('active', 'graduated', 'withdrawn', 'expelled');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused', 'late');
CREATE TYPE scholarship_purpose AS ENUM ('WAEC', 'NECO', 'GCE', 'JAMB');
CREATE TYPE beneficiary_status AS ENUM ('student', 'business_owner');

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STAFF
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    photo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NEWS
-- ============================================
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    author VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_news_updated_at
BEFORE UPDATE ON news
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================
-- LOOKUP TABLES — COMPUTER TRAINING PROGRAM
-- ============================================
CREATE TABLE IF NOT EXISTS computer_training_schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS computer_training_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMPUTER TRAINING STUDENTS
-- ============================================
CREATE TABLE IF NOT EXISTS computer_training_students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender gender_type NOT NULL,
    school_id INT REFERENCES computer_training_schools(id),
    class_id INT REFERENCES computer_training_classes(id),
    address TEXT,
    phone VARCHAR(20),
    batch VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    month VARCHAR(10) NOT NULL,
    status student_status DEFAULT 'active',
    status_reason TEXT,
    is_duplicate_flagged BOOLEAN DEFAULT false,
    duplicate_override_by INT REFERENCES users(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMPUTER TRAINING ATTENDANCE
-- ============================================
CREATE TABLE IF NOT EXISTS computer_training_attendance (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES computer_training_students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    marked_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOOKUP TABLES — SCHOLARSHIP
-- ============================================
CREATE TABLE IF NOT EXISTS scholarship_schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scholarship_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SCHOLARSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS scholarships (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(150) NOT NULL,
    school_id INT REFERENCES scholarship_schools(id),
    class_id INT REFERENCES scholarship_classes(id),
    purpose scholarship_purpose NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date_awarded DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOOKUP TABLE — GRANT
-- ============================================
CREATE TABLE IF NOT EXISTS grant_schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GRANTS
-- ============================================
CREATE TABLE IF NOT EXISTS grants (
    id SERIAL PRIMARY KEY,
    beneficiary_name VARCHAR(150) NOT NULL,
    beneficiary_status beneficiary_status NOT NULL,
    school_id INT REFERENCES grant_schools(id),
    business_type VARCHAR(150),
    purpose TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date_awarded DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);