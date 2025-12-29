# Enhanced Cascade Delete Test Guide for Emergency Units

## Overview
When an Emergency Unit is deleted, the system now performs the following operations:

1. **Finds all incidents** that the deleted unit was assigned to
2. **Deletes ALL assignments** for those incidents (not just the deleted unit's assignments)
3. **Resets incident status** back to `PENDING` for all affected incidents
4. **Makes all emergency units** that were assigned to those incidents `AVAILABLE` again
5. **Broadcasts updates** via WebSocket to all connected clients

## New Behavior Example

### Scenario:
- Incident #1 is assigned to Unit #5, Unit #6, and Unit #7
- User deletes Unit #5

### Expected Result:
1. All three assignments (Unit #5, #6, #7 → Incident #1) are deleted
2. Incident #1 status changes from "DISPATCHED"/"IN_PROGRESS" → "PENDING"
3. Unit #6 and Unit #7 become AVAILABLE again
4. Unit #5 is deleted from the database

## Test Steps

### Prerequisites
1. Backend server running on port 9696
2. Frontend server running on port 5173
3. At least one incident with multiple units assigned

### Step 1: Create Test Data

```bash
# Create an incident
curl -X POST http://localhost:9696/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "type": "FIRE",
    "latitude": 30.0444,
    "longtitude": 31.2357,
    "needs": 5,
    "severityLevel": "High",
    "reportedTime": "2025-12-04T00:00:00",
    "status": "PENDING"
  }'
```

Save the returned `incidentId` (e.g., 101)

```bash
# Create three emergency units
curl -X POST http://localhost:9696/api/emergencyunits \
  -H "Content-Type: application/json" \
  -d '{
    "type": "FIRE",
    "latitude": 30.0450,
    "longtitude": 31.2360,
    "capacity": 10,
    "status": false
  }'
```

Repeat 2 more times to create units. Save their `unitID` values (e.g., 201, 202, 203)

### Step 2: Assign All Units to the Incident

```bash
# Assign Unit 201 to Incident 101
curl -X POST http://localhost:9696/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {"incidentId": 101},
    "emergencyUnit": {"unitID": 201},
    "isActive": true
  }'

# Assign Unit 202 to Incident 101
curl -X POST http://localhost:9696/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {"incidentId": 101},
    "emergencyUnit": {"unitID": 202},
    "isActive": true
  }'

# Assign Unit 203 to Incident 101
curl -X POST http://localhost:9696/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {"incidentId": 101},
    "emergencyUnit": {"unitID": 203},
    "isActive": true
  }'
```

### Step 3: Verify Initial State

```bash
# Check incident status (should be DISPATCHED)
curl http://localhost:9696/api/incidents/101

# Check all units status (should be true/BUSY)
curl http://localhost:9696/api/emergencyunits/201
curl http://localhost:9696/api/emergencyunits/202
curl http://localhost:9696/api/emergencyunits/203

# Check all assignments exist
curl http://localhost:9696/api/assignments
```

Expected:
- Incident 101 status: "DISPATCHED" or "IN_PROGRESS"
- Unit 201, 202, 203 status: true (BUSY)
- Three assignments exist for incident 101

### Step 4: Delete One Emergency Unit

```bash
# Delete Unit 201 (the first unit)
curl -X DELETE http://localhost:9696/api/emergencyunits/201
```

### Step 5: Verify Cascade Delete Results

```bash
# Check incident status (should now be PENDING)
curl http://localhost:9696/api/incidents/101

# Check remaining units status (should be false/AVAILABLE)
curl http://localhost:9696/api/emergencyunits/202
curl http://localhost:9696/api/emergencyunits/203

# Check assignments (all should be deleted)
curl http://localhost:9696/api/assignments

# Verify Unit 201 is deleted (should return 404)
curl http://localhost:9696/api/emergencyunits/201
```

Expected Results:
- ✅ Incident 101 status: "PENDING"
- ✅ Unit 202 status: false (AVAILABLE)
- ✅ Unit 203 status: false (AVAILABLE)
- ✅ All three assignments are deleted
- ✅ Unit 201 no longer exists (404 error)

### Step 6: Verify WebSocket Updates

Open the Admin Portal at http://localhost:5173 and observe:
1. Incident 101 should show status "PENDING"
2. Units 202 and 203 should show as "Available"
3. No manual refresh should be needed (real-time updates via WebSocket)

## Complete Test Script

Save this as `test-enhanced-cascade-delete.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:9696/api"

echo "=== Enhanced Cascade Delete Test ==="
echo ""

# Step 1: Create Incident
echo "Step 1: Creating test incident..."
INCIDENT_RESPONSE=$(curl -s -X POST ${BASE_URL}/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "type": "FIRE",
    "latitude": 30.0444,
    "longtitude": 31.2357,
    "needs": 5,
    "severityLevel": "High",
    "reportedTime": "2025-12-04T00:00:00",
    "status": "PENDING"
  }')

INCIDENT_ID=$(echo $INCIDENT_RESPONSE | grep -oP '"incidentId":\K[0-9]+')
echo "Created Incident ID: $INCIDENT_ID"
echo ""

# Step 2: Create 3 Emergency Units
echo "Step 2: Creating 3 emergency units..."
UNIT_IDS=()
for i in {1..3}; do
  UNIT_RESPONSE=$(curl -s -X POST ${BASE_URL}/emergencyunits \
    -H "Content-Type: application/json" \
    -d '{
      "type": "FIRE",
      "latitude": 30.0450,
      "longtitude": 31.2360,
      "capacity": 10,
      "status": false
    }')
  UNIT_ID=$(echo $UNIT_RESPONSE | grep -oP '"unitID":\K[0-9]+')
  UNIT_IDS+=($UNIT_ID)
  echo "Created Unit ID: $UNIT_ID"
done
echo ""

# Step 3: Assign all units to the incident
echo "Step 3: Assigning all units to incident..."
for UNIT_ID in "${UNIT_IDS[@]}"; do
  curl -s -X POST ${BASE_URL}/assignments \
    -H "Content-Type: application/json" \
    -d "{
      \"incident\": {\"incidentId\": $INCIDENT_ID},
      \"emergencyUnit\": {\"unitID\": $UNIT_ID},
      \"isActive\": true
    }" > /dev/null
  echo "Assigned Unit $UNIT_ID to Incident $INCIDENT_ID"
done
echo ""

# Step 4: Verify initial state
echo "Step 4: Verifying initial state..."
sleep 2
INCIDENT_STATUS=$(curl -s ${BASE_URL}/incidents/${INCIDENT_ID} | grep -oP '"status":"\K[^"]+')
echo "Incident Status: $INCIDENT_STATUS (Expected: DISPATCHED)"

for UNIT_ID in "${UNIT_IDS[@]}"; do
  UNIT_STATUS=$(curl -s ${BASE_URL}/emergencyunits/${UNIT_ID} | grep -oP '"status":\K(true|false)')
  echo "Unit $UNIT_ID Status: $UNIT_STATUS (Expected: true/BUSY)"
done
echo ""

# Step 5: Delete the first unit
echo "Step 5: Deleting Unit ${UNIT_IDS[0]}..."
curl -s -X DELETE ${BASE_URL}/emergencyunits/${UNIT_IDS[0]}
echo "Unit ${UNIT_IDS[0]} deleted"
echo ""

# Step 6: Verify cascade results
echo "Step 6: Verifying cascade delete results..."
sleep 2

INCIDENT_STATUS_AFTER=$(curl -s ${BASE_URL}/incidents/${INCIDENT_ID} | grep -oP '"status":"\K[^"]+')
echo "Incident Status After: $INCIDENT_STATUS_AFTER (Expected: PENDING)"

# Check remaining units
for i in {1..2}; do
  UNIT_ID=${UNIT_IDS[$i]}
  UNIT_STATUS=$(curl -s ${BASE_URL}/emergencyunits/${UNIT_ID} | grep -oP '"status":\K(true|false)')
  echo "Unit $UNIT_ID Status After: $UNIT_STATUS (Expected: false/AVAILABLE)"
done

# Verify first unit is deleted
echo ""
echo "Verifying Unit ${UNIT_IDS[0]} is deleted..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/emergencyunits/${UNIT_IDS[0]})
if [ "$HTTP_CODE" -eq 404 ]; then
  echo "✅ Unit ${UNIT_IDS[0]} successfully deleted (404)"
else
  echo "❌ Unit ${UNIT_IDS[0]} still exists (HTTP $HTTP_CODE)"
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "Summary:"
echo "- Incident ID: $INCIDENT_ID should have status PENDING"
echo "- Unit ${UNIT_IDS[0]} should be deleted"
echo "- Units ${UNIT_IDS[1]} and ${UNIT_IDS[2]} should be AVAILABLE"
echo "- All assignments should be removed"
echo ""
echo "Check the Admin Portal at http://localhost:5173 to verify real-time updates!"
```

Make it executable:
```bash
chmod +x test-enhanced-cascade-delete.sh
```

Run it:
```bash
./test-enhanced-cascade-delete.sh
```

## Backend Console Log

When you delete an emergency unit, you should see output like:
```
Successfully deleted emergency unit 201 and reset 1 incident(s) to PENDING status
```

## Key Changes in Implementation

### EmergencyUnitService.deleteEmergencyUnit()

The method now:
1. Uses `@Transactional` annotation to ensure data consistency
2. Finds all assignments for the deleted unit
3. Collects all unique incident IDs affected
4. For each affected incident:
   - Finds ALL assignments for that incident
   - Sets ALL assigned emergency units to AVAILABLE
   - Deletes ALL assignments
   - Resets incident status to PENDING
   - Broadcasts updates via WebSocket
5. Finally deletes the emergency unit itself

## Verification Checklist

- [ ] Multiple units can be assigned to one incident
- [ ] Deleting one unit removes ALL assignments for the incident
- [ ] Incident status changes back to PENDING
- [ ] All units assigned to the incident become AVAILABLE
- [ ] WebSocket updates are sent for incidents and units
- [ ] No orphaned assignments remain in database
- [ ] Frontend receives real-time updates without refresh
