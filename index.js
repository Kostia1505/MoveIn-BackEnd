const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const sequelize = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Використання CORS
app.use(cors());
app.use(express.json());

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

sequelize.sync()
  .then(() => console.log('Database connected'))
  .catch(err => console.log('Database error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
