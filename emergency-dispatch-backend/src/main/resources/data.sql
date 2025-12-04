-- Insert test users
-- Username: admin, Password: admin123
INSERT INTO user (username, fname, lname, password, role) 
VALUES ('admin', 'Admin', 'User', 'admin123', 'Admin')
ON DUPLICATE KEY UPDATE username=username;

-- Username: dispatcher, Password: dispatcher123
INSERT INTO user (username, fname, lname, password, role) 
VALUES ('dispatcher', 'John', 'Doe', 'dispatcher123', 'Dispatcher')
ON DUPLICATE KEY UPDATE username=username;

-- Username: manager, Password: manager123
INSERT INTO user (username, fname, lname, password, role) 
VALUES ('manager', 'Jane', 'Smith', 'manager123', 'Manager')
ON DUPLICATE KEY UPDATE username=username;
