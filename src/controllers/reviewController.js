const { Review, Listing, User } = require('../models/associations');
const { validationResult } = require('express-validator');

exports.createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const review = await Review.create({
      ...req.body,
      userId: req.user.id
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { listingId: req.params.listingId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'avatar']
      }]
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Відгук не знайдено' });
    if (review.userId !== req.user.id) return res.status(403).json({ error: 'Доступ заборонено' });
    
    await review.update(req.body);
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Відгук не знайдено' });
    if (review.userId !== req.user.id) return res.status(403).json({ error: 'Доступ заборонено' });
    
    await review.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
};