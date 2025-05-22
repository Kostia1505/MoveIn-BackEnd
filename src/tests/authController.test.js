// src/tests/authController.test.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { register, login } = require('../controllers/authController');
const User = require('../models/user');

// Мокаємо залежності
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../models/user');

describe('AuthController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    // Очищаємо всі моки перед кожним тестом
    jest.clearAllMocks();
  });

  describe('register', () => {
    beforeEach(() => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
    });

    it('повинен успішно зареєструвати нового користувача', async () => {
      // Налаштовуємо моки
      const hashedPassword = 'hashedPassword123';
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      const mockToken = 'mockJwtToken';

      bcrypt.hash.mockResolvedValue(hashedPassword);
      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue(mockToken);

      // Викликаємо функцію
      await register(req, res);

      // Перевіряємо результати
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(User.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1 },
        process.env.SECRET_KEY || 'your_secret_key',
        { expiresIn: '1h' }
      );
      expect(res.json).toHaveBeenCalledWith({ token: mockToken });
    });

    it('повинен повернути помилку при спробі створити користувача, який вже існує', async () => {
      // Налаштовуємо мок для помилки
      const error = new Error('User already exists');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.create.mockRejectedValue(error);

      // Викликаємо функцію
      await register(req, res);

      // Перевіряємо результат
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
    });

    it('повинен обробити відсутні дані у запиті', async () => {
      req.body = {}; // Порожнє тіло запиту

      const error = new Error('Validation error');
      bcrypt.hash.mockRejectedValue(error);

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
    });

    it('повинен успішно авторизувати користувача з правильними даними', async () => {
      // Налаштовуємо моки
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword'
      };
      const mockToken = 'mockJwtToken';

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue(mockToken);

      // Викликаємо функцію
      await login(req, res);

      // Перевіряємо результати
      expect(User.findOne).toHaveBeenCalledWith({ 
        where: { email: 'test@example.com' } 
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1 },
        process.env.SECRET_KEY || 'your_secret_key',
        { expiresIn: '1h' }
      );
      expect(res.json).toHaveBeenCalledWith({ token: mockToken });
    });

    it('повинен повернути помилку при неіснуючому користувачі', async () => {
      // Користувач не знайдений
      User.findOne.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('повинен повернути помилку при неправильному паролі', async () => {
      // Налаштовуємо моки
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); // Неправильний пароль

      await login(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('повинен обробити помилку сервера', async () => {
      // Налаштовуємо мок для помилки бази даних
      const dbError = new Error('Database connection failed');
      User.findOne.mockRejectedValue(dbError);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Login failed' });
    });

    it('повинен обробити відсутні дані для входу', async () => {
      req.body = { email: 'test@example.com' }; // Відсутній пароль

      User.findOne.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword'
      });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });
  });

  describe('JWT токен', () => {
    it('повинен використовувати правильний SECRET_KEY', async () => {
      const originalEnv = process.env.SECRET_KEY;
      process.env.SECRET_KEY = 'test_secret_key';

      const mockUser = { id: 1 };
      const mockToken = 'testToken';

      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue(mockToken);

      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await register(req, res);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1 },
        'test_secret_key_for_tests_only',
        { expiresIn: '1h' }
      );

      // Відновлюємо оригінальне значення
      process.env.SECRET_KEY = originalEnv;
    });
  });
});