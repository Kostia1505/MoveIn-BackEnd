const bcrypt = require('bcrypt');
const User = require('../models/userModel'); // БЕЗ { }
  // Підключення до моделі User
const { generateAccessToken, generateRefreshToken } = require('../services/tokenService');

exports.register = async (req, res) => {
  const { email, password, username } = req.body;  // Додаємо username до параметрів

  try {
    // Перевірка на наявність email, пароля та username
    if (!email || !password || !username) {
      return res.status(400).json({ message: "Email, password, and username are required" });
    }

    // Перевірка, чи є користувач з таким email або username
    const existingUser = await User.findOne({ where: { email } });
    const existingUsername = await User.findOne({ where: { username } });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    if (existingUsername) {
      return res.status(409).json({ message: "Username already taken" });
    }

    // Хешування пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Створення нового користувача з email, password та username
    const newUser = await User.create({ email, password: hashedPassword, username });

    // Генерація токенів
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Повертаємо токени
    res.status(201).json({ accessToken, refreshToken });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Функція для Google Auth
exports.googleAuth = (req, res) => {
  // Переконайся, що req.user містить дані користувача після авторизації через Google
  const accessToken = generateAccessToken(req.user);
  const refreshToken = generateRefreshToken(req.user);

  // Перенаправлення на фронтенд з токенами
  res.redirect(`${process.env.FRONTEND_URL}/auth/success?accessToken=${accessToken}&refreshToken=${refreshToken}`);
};
