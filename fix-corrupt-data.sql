-- SQL Script to fix corrupt data in Incident table

-- First, let's see what's wrong
SELECT incident_id, needs, type, severity_level 
FROM incident 
WHERE needs NOT REGEXP '^[0-9]+$' OR needs IS NULL;

-- Fix: Update corrupt needs values to a default number (e.g., 1)
UPDATE incident 
SET needs = 1 
WHERE needs NOT REGEXP '^[0-9]+$' OR needs IS NULL;

-- Or if you prefer to delete the corrupt records:
-- DELETE FROM incident WHERE needs NOT REGEXP '^[0-9]+$' OR needs IS NULL;

-- Verify the fix
SELECT incident_id, needs, type, severity_level FROM incident;
