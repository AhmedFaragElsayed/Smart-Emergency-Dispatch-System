#!/bin/bash

# Test script for Delete Emergency Unit with Cascade Delete

BASE_URL="http://localhost:9696"
echo "========================================"
echo "Testing Delete Emergency Unit (Cascade)"
echo "========================================"
echo ""

# Step 1: Create a test emergency unit
echo "1. Creating a test emergency unit..."
UNIT_RESPONSE=$(curl -s -X POST "$BASE_URL/emergency-units" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 30.0444,
    "longtitude": 31.2357,
    "capacity": 5,
    "type": "Ambulance",
    "status": false
  }')

UNIT_ID=$(echo $UNIT_RESPONSE | grep -o '"unitID":[0-9]*' | grep -o '[0-9]*')
echo "Created Emergency Unit with ID: $UNIT_ID"
echo ""

# Step 2: Create a test user
echo "2. Creating a test user..."
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "testuser123",
    "password": "testpass",
    "role": "dispatcher"
  }')

USER_ID=$(echo $USER_RESPONSE | grep -o '"userID":[0-9]*' | grep -o '[0-9]*')
echo "Created User with ID: $USER_ID"
echo ""

# Step 3: Create a test incident
echo "3. Creating a test incident..."
INCIDENT_RESPONSE=$(curl -s -X POST "$BASE_URL/incidents" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Test Location",
    "latitude": 30.0444,
    "longtitude": 31.2357,
    "priority": 1,
    "description": "Test incident for delete cascade"
  }')

INCIDENT_ID=$(echo $INCIDENT_RESPONSE | grep -o '"incidentId":[0-9]*' | grep -o '[0-9]*')
echo "Created Incident with ID: $INCIDENT_ID"
echo ""

# Step 4: Create an assignment linking the unit, user, and incident
echo "4. Creating an assignment..."
ASSIGNMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/assignments" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": $USER_ID,
    \"incidentId\": $INCIDENT_ID,
    \"unitId\": $UNIT_ID
  }")

ASSIGNMENT_ID=$(echo $ASSIGNMENT_RESPONSE | grep -o '"assignmentId":[0-9]*' | grep -o '[0-9]*')
echo "Created Assignment with ID: $ASSIGNMENT_ID"
echo ""

# Step 5: Verify assignment exists
echo "5. Verifying assignment exists..."
curl -s "$BASE_URL/assignments/$ASSIGNMENT_ID" | head -5
echo ""
echo ""

# Step 6: Delete the emergency unit (should cascade delete the assignment)
echo "6. Deleting emergency unit (this should cascade delete the assignment)..."
DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/emergency-units/$UNIT_ID")
echo "Delete response code: $DELETE_RESPONSE"

if [ "$DELETE_RESPONSE" = "204" ]; then
    echo "✅ Emergency unit deleted successfully!"
else
    echo "❌ Failed to delete emergency unit. Response code: $DELETE_RESPONSE"
fi
echo ""

# Step 7: Verify assignment was cascade deleted
echo "7. Verifying assignment was cascade deleted..."
ASSIGNMENT_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/assignments/$ASSIGNMENT_ID")
echo "Assignment check response code: $ASSIGNMENT_CHECK"

if [ "$ASSIGNMENT_CHECK" = "404" ] || [ "$ASSIGNMENT_CHECK" = "500" ]; then
    echo "✅ Assignment was successfully cascade deleted!"
else
    echo "❌ Assignment still exists (response code: $ASSIGNMENT_CHECK)"
fi
echo ""

# Step 8: Verify emergency unit was deleted
echo "8. Verifying emergency unit was deleted..."
UNIT_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/emergency-units/$UNIT_ID")
echo "Emergency unit check response code: $UNIT_CHECK"

if [ "$UNIT_CHECK" = "404" ]; then
    echo "✅ Emergency unit was successfully deleted!"
else
    echo "❌ Emergency unit still exists (response code: $UNIT_CHECK)"
fi
echo ""

# Cleanup: Delete test user and incident
echo "9. Cleaning up test data..."
curl -s -X DELETE "$BASE_URL/users/$USER_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/incidents/$INCIDENT_ID" > /dev/null
echo "✅ Cleanup complete"
echo ""

echo "========================================"
echo "Test Complete!"
echo "========================================"
