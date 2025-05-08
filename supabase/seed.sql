-- Supabase Seed Script
-- Version: 1.0
-- Description: Initializes the database schema for BizAttend application,
--              including employees and attendance_records tables.
--              Also adds some sample data for demonstration.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables in reverse order of dependency if they exist, using CASCADE to handle foreign keys
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS employees;

-- Create Employees Table
CREATE TABLE employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rfid_tag TEXT UNIQUE,
    department TEXT,
    position TEXT,
    hourly_rate NUMERIC(10, 2) -- Assuming up to 10 digits, 2 for decimals
);

COMMENT ON TABLE employees IS 'Stores information about company employees.';
COMMENT ON COLUMN employees.id IS 'Unique identifier for the employee (UUID).';
COMMENT ON COLUMN employees.created_at IS 'Timestamp of when the employee record was created.';
COMMENT ON COLUMN employees.name IS 'Full name of the employee.';
COMMENT ON COLUMN employees.email IS 'Email address of the employee (must be unique).';
COMMENT ON COLUMN employees.rfid_tag IS 'Unique RFID tag ID assigned to the employee for clock-in/out.';
COMMENT ON COLUMN employees.department IS 'Department the employee belongs to.';
COMMENT ON COLUMN employees.position IS 'Job title or position of the employee.';
COMMENT ON COLUMN employees.hourly_rate IS 'Hourly wage rate for the employee.';

-- Create Attendance Records Table
CREATE TABLE attendance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    clock_in_time TIMESTAMPTZ NOT NULL,
    clock_out_time TIMESTAMPTZ,
    status TEXT CHECK (status IN ('clocked_in', 'clocked_out')) -- Ensures status is one of the allowed values
);

COMMENT ON TABLE attendance_records IS 'Stores attendance clock-in and clock-out records for employees.';
COMMENT ON COLUMN attendance_records.id IS 'Unique identifier for the attendance record (UUID).';
COMMENT ON COLUMN attendance_records.created_at IS 'Timestamp of when the attendance record was created.';
COMMENT ON COLUMN attendance_records.employee_id IS 'Foreign key referencing the employee this record belongs to. Deletes cascade.';
COMMENT ON COLUMN attendance_records.clock_in_time IS 'Timestamp of when the employee clocked in.';
COMMENT ON COLUMN attendance_records.clock_out_time IS 'Timestamp of when the employee clocked out. Null if still clocked in.';
COMMENT ON COLUMN attendance_records.status IS 'Current status of the record (e.g., clocked_in, clocked_out).';

-- Add Indexes for Performance
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_rfid_tag ON employees(rfid_tag);
CREATE INDEX idx_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_records_clock_in_time ON attendance_records(clock_in_time);

-- Insert Sample Data (Optional - for demonstration)

-- Sample Employees
INSERT INTO employees (name, email, rfid_tag, department, position, hourly_rate) VALUES
('Alice Wonderland', 'alice@example.com', 'RFID_ALICE123', 'Engineering', 'Software Engineer', 75.00),
('Bob The Builder', 'bob@example.com', 'RFID_BOB456', 'Operations', 'Site Manager', 60.50),
('Charlie Brown', 'charlie@example.com', 'RFID_CHARLIE789', 'Marketing', 'Marketing Specialist', 50.25),
('Diana Prince', 'diana@example.com', null, 'HR', 'HR Manager', 80.00); -- Employee without RFID for testing

-- Note: The NextAuth.js Supabase adapter will handle the creation of its own tables
-- (users, accounts, sessions, verification_tokens). Do not define them here.

-- The admin user specified by ADMIN_EMAIL and ADMIN_PASSWORD in your .env file
-- will be created in the NextAuth 'users' table by the adapter upon first login.
-- This seed script focuses on application-specific data.

-- You can add more sample data below if needed.
-- For example, sample attendance records (ensure employee_id matches one from above):
-- This requires knowing the UUIDs generated for Alice, Bob, etc.
-- Example (assuming you fetched Alice's ID first and replaced 'alice_uuid_placeholder'):
-- INSERT INTO attendance_records (employee_id, clock_in_time, clock_out_time, status) VALUES
-- ('alice_uuid_placeholder', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '1 hour', 'clocked_out');

SELECT 'Database seeded successfully with BizAttend schema and sample data.' AS status;
