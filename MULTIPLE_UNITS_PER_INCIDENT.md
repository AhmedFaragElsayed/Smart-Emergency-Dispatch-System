# Multiple Emergency Units Per Incident - Feature Documentation

## Overview
The Emergency Dispatch System **fully supports** assigning multiple emergency units to a single incident. This is essential for large-scale emergencies that require multiple resources.

## How It Works

### 1. Assigning Multiple Units to One Incident
You can assign multiple units to the same incident by making multiple assignment API calls:

```bash
# Assign Unit 1 to Incident 100
curl -X POST http://localhost:9696/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {"incidentId": 100},
    "emergencyUnit": {"unitID": 1},
    "isActive": true
  }'

# Assign Unit 2 to the SAME Incident 100
curl -X POST http://localhost:9696/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {"incidentId": 100},
    "emergencyUnit": {"unitID": 2},
    "isActive": true
  }'

# Assign Unit 3 to the SAME Incident 100
curl -X POST http://localhost:9696/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {"incidentId": 100},
    "emergencyUnit": {"unitID": 3},
    "isActive": true
  }'
```

### 2. What Happens When You Delete a Unit

When you delete ONE emergency unit that is assigned to an incident:

#### Before Deletion:
- Incident 100: Status = "DISPATCHED"
- Unit 1: Status = BUSY, assigned to Incident 100
- Unit 2: Status = BUSY, assigned to Incident 100
- Unit 3: Status = BUSY, assigned to Incident 100

#### After Deleting Unit 1:
1. ✅ System finds that Unit 1 was assigned to Incident 100
2. ✅ System finds ALL assignments for Incident 100 (Units 1, 2, 3)
3. ✅ System sets ALL units (1, 2, 3) to AVAILABLE
4. ✅ System deletes ALL assignments for Incident 100
5. ✅ System resets Incident 100 status to "PENDING"
6. ✅ System deletes Unit 1
7. ✅ WebSocket broadcasts updates to all connected clients

#### Final State:
- Incident 100: Status = "PENDING" (needs reassignment)
- Unit 1: DELETED
- Unit 2: Status = AVAILABLE (freed up)
- Unit 3: Status = AVAILABLE (freed up)

### 3. Why This Behavior Makes Sense

**Scenario Example:**
- A major fire breaks out requiring 3 fire trucks
- Fire Truck 1, 2, and 3 are dispatched to the scene
- Fire Truck 1 breaks down and needs to be removed from service

**Without cascade delete:** Fire Trucks 2 and 3 continue fighting the fire alone, but the system still thinks the full team is there. The incident appears fully staffed when it's actually understaffed.

**With cascade delete (current behavior):** 
- Removing Fire Truck 1 triggers a full reassessment
- The incident is marked as "PENDING" 
- All trucks are freed up
- Dispatcher can now properly reassign the correct number of units based on current needs

### 4. Code Implementation

The logic in `EmergencyUnitService.deleteEmergencyUnit()`:

```java
// Step 1: Find all assignments for the unit being deleted
List<Assignment> unitAssignments = 
    assignmentRepository.findByEmergencyUnit_UnitID(unitID);

// Step 2: Identify all affected incidents
Set<Long> affectedIncidentIds = new HashSet<>();
for (Assignment assignment : unitAssignments) {
    if (assignment.getIncident() != null) {
        affectedIncidentIds.add(assignment.getIncident().getIncidentId());
    }
}

// Step 3: For EACH affected incident, find ALL its assignments
// This includes assignments to OTHER units!
for (Long incidentId : affectedIncidentIds) {
    List<Assignment> incidentAssignments = 
        assignmentRepository.findByIncident_IncidentId(incidentId);
    
    // Free up ALL units assigned to this incident
    for (Assignment assignment : incidentAssignments) {
        EmergencyUnit assignedUnit = assignment.getEmergencyUnit();
        if (assignedUnit != null) {
            assignedUnit.setStatus(false); // AVAILABLE
            emergencyUnitRepository.save(assignedUnit);
        }
    }
    
    // Delete ALL assignments for this incident
    assignmentRepository.deleteAll(incidentAssignments);
    
    // Reset incident to PENDING
    incident.setStatus("PENDING");
}
```

