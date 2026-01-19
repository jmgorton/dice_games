#!/bin/bash
# Quick test script for token-based authentication
# Run this to verify the auth system is working

AUTH_URL="http://localhost:1313"
PASSWORD="family-password"

echo "=== Token-Based Auth Quick Test ==="
echo ""

# Test 1: Get token
echo "1. Testing LOGIN..."
RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"$PASSWORD\"}")

echo "Response: $RESPONSE"
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ FAILED: Could not get token"
    exit 1
fi

echo "✅ Token received: ${TOKEN:0:30}..."
echo ""

# Test 2: Use token on protected route
echo "2. Testing PROTECTED ROUTE with token..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH_URL/play" \
  -H "Authorization: Bearer $TOKEN")

if [ "$STATUS" == "200" ]; then
    echo "✅ Protected route accessible with token (HTTP $STATUS)"
else
    echo "⚠️  HTTP Status: $STATUS (expect 200 for successful access)"
fi
echo ""

# Test 3: Try without token
echo "3. Testing PROTECTED ROUTE without token..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH_URL/play")

if [ "$STATUS" != "200" ]; then
    echo "✅ Protected route properly blocked without token (HTTP $STATUS)"
else
    echo "❌ FAILED: Protected route should require token"
fi
echo ""

# Test 4: Logout
echo "4. Testing LOGOUT..."
RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}")

echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Logout successful"
else
    echo "⚠️  Logout response: $RESPONSE"
fi
echo ""

# Test 5: Try with revoked token
echo "5. Testing PROTECTED ROUTE with revoked token..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH_URL/play" \
  -H "Authorization: Bearer $TOKEN")

if [ "$STATUS" != "200" ]; then
    echo "✅ Revoked token properly rejected (HTTP $STATUS)"
else
    echo "⚠️  Revoked token still works (expect it to be rejected)"
fi
echo ""

echo "=== Test Complete ==="
