// tests/integration/listings.test.js
const request = require('supertest');
const sequelize = require('../../../src/config/database');
const app = require('../../../index');
const User = require('../../../src/models/user');
const Listing = require('../../../src/models/listing');
const jwt = require('jsonwebtoken');

describe('Інтеграційні тести оголошень', () => {
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
  });

  // Виконати після всіх тестів
  afterAll(async () => {
    // Закриваємо з'єднання з базою даних
    await sequelize.close();
  });

  // Очищаємо таблицю оголошень після кожного тесту
  afterEach(async () => {
    await Listing.destroy({ where: {}, force: true });
  });

  // Тест отримання всіх оголошень
  describe('GET /api/listings', () => {
    it('повинен повернути порожній масив, якщо оголошень немає', async () => {
      const response = await request(app).get('/api/listings');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    it('повинен повернути список оголошень', async () => {
      // Створюємо тестове оголошення
      await Listing.create({
        ...testListing,
        ownerId: userId
      });

      const response = await request(app).get('/api/listings');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe(testListing.title);
      expect(response.body[0].owner).toBeDefined();
      expect(response.body[0].owner.id).toBe(userId);
    });
  });

  // Тест пошуку оголошень
  describe('GET /api/listings/search', () => {
    beforeEach(async () => {
      // Створюємо кілька оголошень для тестування пошуку
      await Listing.create({
        ...testListing,
        ownerId: userId
      });

      await Listing.create({
        title: 'Затишний будинок',
        description: 'Приватний будинок за містом',
        price: 25000,
        location: 'Київська область, Буча',
        operationType: 'sale',
        propertyType: 'house',
        rooms: 4,
        floors: 2,
        ownerId: userId
      });
    });

    it('повинен знайти оголошення за типом операції', async () => {
      const response = await request(app)
        .get('/api/listings/search?operationType=rent');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].operationType).toBe('rent');
    });

    it('повинен знайти оголошення за типом нерухомості', async () => {
      const response = await request(app)
        .get('/api/listings/search?propertyType=house');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].propertyType).toBe('house');
    });

    it('повинен знайти оголошення за місцем розташування', async () => {
      const response = await request(app)
        .get('/api/listings/search?location=Київ');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].location).toContain('Київ');
    });

    it('повинен знайти оголошення за діапазоном цін', async () => {
      const response = await request(app)
        .get('/api/listings/search?minPrice=20000&maxPrice=30000');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(parseFloat(response.body[0].price)).toBeGreaterThanOrEqual(20000);
      expect(parseFloat(response.body[0].price)).toBeLessThanOrEqual(30000);
    });

    it('повинен повернути помилку для недійсних параметрів пошуку', async () => {
      const response = await request(app)
        .get('/api/listings/search?minPrice=invalid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  // Тест отримання конкретного оголошення
  describe('GET /api/listings/:id', () => {
    beforeEach(async () => {
      // Створюємо тестове оголошення
      const listing = await Listing.create({
        ...testListing,
        ownerId: userId
      });
      listingId = listing.id;
    });

    it('повинен отримати конкретне оголошення за id', async () => {
      const response = await request(app)
        .get(`/api/listings/${listingId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(listingId);
      expect(response.body.title).toBe(testListing.title);
      expect(response.body.owner).toBeDefined();
      expect(response.body.owner.id).toBe(userId);
    });

    it('повинен повернути помилку, якщо оголошення не існує', async () => {
      const response = await request(app)
        .get('/api/listings/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Тест створення оголошення
  describe('POST /api/listings', () => {
    it('повинен створити нове оголошення з валідним токеном', async () => {
      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${token}`)
        .send(testListing);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(testListing.title);
      expect(response.body.ownerId).toBe(userId);
    });

    it('повинен повернути помилку при спробі створення оголошення без авторизації', async () => {
      const response = await request(app)
        .post('/api/listings')
        .send(testListing);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('повинен повернути помилку при спробі створення оголошення з неповними даними', async () => {
      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Тільки заголовок'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Тест оновлення оголошення
  describe('PUT /api/listings/:id', () => {
    beforeEach(async () => {
      // Створюємо тестове оголошення
      const listing = await Listing.create({
        ...testListing,
        ownerId: userId
      });
      listingId = listing.id;
    });

    it('повинен оновити оголошення з валідним токеном власника', async () => {
      const updatedData = {
        title: 'Оновлений заголовок',
        price: 20000
      };

      const response = await request(app)
        .put(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(listingId);
      expect(response.body.title).toBe(updatedData.title);
      expect(parseFloat(response.body.price)).toBe(updatedData.price);
    });

    it('повинен повернути помилку при спробі оновлення оголошення без авторизації', async () => {
      const response = await request(app)
        .put(`/api/listings/${listingId}`)
        .send({ title: 'Спроба оновлення' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('повинен повернути помилку при спробі оновлення неіснуючого оголошення', async () => {
      const response = await request(app)
        .put('/api/listings/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Спроба оновлення' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('повинен повернути помилку, якщо користувач не є власником оголошення', async () => {
      // Створюємо іншого тестового користувача
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: await require('bcrypt').hash('password123', 10)
      });

      // Генеруємо токен для іншого користувача
      const SECRET_KEY = process.env.SECRET_KEY || 'test_secret_key_for_tests_only';
      const otherToken = jwt.sign({ id: otherUser.id }, SECRET_KEY, { expiresIn: '1h' });

      const response = await request(app)
        .put(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Спроба оновлення' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Доступ заборонено');
    });
  });

  // Тест видалення оголошення
  describe('DELETE /api/listings/:id', () => {
    beforeEach(async () => {
      // Створюємо тестове оголошення
      const listing = await Listing.create({
        ...testListing,
        ownerId: userId
      });
      listingId = listing.id;
    });

    it('повинен видалити оголошення з валідним токеном власника', async () => {
      const response = await request(app)
        .delete(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Перевіряємо, що оголошення було видалено
      const listing = await Listing.findByPk(listingId);
      expect(listing).toBeNull();
    });

    it('повинен повернути помилку при спробі видалення оголошення без авторизації', async () => {
      const response = await request(app)
        .delete(`/api/listings/${listingId}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('повинен повернути помилку при спробі видалення неіснуючого оголошення', async () => {
      const response = await request(app)
        .delete('/api/listings/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('повинен повернути помилку, якщо користувач не є власником оголошення', async () => {
      // Створюємо іншого тестового користувача
      const otherUser = await User.create({
        username: 'otheruser2',
        email: 'other2@example.com',
        password: await require('bcrypt').hash('password123', 10)
      });

      // Генеруємо токен для іншого користувача
      const SECRET_KEY = process.env.SECRET_KEY || 'test_secret_key_for_tests_only';
      const otherToken = jwt.sign({ id: otherUser.id }, SECRET_KEY, { expiresIn: '1h' });

      const response = await request(app)
        .delete(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Доступ заборонено');
    });
  });
});