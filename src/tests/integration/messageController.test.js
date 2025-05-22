// src/tests/messageController.test.js
const request = require('supertest');
const app = require('../../../index');
const sequelize = require('../../config/database');
const { User, Listing, Message } = require('../../models/associations');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'test_secret_key_for_tests_only';

describe('Message Controller', () => {
  let user1, user2, user3, listing1, listing2;
  let token1, token2, token3;

  beforeEach(async () => {
    // Очищення бази даних перед кожним тестом
    await sequelize.sync({ force: true });

    // Створення тестових користувачів
    user1 = await User.create({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'hashedpassword1'
    });

    user2 = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'hashedpassword2'
    });

    user3 = await User.create({
      username: 'testuser3',
      email: 'test3@example.com',
      password: 'hashedpassword3'
    });

    // Створення JWT токенів
    token1 = jwt.sign({ id: user1.id }, SECRET_KEY, { expiresIn: '1h' });
    token2 = jwt.sign({ id: user2.id }, SECRET_KEY, { expiresIn: '1h' });
    token3 = jwt.sign({ id: user3.id }, SECRET_KEY, { expiresIn: '1h' });

    // Створення тестових оголошень
    listing1 = await Listing.create({
      title: 'Test Listing 1',
      description: 'Test Description 1',
      price: 1000,
      location: 'Test Location 1',
      ownerId: user1.id,
      operationType: 'rent',
      propertyType: 'apartment',
      rooms: 2,
      floors: 1
    });

    listing2 = await Listing.create({
      title: 'Test Listing 2',
      description: 'Test Description 2',
      price: 2000,
      location: 'Test Location 2',
      ownerId: user2.id,
      operationType: 'sale',
      propertyType: 'house',
      rooms: 3,
      floors: 2
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/messages - sendMessage', () => {
    it('повинен успішно відправити повідомлення', async () => {
      const messageData = {
        content: 'Привіт! Мене цікавить ваше оголошення.',
        receiverId: user2.id,
        listingId: listing1.id
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.content).toBe(messageData.content);
      expect(response.body.senderId).toBe(user1.id);
      expect(response.body.receiverId).toBe(user2.id);
      expect(response.body.listingId).toBe(listing1.id);
      expect(response.body.read).toBe(false);
    });

    it('повинен повернути помилку при відсутності токена', async () => {
      const messageData = {
        content: 'Test message',
        receiverId: user2.id,
        listingId: listing1.id
      };

      const response = await request(app)
        .post('/api/messages')
        .send(messageData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    it('повинен повернути помилку при неіснуючому оголошенні', async () => {
      const messageData = {
        content: 'Test message',
        receiverId: user2.id,
        listingId: 99999
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send(messageData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Оголошення не знайдено');
    });

    it('повинен повернути помилку при неіснуючому отримувачі', async () => {
      const messageData = {
        content: 'Test message',
        receiverId: 99999,
        listingId: listing1.id
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send(messageData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Отримувача не знайдено');
    });

    it('повинен повернути помилку при спробі написати самому собі', async () => {
      const messageData = {
        content: 'Test message',
        receiverId: user1.id,
        listingId: listing1.id
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send(messageData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Ви не можете написати повідомлення самому собі');
    });
  });

  describe('GET /api/messages/conversations - getConversations', () => {
    beforeEach(async () => {
      // Створення тестових повідомлень
      await Message.create({
        content: 'Message 1',
        senderId: user1.id,
        receiverId: user2.id,
        listingId: listing1.id,
        read: false
      });

      await Message.create({
        content: 'Message 2',
        senderId: user2.id,
        receiverId: user1.id,
        listingId: listing1.id,
        read: false
      });

      await Message.create({
        content: 'Message 3',
        senderId: user3.id,
        receiverId: user1.id,
        listingId: listing2.id,
        read: false
      });
    });

    it('повинен повернути список розмов користувача', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Перевіряємо структуру відповіді
      const conversation = response.body[0];
      expect(conversation).toHaveProperty('user');
      expect(conversation).toHaveProperty('listing');
      expect(conversation).toHaveProperty('unreadCount');
      expect(conversation.user).toHaveProperty('id');
      expect(conversation.user).toHaveProperty('username');
      expect(conversation.listing).toHaveProperty('id');
      expect(conversation.listing).toHaveProperty('title');
    });

    it('повинен повернути помилку при відсутності токена', async () => {
      const response = await request(app)
        .get('/api/messages/conversations');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/messages/:otherUserId/:listingId - getMessages', () => {
    beforeEach(async () => {
      // Створення ланцюжка повідомлень між користувачами
      await Message.create({
        content: 'Перше повідомлення',
        senderId: user1.id,
        receiverId: user2.id,
        listingId: listing1.id,
        read: false
      });

      await Message.create({
        content: 'Відповідь на перше повідомлення',
        senderId: user2.id,
        receiverId: user1.id,
        listingId: listing1.id,
        read: false
      });

      await Message.create({
        content: 'Друге повідомлення',
        senderId: user1.id,
        receiverId: user2.id,
        listingId: listing1.id,
        read: false
      });
    });

    it('повинен повернути повідомлення конкретного чату', async () => {
      const response = await request(app)
        .get(`/api/messages/${user2.id}/${listing1.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      
      // Перевіряємо сортування за часом створення
      const messages = response.body;
      expect(messages[0].content).toBe('Перше повідомлення');
      expect(messages[1].content).toBe('Відповідь на перше повідомлення');
      expect(messages[2].content).toBe('Друге повідомлення');
      
      // Перевіряємо включення даних про користувачів та оголошення
      expect(messages[0]).toHaveProperty('sender');
      expect(messages[0]).toHaveProperty('receiver');
      expect(messages[0]).toHaveProperty('Listing');
    });

    it('повинен позначити повідомлення як прочитані', async () => {
      // Перевіряємо, що є непрочитані повідомлення
      const unreadBefore = await Message.count({
        where: {
          receiverId: user1.id,
          senderId: user2.id,
          listingId: listing1.id,
          read: false
        }
      });
      expect(unreadBefore).toBe(1);

      await request(app)
        .get(`/api/messages/${user2.id}/${listing1.id}`)
        .set('Authorization', `Bearer ${token1}`);

      // Перевіряємо, що повідомлення позначені як прочитані
      const unreadAfter = await Message.count({
        where: {
          receiverId: user1.id,
          senderId: user2.id,
          listingId: listing1.id,
          read: false
        }
      });
      expect(unreadAfter).toBe(0);
    });

    it('повинен повернути помилку при відсутності токена', async () => {
      const response = await request(app)
        .get(`/api/messages/${user2.id}/${listing1.id}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/messages/:messageId/read - markAsRead', () => {
    let testMessage;

    beforeEach(async () => {
      testMessage = await Message.create({
        content: 'Test message for reading',
        senderId: user2.id,
        receiverId: user1.id,
        listingId: listing1.id,
        read: false
      });
    });

    it('повинен позначити повідомлення як прочитане', async () => {
      const response = await request(app)
        .patch(`/api/messages/${testMessage.id}/read`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Перевіряємо в базі даних
      const updatedMessage = await Message.findByPk(testMessage.id);
      expect(updatedMessage.read).toBe(true);
    });

    it('повинен повернути помилку при неіснуючому повідомленні', async () => {
      const response = await request(app)
        .patch('/api/messages/99999/read')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Повідомлення не знайдено');
    });

    it('повинен повернути помилку при спробі позначити чуже повідомлення', async () => {
      const response = await request(app)
        .patch(`/api/messages/${testMessage.id}/read`)
        .set('Authorization', `Bearer ${token2}`); // user2 намагається позначити повідомлення для user1

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Доступ заборонено');
    });
  });

  describe('GET /api/messages/unread - getUnreadCount', () => {
    beforeEach(async () => {
      // Створення непрочитаних повідомлень для user1
      await Message.create({
        content: 'Unread message 1',
        senderId: user2.id,
        receiverId: user1.id,
        listingId: listing1.id,
        read: false
      });

      await Message.create({
        content: 'Unread message 2',
        senderId: user3.id,
        receiverId: user1.id,
        listingId: listing2.id,
        read: false
      });

      // Прочитане повідомлення
      await Message.create({
        content: 'Read message',
        senderId: user2.id,
        receiverId: user1.id,
        listingId: listing1.id,
        read: true
      });
    });

    it('повинен повернути кількість непрочитаних повідомлень', async () => {
      const response = await request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.unreadCount).toBe(2);
    });

    it('повинен повернути 0 для користувача без непрочитаних повідомлень', async () => {
      const response = await request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(200);
      expect(response.body.unreadCount).toBe(0);
    });

    it('повинен повернути помилку при відсутності токена', async () => {
      const response = await request(app)
        .get('/api/messages/unread');

      expect(response.status).toBe(403);
    });
  });

  describe('Інтеграційні тести - повний флоу чату', () => {
    it('повинен реалізувати повний сценарій обміну повідомленнями', async () => {
      // 1. User1 відправляє повідомлення User2 про listing1
      const sendResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: 'Привіт! Цікавить ваше оголошення.',
          receiverId: user2.id,
          listingId: listing1.id
        });
      expect(sendResponse.status).toBe(201);

      // 2. User2 перевіряє кількість непрочитаних повідомлень
      const unreadResponse = await request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${token2}`);
      expect(unreadResponse.status).toBe(200);
      expect(unreadResponse.body.unreadCount).toBe(1);

      // 3. User2 переглядає розмови
      const conversationsResponse = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${token2}`);
      expect(conversationsResponse.status).toBe(200);
      expect(conversationsResponse.body.length).toBe(1);
      expect(conversationsResponse.body[0].unreadCount).toBe(1);

      // 4. User2 читає повідомлення (автоматично позначаються як прочитані)
      const messagesResponse = await request(app)
        .get(`/api/messages/${user1.id}/${listing1.id}`)
        .set('Authorization', `Bearer ${token2}`);
      expect(messagesResponse.status).toBe(200);
      expect(messagesResponse.body.length).toBe(1);

      // 5. Перевіряємо, що кількість непрочитаних зменшилася
      const unreadAfterResponse = await request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${token2}`);
      expect(unreadAfterResponse.body.unreadCount).toBe(0);

      // 6. User2 відповідає
      const replyResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          content: 'Привіт! Так, оголошення актуальне.',
          receiverId: user1.id,
          listingId: listing1.id
        });
      expect(replyResponse.status).toBe(201);

      // 7. Перевіряємо, що в чаті тепер 2 повідомлення
      const finalMessagesResponse = await request(app)
        .get(`/api/messages/${user2.id}/${listing1.id}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(finalMessagesResponse.body.length).toBe(2);
    });
  });

  describe('Тести валідації та edge cases', () => {
    it('повинен обробити некоректні параметри в URL', async () => {
      const response = await request(app)
        .get('/api/messages/invalid/invalid')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(500);
    });

    it('повинен обробити відсутність обов\'язкових полів при відправці', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: 'Test message'
          // відсутні receiverId та listingId
        });

      expect(response.status).toBe(404);
    });

    it('повинен обробити порожній контент повідомлення', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          content: '',
          receiverId: user2.id,
          listingId: listing1.id
        });

      expect(response.status).toBe(201);
    });
  });
});