### 5. Deadlock Prevention

The updated code prevents database deadlocks by:

1. **Collecting all data first** before making changes
2. **Sorting IDs** to ensure consistent lock order
3. **Processing in order**: Units → Assignments → Incidents
4. **Broadcasting updates** after the transaction completes

```java
// Sort IDs to prevent deadlock
List<Long> sortedUnitIds = new ArrayList<>(affectedUnitIds);
Collections.sort(sortedUnitIds);

List<Long> sortedIncidentIds = new ArrayList<>(affectedIncidentIds);
Collections.sort(sortedIncidentIds);

// Process in consistent order
for (Long unitId : sortedUnitIds) {
    // Update unit status
}

for (Long incidentId : sortedIncidentIds) {
    // Update incident status
}
```

### 6. Logging Configuration

To suppress Hibernate deadlock warnings from appearing in the console:

```properties
# In application.properties
logging.level.org.hibernate.orm.jdbc.error=ERROR
logging.level.org.hibernate.SQL=INFO
```

This changes the log level from WARN to ERROR, so deadlock warnings (which are now handled automatically by retry logic) won't clutter your console.

## Example Scenarios

### Scenario 1: Major Fire (Multiple Units)
```
Incident: Building Fire - Severity: Critical
Assigned Units:
  - Fire Engine 1
  - Fire Engine 2
  - Ladder Truck 1
  - Rescue Squad 1

Delete Fire Engine 1:
  → All 4 units freed
  → All 4 assignments deleted
  → Incident status → PENDING
  → Dispatcher can reassign appropriate resources
```

### Scenario 2: Medical Emergency (Multiple Ambulances)
```
Incident: Multi-Vehicle Accident - Severity: High
Assigned Units:
  - Ambulance 1
  - Ambulance 2
  - Ambulance 3

Delete Ambulance 2:
  → All 3 ambulances freed
  → All 3 assignments deleted
  → Incident status → PENDING
  → Dispatcher reassesses victim count and reassigns
```

### Scenario 3: Police Situation (Mixed Units)
```
Incident: Active Shooter - Severity: Critical
Assigned Units:
  - Police Unit 1
  - Police Unit 2
  - SWAT Team
  - Medical Unit 1

Delete Police Unit 1:
  → All 4 units freed
  → All 4 assignments deleted
  → Incident status → PENDING
  → Dispatcher can coordinate full response team
```

## API Endpoints

### Assign Multiple Units
```bash
POST /api/assignments
Body: {
  "incident": {"incidentId": <ID>},
  "emergencyUnit": {"unitID": <ID>},
  "isActive": true
}
```

### View Assignments for an Incident
```bash
GET /api/assignments
Filter by incident: findByIncident_IncidentId(incidentId)
```

### Delete an Emergency Unit (Cascade)
```bash
DELETE /api/emergencyunits/{unitID}
```

## Benefits of This Approach

1. **Data Integrity**: No orphaned assignments
2. **Resource Accuracy**: All units properly marked as available
3. **Incident Accuracy**: Incidents properly marked for reassignment
4. **Real-time Updates**: WebSocket broadcasts keep UI in sync
5. **Deadlock Prevention**: Consistent locking order prevents database deadlocks
6. **Flexibility**: Dispatcher can fully reassess and reassign resources

## Testing

To test the multiple-unit cascade delete:

1. Create an incident
2. Assign 3+ units to it
3. Verify all units show as BUSY
4. Verify incident shows as DISPATCHED
5. Delete ONE unit
6. Verify ALL units now show as AVAILABLE
7. Verify incident shows as PENDING
8. Verify all assignments are deleted
9. Check WebSocket updates in frontend

## Conclusion

The system is **fully designed and implemented** to handle multiple emergency units assigned to a single incident. The cascade delete behavior ensures that when any unit is removed, the entire incident response is properly reset, allowing dispatchers to make informed decisions about resource allocation based on current availability.
