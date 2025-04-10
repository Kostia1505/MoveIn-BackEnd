const express = require('express');
const router = express.Router();
const Listing = require('../models/listing');
const authMiddleware = require('../middleware/authMiddleware');

// Отримати всі оголошення
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.findAll({ 
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'owner', attributes: ['id', 'username', 'avatar'] }] // Додано зв'язок з користувачем
    });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Отримати оголошення по ID
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'username', 'avatar'] }]
    });
    if (!listing) return res.status(404).json({ error: 'Оголошення не знайдено' });
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Створити оголошення (з автентифікацією)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, price, location } = req.body;
    const newListing = await Listing.create({
      title,
      description,
      price,
      location,
      ownerId: req.user.id // Використовуємо ID з токена
    });
    res.status(201).json(newListing);
  } catch (error) {
    res.status(400).json({ error: 'Невірні дані' });
  }
});

// Оновити оголошення (з перевіркою власника)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Оголошення не знайдено' });
    
    // Перевірка, чи користувач є власником
    if (listing.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    await listing.update(req.body);
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Видалити оголошення (з перевіркою власника)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Оголошення не знайдено' });

    if (listing.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    await listing.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;