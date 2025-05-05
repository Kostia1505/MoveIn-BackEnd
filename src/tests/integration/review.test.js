// tests/integration/review.test.js
const request = require('supertest');
const sequelize = require('../../../src/config/database');
const app = require('../../../index');
const User = require('../../../src/models/user');
const Listing = require('../../../src/models/listing');
const Review = require('../../../src/models/review');
const jwt = require('jsonwebtoken');

describe('Інтеграційні тести системи відгуків', () => {
  // Тестові дані
  let testUser, testListing, testToken, anotherUser, anotherToken;
  const SECRET_KEY = process.env.SECRET_KEY || 'my_super_secret_key';

  // Виконати перед усіма тестами
  beforeAll(async () => {
    // Синхронізуємо базу даних в тестовому режимі
    await sequelize.sync({ force: true });

    // Створюємо тестового користувача 1
    testUser = await User.create({
      username: 'reviewtester',
      email: 'review@example.com',
      password: 'password123'
    });
    
    // Створюємо тестового користувача 2
    anotherUser = await User.create({
      username: 'reviewer2',
      email: 'reviewer2@example.com',
      password: 'password123'
    });

    // Створюємо тестове оголошення
    testListing = await Listing.create({
      title: 'Test Apartment',
      description: 'A test apartment for review testing',
      price: 1000.00,
      location: 'Test City',
      operationType: 'rent',
      propertyType: 'apartment',
      rooms: 2,
      floors: 1,
      ownerId: testUser.id
    });

    // Генеруємо JWT токени для обох користувачів
    testToken = jwt.sign({ id: testUser.id }, SECRET_KEY, { expiresIn: '1h' });
    anotherToken = jwt.sign({ id: anotherUser.id }, SECRET_KEY, { expiresIn: '1h' });
  });

  // Виконати після всіх тестів
  afterAll(async () => {
    // Закриваємо з'єднання з базою даних
    await sequelize.close();
  });

  // Очищаємо таблицю відгуків після кожного тесту
  afterEach(async () => {
    await Review.destroy({ where: {}, force: true });
  });

  // Тест створення відгуку
  describe('POST /api/reviews', () => {
    it('повинен створити новий відгук для оголошення', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Це дуже хороше оголошення, рекомендую!',
        listingId: testListing.id
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(reviewData);

      // Перевіряємо статус відповіді
      expect(response.status).toBe(201);
      // Перевіряємо вміст відповіді
      expect(response.body).toHaveProperty('rating', 5);
      expect(response.body).toHaveProperty('comment', 'Це дуже хороше оголошення, рекомендую!');
      expect(response.body).toHaveProperty('listingId', testListing.id);
      expect(response.body).toHaveProperty('userId', anotherUser.id);
    });

    it('повинен повернути помилку при спробі створити відгук без авторизації', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Це дуже хороше оголошення, рекомендую!',
        listingId: testListing.id
      };

      const response = await request(app)
        .post('/api/reviews')
        .send(reviewData);

      // Перевіряємо статус помилки
      expect(response.status).toBe(403);
    });

    it('повинен повернути помилку при спробі створити відгук з некоректними даними', async () => {
      // Некоректний рейтинг
      const invalidReviewData = {
        rating: 6, // Рейтинг має бути від 1 до 5
        comment: 'Invalid review',
        listingId: testListing.id
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(invalidReviewData);

      // Перевіряємо статус помилки
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('повинен повернути помилку при спробі створити відгук з коротким коментарем', async () => {
      // Короткий коментар
      const shortCommentData = {
        rating: 4,
        comment: 'Short', // Коментар має бути мінімум 10 символів
        listingId: testListing.id
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(shortCommentData);

      // Перевіряємо статус помилки
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  // Тест отримання відгуків
  describe('GET /api/reviews/:listingId', () => {
    it('повинен отримати всі відгуки для певного оголошення', async () => {
      // Створюємо кілька тестових відгуків
      await Review.create({
        rating: 5,
        comment: 'Це дуже хороше оголошення, рекомендую!',
        listingId: testListing.id,
        userId: anotherUser.id
      });

      await Review.create({
        rating: 4,
        comment: 'Непогане оголошення, але є деякі недоліки.',
        listingId: testListing.id,
        userId: testUser.id
      });

      const response = await request(app)
        .get(`/api/reviews/${testListing.id}`);

      // Перевіряємо статус відповіді
      expect(response.status).toBe(200);
      // Перевіряємо кількість відгуків
      expect(response.body).toHaveLength(2);
      // Перевіряємо вміст відгуків
      expect(response.body[0]).toHaveProperty('rating');
      expect(response.body[0]).toHaveProperty('comment');
      expect(response.body[0]).toHaveProperty('User');
      expect(response.body[0].User).toHaveProperty('username');
    });

    it('повинен повернути порожній масив, якщо для оголошення немає відгуків', async () => {
      const response = await request(app)
        .get(`/api/reviews/${testListing.id}`);

      // Перевіряємо статус відповіді
      expect(response.status).toBe(200);
      // Перевіряємо порожній масив
      expect(response.body).toHaveLength(0);
    });
  });

  // Тест оновлення відгуку
  describe('PUT /api/reviews/:id', () => {
    it('повинен оновити існуючий відгук', async () => {
      // Створюємо тестовий відгук
      const review = await Review.create({
        rating: 3,
        comment: 'Початковий текст відгуку для тестування оновлення',
        listingId: testListing.id,
        userId: anotherUser.id
      });

      const updatedData = {
        rating: 4,
        comment: 'Оновлений текст відгуку після повторного перегляду',
        listingId: testListing.id
      };

      const response = await request(app)
        .put(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(updatedData);

      // Перевіряємо статус відповіді
      expect(response.status).toBe(200);
      // Перевіряємо оновлені дані
      expect(response.body).toHaveProperty('rating', 4);
      expect(response.body).toHaveProperty('comment', 'Оновлений текст відгуку після повторного перегляду');
    });

    it('повинен повернути помилку при спробі оновити чужий відгук', async () => {
      // Створюємо тестовий відгук користувача 1
      const review = await Review.create({
        rating: 3,
        comment: 'Відгук користувача 1, який не повинен бути оновлений користувачем 2',
        listingId: testListing.id,
        userId: testUser.id
      });

      const updatedData = {
        rating: 1,
        comment: 'Спроба змінити чужий відгук',
        listingId: testListing.id
      };

      // Спроба оновити відгук користувачем 2
      const response = await request(app)
        .put(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(updatedData);

      // Перевіряємо статус помилки
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Доступ заборонено');
    });

    it('повинен повернути помилку при спробі оновити неіснуючий відгук', async () => {
      const nonExistentId = 9999;
      const updatedData = {
        rating: 4,
        comment: 'Спроба оновити неіснуючий відгук',
        listingId: testListing.id
      };

      const response = await request(app)
        .put(`/api/reviews/${nonExistentId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(updatedData);

      // Перевіряємо статус помилки
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Відгук не знайдено');
    });
  });

  // Тест видалення відгуку
  describe('DELETE /api/reviews/:id', () => {
    it('повинен видалити існуючий відгук', async () => {
      // Створюємо тестовий відгук
      const review = await Review.create({
        rating: 2,
        comment: 'Відгук для тестування видалення',
        listingId: testListing.id,
        userId: anotherUser.id
      });

      const response = await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      // Перевіряємо статус відповіді
      expect(response.status).toBe(204);

      // Перевіряємо, що відгук видалено з бази даних
      const deletedReview = await Review.findByPk(review.id);
      expect(deletedReview).toBeNull();
    });

    it('повинен повернути помилку при спробі видалити чужий відгук', async () => {
      // Створюємо тестовий відгук користувача 1
      const review = await Review.create({
        rating: 2,
        comment: 'Відгук користувача 1, який не повинен бути видалений користувачем 2',
        listingId: testListing.id,
        userId: testUser.id
      });

      // Спроба видалити відгук користувачем 2
      const response = await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      // Перевіряємо статус помилки
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Доступ заборонено');

      // Перевіряємо, що відгук не видалено з бази даних
      const stillExistingReview = await Review.findByPk(review.id);
      expect(stillExistingReview).not.toBeNull();
    });

    it('повинен повернути помилку при спробі видалити неіснуючий відгук', async () => {
      const nonExistentId = 9999;

      const response = await request(app)
        .delete(`/api/reviews/${nonExistentId}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      // Перевіряємо статус помилки
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Відгук не знайдено');
    });
  });

  // Додатковий тест: перевірка інтеграції з моделлю User
  describe('Інтеграція з моделями User та Listing', () => {
    it('повинен включати дані користувача при отриманні відгуків', async () => {
      // Створюємо тестовий відгук
      await Review.create({
        rating: 5,
        comment: 'Дуже гарне оголошення з чудовими умовами!',
        listingId: testListing.id,
        userId: anotherUser.id
      });

      const response = await request(app)
        .get(`/api/reviews/${testListing.id}`);

      // Перевіряємо статус відповіді
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      
      // Перевіряємо наявність даних користувача у відгуку
      expect(response.body[0]).toHaveProperty('User');
      expect(response.body[0].User).toHaveProperty('id', anotherUser.id);
      expect(response.body[0].User).toHaveProperty('username', anotherUser.username);
    });
  });

  // Додатковий тест: створення кількох відгуків одним користувачем
  describe('Множинні відгуки від одного користувача', () => {
    it('повинен дозволяти користувачу створювати кілька відгуків на різні оголошення', async () => {
      // Створюємо друге тестове оголошення
      const secondListing = await Listing.create({
        title: 'Second Test Apartment',
        description: 'Another test apartment',
        price: 1500.00,
        location: 'Test City',
        operationType: 'sale',
        propertyType: 'apartment',
        rooms: 3,
        floors: 2,
        ownerId: testUser.id
      });

      // Створюємо відгук на перше оголошення
      const firstReview = {
        rating: 4,
        comment: 'Відгук на перше оголошення від того самого користувача',
        listingId: testListing.id
      };

      const firstResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(firstReview);

      // Перевіряємо статус відповіді
      expect(firstResponse.status).toBe(201);

      // Створюємо відгук на друге оголошення
      const secondReview = {
        rating: 5,
        comment: 'Відгук на друге оголошення від того самого користувача',
        listingId: secondListing.id
      };

      const secondResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(secondReview);

      // Перевіряємо статус відповіді
      expect(secondResponse.status).toBe(201);

      // Перевіряємо, що обидва відгуки були створені
      const reviewsCount = await Review.count({
        where: { userId: anotherUser.id }
      });
      expect(reviewsCount).toBe(2);
    });
  });
});