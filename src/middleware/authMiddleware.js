const jwt = require('jsonwebtoken');

// Секретний ключ для підпису токена (краще зберігати у .env)
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// Мідлвар для перевірки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Перевірка чи є заголовок авторизації
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Верифікація токена
    const decoded = jwt.verify(token, SECRET_KEY);

    // Додаємо користувача в запит
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authenticateToken;
