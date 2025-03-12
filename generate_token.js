const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

// Read the JWT secret from the .env file
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error('JWT_SECRET not found in .env file');
  process.exit(1);
}

// Create a payload similar to what LibreChat would use
const payload = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours from now
  iat: Math.floor(Date.now() / 1000)
};

// Sign the token
const token = jwt.sign(payload, jwtSecret);

console.log('JWT Token:');
console.log(token);

// Save the token to a file for easy access
fs.writeFileSync('token.txt', token);
console.log('Token saved to token.txt'); 