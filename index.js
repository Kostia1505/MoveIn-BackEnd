const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const sequelize = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const listings = require('./src/routes/listings');
const User = require('./src/models/user');
const Listing = require('./src/models/listing');
const Favorite = require('./src/models/favorite');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Використання CORS
app.use(cors());
app.use(express.json());

// Додайте ці рядки після імпортів
User.hasMany(Listing, { foreignKey: 'ownerId' });
Listing.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Основний маршрут для перевірки
app.get('/', (req, res) => {
  console.log('GET / endpoint hit'); // Лог для перевірки
  res.send('Welcome to the MoveIn API');
});

// Простий тестовий маршрут
app.get('/test', (req, res) => {
  console.log('GET /test endpoint hit');
  res.send('Test route is working!');
});

// Маршрути для аутентифікації
app.use('/api/auth', authRoutes);
// Маршрути для оголошень
app.use('/api/listings', listings);
// Маршрут кабінету
app.use(userRoutes)

sequelize.sync({ force: false }) // `force: true` для перестворення таблиць
  .then(() => {
    app.listen(3000, () => console.log('Сервер запущено на порті 3000'));
  })
  .catch(error => console.error('Помилка синхронізації:', error));
