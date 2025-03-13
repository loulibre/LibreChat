#!/bin/bash

# This script helps create a new user account in LibreChat

echo "Creating a new user account in LibreChat..."

# Set your new user details here
NEW_EMAIL="[Add new user email]"
NEW_PASSWORD="[Add new user password]"
NEW_NAME="[Add new user name]"
API_URL="http://localhost:3080/api"

# Step 1: Create a new user
echo -e "\n=== Step 1: Creating a new user ==="
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$NEW_EMAIL\",
    \"password\": \"$NEW_PASSWORD\",
    \"name\": \"$NEW_NAME\",
    \"confirm_password\": \"$NEW_PASSWORD\"
  }")

echo "Registration response:"
echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"

# Step 2: Login with the new user
echo -e "\n=== Step 2: Logging in with the new user ==="
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$NEW_EMAIL\",
    \"password\": \"$NEW_PASSWORD\"
  }")

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$TOKEN" ]; then
  echo -e "\n✅ Successfully logged in with the new user"
  echo "Token: ${TOKEN:0:20}..." # Show only first 20 chars for security
else
  echo -e "\n❌ Failed to log in with the new user"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

# Step 3: Test the API with the new user
echo -e "\n=== Step 3: Testing the API with the new user ==="
ENDPOINTS_RESPONSE=$(curl -s -X GET $API_URL/endpoints \
  -H "Authorization: Bearer $TOKEN")

echo "Endpoints response:"
echo "$ENDPOINTS_RESPONSE" | jq . 2>/dev/null || echo "$ENDPOINTS_RESPONSE"

echo -e "\nNew user creation and testing completed."
echo -e "Use these credentials in the browser to test the UI:"
echo -e "Email: $NEW_EMAIL"
echo -e "Password: $NEW_PASSWORD" 