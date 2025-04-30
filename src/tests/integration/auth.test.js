// tests/integration/auth.test.js
const request = require('supertest');
const  sequelize  = require('../../../src/config/database');
const app = require('../../../index');
const User = require('../../../src/models/user');

describe('Інтеграційні тести авторизації', () => {
  // Тестові дані
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  // Виконати перед усіма тестами
  beforeAll(async () => {
    // Синхронізуємо базу даних в тестовому режимі
    await sequelize.sync({ force: true });
  });

  // Виконати після всіх тестів
  afterAll(async () => {
    // Закриваємо з'єднання з базою даних
    await sequelize.close();
  });

  // Виконати після кожного тесту
  afterEach(async () => {
    // Очищаємо таблицю користувачів після кожного тесту
    await User.destroy({ where: {}, force: true});
  });

  // Тест реєстрації користувача
  describe('POST /api/auth/register', () => {
    it('повинен зареєструвати нового користувача та повернути токен', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Перевіряємо статус відповіді
      expect(response.status).toBe(200);
      // Перевіряємо наявність токена
      expect(response.body).toHaveProperty('token');
      // Перевіряємо що токен є непустим рядком
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('повинен повернути помилку, якщо користувач вже існує', async () => {
      // Спочатку реєструємо користувача
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Намагаємося зареєструвати того ж користувача знову
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Перевіряємо статус помилки
      expect(response.status).toBe(400);
      // Перевіряємо повідомлення про помилку
      expect(response.body).toHaveProperty('error', 'User already exists');
    });

    it('повинен повернути помилку, якщо не вказані обов\'язкові поля', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'test' }); // Відсутні email і password

      // Перевіряємо статус помилки
      expect(response.status).toBe(400);
    });
  });

  // Тест авторизації користувача
  describe('POST /api/auth/login', () => {
    it('повинен авторизувати користувача та повернути токен', async () => {
      // Спочатку реєструємо користувача
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Намагаємося авторизуватися
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      // Перевіряємо статус відповіді
      expect(response.status).toBe(200);
      // Перевіряємо наявність токена
      expect(response.body).toHaveProperty('token');
      // Перевіряємо що токен є непустим рядком
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('повинен повернути помилку при неправильних облікових даних', async () => {
      // Спочатку реєструємо користувача
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Намагаємося авторизуватися з неправильним паролем
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      // Перевіряємо статус помилки
      expect(response.status).toBe(401);
      // Перевіряємо повідомлення про помилку
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('повинен повернути помилку, якщо користувач не існує', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        });

      // Перевіряємо статус помилки
      expect(response.status).toBe(401);
      // Перевіряємо повідомлення про помилку
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  // Тест на використання токена для захищених маршрутів
  describe('Тестування захищених маршрутів з JWT', () => {
    it('повинен надати доступ до захищеного маршруту з валідним токеном', async () => {
      // Спочатку реєструємо користувача
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const token = registerResponse.body.token;

      // Спробуємо отримати доступ до захищеного маршруту
      const response = await request(app)
        .get('/me/listings')
        .set('Authorization', `Bearer ${token}`);

      // Перевіряємо успішний доступ
      expect(response.status).toBe(200);
    });

    it('повинен відмовити в доступі до захищеного маршруту без токена', async () => {
      // Спробуємо отримати доступ до захищеного маршруту без токена
      const response = await request(app)
        .get('/me/listings');

      // Перевіряємо відмову в доступі
      expect(response.status).toBe(403);
    });

    it('повинен відмовити в доступі з недійсним токеном', async () => {
      // Спробуємо отримати доступ до захищеного маршруту з недійсним токеном
      const response = await request(app)
        .get('/me/listings')
        .set('Authorization', 'Bearer invalidtoken');

      // Перевіряємо відмову в доступі
      expect(response.status).toBe(403);
    });
  });
});