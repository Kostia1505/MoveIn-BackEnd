// tests/integration/favorites.test.js
const request = require('supertest');
const sequelize = require('../../../src/config/database');
const app = require('../../../index');
const User = require('../../../src/models/user');
const Listing = require('../../../src/models/listing');
const Favorite = require('../../../src/models/favorite');
const jwt = require('jsonwebtoken');

describe('Інтеграційні тести обраних оголошень', () => {
  // Тестові дані
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  const testListing = {
    title: 'Чудова квартира',
    description: 'Простора квартира в центрі міста',
    price: 15000,
    location: 'Київ, вул. Хрещатик',
    operationType: 'rent',
    propertyType: 'apartment',
    rooms: 2,
    floors: 5
  };

  let token;
  let userId;
  let listingId;

  // Виконати перед усіма тестами
  beforeAll(async () => {
    // Синхронізуємо базу даних в тестовому режимі
    await sequelize.sync({ force: true });

    // Створюємо тестового користувача
    const hashedPassword = await require('bcrypt').hash(testUser.password, 10);
    const user = await User.create({
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword
    });
    userId = user.id;

    // Генеруємо токен для тестового користувача
    const SECRET_KEY = process.env.SECRET_KEY || 'test_secret_key_for_tests_only';
    token = jwt.sign({ id: userId }, SECRET_KEY, { expiresIn: '1h' });

    // Створюємо тестове оголошення
    const listing = await Listing.create({
      ...testListing,
      ownerId: userId
    });
    listingId = listing.id;
  });

  // Виконати після всіх тестів
  afterAll(async () => {
    // Закриваємо з'єднання з базою даних
    await sequelize.close();
  });

  // Очищаємо таблицю обраних після кожного тесту
  afterEach(async () => {
    await Favorite.destroy({ where: {}, force: true });
  });

  // Тест отримання обраних оголошень
  describe('GET /me/favorites', () => {
    it('повинен повернути порожній масив, якщо немає обраних оголошень', async () => {
      const response = await request(app)
        .get('/me/favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    it('повинен повернути список обраних оголошень', async () => {
      // Додаємо оголошення в обрані
      await Favorite.create({
        userId,
        listingId
      });

      const response = await request(app)
        .get('/me/favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(listingId);
      expect(response.body[0].title).toBe(testListing.title);
    });

    it('повинен повернути помилку при спробі отримання обраних без авторизації', async () => {
      const response = await request(app)
        .get('/me/favorites');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Тест додавання оголошення в обрані
  describe('POST /me/favorites/:listingId', () => {
    it('повинен додати оголошення в обрані', async () => {
      const response = await request(app)
        .post(`/me/favorites/${listingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Додано до вподобань');

      // Перевіряємо, що оголошення дійсно додано в обрані
      const favorite = await Favorite.findOne({
        where: {
          userId,
          listingId
        }
      });
      expect(favorite).not.toBeNull();
    });

    it('повинен повернути помилку при спробі додавання в обрані без авторизації', async () => {
      const response = await request(app)
        .post(`/me/favorites/${listingId}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('не повинен дублювати оголошення в обраних при повторному додаванні', async () => {
      // Додаємо оголошення в обрані вперше
      await request(app)
        .post(`/me/favorites/${listingId}`)
        .set('Authorization', `Bearer ${token}`);

      // Додаємо оголошення в обрані вдруге
      const response = await request(app)
        .post(`/me/favorites/${listingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Перевіряємо, що оголошення додано тільки один раз
      const count = await Favorite.count({
        where: {
          userId,
          listingId
        }
      });
      expect(count).toBe(1);
    });
  });

  // Тест видалення оголошення з обраних
  describe('DELETE /me/favorites/:listingId', () => {
    beforeEach(async () => {
      // Додаємо оголошення в обрані перед кожним тестом
      await Favorite.create({
        userId,
        listingId
      });
    });

    it('повинен видалити оголошення з обраних', async () => {
      const response = await request(app)
        .delete(`/me/favorites/${listingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Видалено з вподобань');

      // Перевіряємо, що оголошення дійсно видалено з обраних
      const favorite = await Favorite.findOne({
        where: {
          userId,
          listingId
        }
      });
      expect(favorite).toBeNull();
    });

    it('повинен повернути помилку при спробі видалення з обраних без авторизації', async () => {
      const response = await request(app)
        .delete(`/me/favorites/${listingId}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('повинен повернути 404, якщо оголошення не знайдено в обраних', async () => {
      // Видаляємо оголошення з обраних
      await Favorite.destroy({
        where: {
          userId,
          listingId
        }
      });

      const response = await request(app)
        .delete(`/me/favorites/${listingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Не знайдено в уподобаннях');
    });
  });
});