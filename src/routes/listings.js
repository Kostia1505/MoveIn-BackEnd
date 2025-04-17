const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { Sequelize } = require('sequelize');
const Listing = require('../models/listing');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

// Отримати всі оголошення з фільтрацією
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.findAll({ 
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'owner', attributes: ['id', 'username', 'avatar'] }]
    });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Пошук оголошень з фільтрами
const searchValidations = [
  query('operationType').optional().isIn(['sale', 'rent']),
  query('propertyType').optional().isIn(['apartment', 'house']),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('rooms').optional().isInt({ min: 1 }),
  query('floors').optional().isInt({ min: 1 })
];

router.get('/search', searchValidations, async (req, res) => {
  try {
    // Валідація параметрів
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      operationType,
      propertyType,
      location,
      minPrice,
      maxPrice,
      rooms,
      floors
    } = req.query;

    const whereClause = {};
    
    // Побудова умов пошуку
    if (operationType) whereClause.operationType = operationType;
    if (propertyType) whereClause.propertyType = propertyType;
    if (location) whereClause.location = { [Sequelize.Op.iLike]: `%${location}%` };
    
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[Sequelize.Op.gte] = minPrice;
      if (maxPrice) whereClause.price[Sequelize.Op.lte] = maxPrice;
    }
    
    if (rooms) whereClause.rooms = rooms;
    if (floors) whereClause.floors = floors;

    const listings = await Listing.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'owner',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(listings);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Помилка пошуку' });
  }
});

// Решта ендпоінтів залишаються без змін
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

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, price, location, operationType, propertyType, rooms, floors } = req.body;
    const newListing = await Listing.create({
      title,
      description,
      price,
      location,
      operationType,
      propertyType,
      rooms,
      floors,
      ownerId: req.user.id
    });
    res.status(201).json(newListing);
  } catch (error) {
    res.status(400).json({ error: 'Невірні дані' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Оголошення не знайдено' });
    
    if (listing.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    await listing.update(req.body);
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

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