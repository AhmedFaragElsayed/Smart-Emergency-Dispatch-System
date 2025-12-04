-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS=0;

-- Drop tables if they exist (for clean start)
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS emergency_units;
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS users;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    incident_id VARCHAR(100) UNIQUE,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    severity_level VARCHAR(50),
    needs INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Emergency Units table
CREATE TABLE IF NOT EXISTS emergency_units (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    unit_id VARCHAR(100) UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    unit_id VARCHAR(100) NOT NULL,
    incident_id VARCHAR(100) NOT NULL,
    assigned_by VARCHAR(100),
    assignment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ASSIGNED',
    FOREIGN KEY (unit_id) REFERENCES emergency_units(unit_id),
    FOREIGN KEY (incident_id) REFERENCES incidents(incident_id)
);

-- Insert initial admin user (password should be encrypted in production)
-- Using BCrypt for 'admin123' = $2a$10$yourEncryptedPasswordHere
-- For testing, you can use plain text first, then implement encryption
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@emergency.com', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'ADMIN'),
('dispatcher1', 'dispatch@emergency.com', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'DISPATCHER'),
('fieldagent1', 'field@emergency.com', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'FIELD_AGENT');

-- Insert sample emergency units
INSERT INTO emergency_units (unit_id, name, type, status, latitude, longitude) VALUES
('AMB001', 'Ambulance Alpha', 'AMBULANCE', 'AVAILABLE', 30.0444, 31.2357),
('AMB002', 'Ambulance Beta', 'AMBULANCE', 'BUSY', 30.0544, 31.2457),
('FIR001', 'Fire Truck 1', 'FIRE_TRUCK', 'AVAILABLE', 30.0644, 31.2557),
('POL001', 'Patrol Car 1', 'POLICE_CAR', 'AVAILABLE', 30.0744, 31.2657);

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;