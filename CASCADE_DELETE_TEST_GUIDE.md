# Manual Test Guide: Delete Emergency Unit with Cascade Delete

## Prerequisites
- Backend running on http://localhost:9696
- Database (MySQL) is running and accessible

## Test Steps

### 1. Create a Test Emergency Unit
```bash
curl -X POST http://localhost:9696/emergency-units \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 30.0444,
    "longtitude": 31.2357,
    "capacity": 5,
    "type": "Ambulance",
    "status": false
  }'
```
**Note the `unitID` from the response**

### 2. Create a Test User
```bash
curl -X POST http://localhost:9696/users \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "testuser123",
    "password": "testpass",
    "role": "dispatcher"
  }'
```
**Note the `userID` from the response**

### 3. Create a Test Incident
```bash
curl -X POST http://localhost:9696/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Test Location",
    "latitude": 30.0444,
    "longtitude": 31.2357,
    "priority": 1,
    "description": "Test incident for cascade delete"
  }'
```
**Note the `incidentId` from the response**

### 4. Create an Assignment (Replace IDs with actual values)
```bash
curl -X POST http://localhost:9696/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "userId": YOUR_USER_ID,
    "incidentId": YOUR_INCIDENT_ID,
    "unitId": YOUR_UNIT_ID
  }'
```
**Note the `assignmentId` from the response**

### 5. Verify Assignment Exists
```bash
curl http://localhost:9696/assignments/YOUR_ASSIGNMENT_ID
```
**Should return the assignment details**

### 6. Delete the Emergency Unit (CASCADE DELETE TEST)
```bash
curl -X DELETE http://localhost:9696/emergency-units/YOUR_UNIT_ID -v
```
**Expected: HTTP 204 No Content**

### 7. Verify Assignment Was Cascade Deleted
```bash
curl http://localhost:9696/assignments/YOUR_ASSIGNMENT_ID
```
**Expected: HTTP 404 Not Found or empty response (assignment should be gone)**

### 8. Verify Emergency Unit Was Deleted
```bash
curl http://localhost:9696/emergency-units/YOUR_UNIT_ID
```
**Expected: HTTP 404 Not Found**

## Expected Behavior

✅ **With Cascade Delete Enabled:**
- Deleting the emergency unit should automatically delete all its assignments
- No orphaned assignment records remain in the database
- HTTP 204 response indicates successful deletion

❌ **Without Cascade Delete:**
- Would get a constraint violation error
- Assignment would remain in database with invalid foreign key

## Test Summary

This test verifies that:
1. Emergency units can be deleted even when they have assignments
2. All associated assignments are automatically deleted (cascade)
3. No orphaned records remain in the database
4. The cascade delete configuration works correctly
