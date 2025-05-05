// src/tests/integration/userProfile.test.js
const request = require('supertest');
const sequelize = require('../../../src/config/database');
const app = require('../../../index');
const User = require('../../../src/models/user');
const jwt = require('jsonwebtoken');

describe('User Profile Update Tests', () => {
  // Test data
  const testUser = {
    username: 'profiletestuser',
    email: 'profiletest@example.com',
    password: 'password123'
  };

  let authToken;
  let userId;

  // Run before all tests
  beforeAll(async () => {
    // Sync database in test mode
    await sequelize.sync({ force: true });
    
    // Create a test user
    const user = await User.create({
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      phone: null,
      avatar: null
    });
    
    userId = user.id;
    
    // Generate JWT token
    const SECRET_KEY = process.env.SECRET_KEY || 'test_secret_key_for_tests_only';
    authToken = jwt.sign({ id: userId }, SECRET_KEY, { expiresIn: '1h' });
  });

  // Run after all tests
  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  // Test updating phone number
  describe('PATCH /me/profile - Update Phone Number', () => {
    it('should update user phone number', async () => {
      const phoneData = {
        phone: '+380991234567'
      };

      const response = await request(app)
        .patch('/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(phoneData);

      // Check response status
      expect(response.status).toBe(200);
      // Check success message
      expect(response.body).toHaveProperty('message', 'Профіль оновлено');

      // Verify phone number was actually updated in the database
      const updatedUser = await User.findByPk(userId);
      expect(updatedUser.phone).toBe(phoneData.phone);
    });

    it('should handle invalid phone format gracefully', async () => {
      const invalidPhoneData = {
        phone: 'not-a-phone-number'
      };

      const response = await request(app)
        .patch('/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPhoneData);

      // Check that even with an invalid format, the API still processes it
      // (Since there's no validation in the controller, this should still work)
      expect(response.status).toBe(200);
      
      // Verify phone was updated with the invalid value (implement validation if this is not desired)
      const updatedUser = await User.findByPk(userId);
      expect(updatedUser.phone).toBe(invalidPhoneData.phone);
    });
  });

  // Test updating avatar
  describe('PATCH /me/profile - Update Avatar', () => {
    it('should update user avatar', async () => {
      const avatarData = {
        avatar: 'https://example.com/avatar.jpg'
      };

      const response = await request(app)
        .patch('/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(avatarData);

      // Check response status
      expect(response.status).toBe(200);
      // Check success message
      expect(response.body).toHaveProperty('message', 'Профіль оновлено');

      // Verify avatar was actually updated in the database
      const updatedUser = await User.findByPk(userId);
      expect(updatedUser.avatar).toBe(avatarData.avatar);
    });

    it('should handle base64 encoded avatar image', async () => {
      // A small base64 encoded image
      const base64Avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5+ECQOAAAAABJRU5ErkJggg==';
      
      const avatarData = {
        avatar: base64Avatar
      };

      const response = await request(app)
        .patch('/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(avatarData);

      // Check response status
      expect(response.status).toBe(200);
      
      // Verify base64 avatar was stored correctly
      const updatedUser = await User.findByPk(userId);
      expect(updatedUser.avatar).toBe(avatarData.avatar);
    });
  });

  // Test updating both phone and avatar simultaneously
  describe('PATCH /me/profile - Update Multiple Fields', () => {
    it('should update both phone and avatar in one request', async () => {
      const profileData = {
        phone: '+380997654321',
        avatar: 'https://example.com/new-avatar.jpg'
      };

      const response = await request(app)
        .patch('/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData);

      // Check response status
      expect(response.status).toBe(200);
      
      // Verify both fields were updated in the database
      const updatedUser = await User.findByPk(userId);
      expect(updatedUser.phone).toBe(profileData.phone);
      expect(updatedUser.avatar).toBe(profileData.avatar);
    });
  });

  // Test authorization requirements
  describe('PATCH /me/profile - Authorization Tests', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .patch('/me/profile')
        .send({ phone: '+380991111111' });

      // Check unauthorized status
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .patch('/me/profile')
        .set('Authorization', 'Bearer invalid-token')
        .send({ phone: '+380991111111' });

      // Check unauthorized status
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Edge cases
  describe('PATCH /me/profile - Edge Cases', () => {
    it('should handle empty update data gracefully', async () => {
      const response = await request(app)
        .patch('/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Check response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Профіль оновлено');
    });

    it('should handle clearing profile data (setting to null)', async () => {
      // First ensure we have data
      await User.update(
        { phone: '+380991234567', avatar: 'https://example.com/avatar.jpg' },
        { where: { id: userId } }
      );
      
      // Then attempt to clear it
      const response = await request(app)
        .patch('/me/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: null, avatar: null });

      // Check response status
      expect(response.status).toBe(200);
      
      // Verify fields were set to null
      const updatedUser = await User.findByPk(userId);
      expect(updatedUser.phone).toBeNull();
      expect(updatedUser.avatar).toBeNull();
    });
  });
});