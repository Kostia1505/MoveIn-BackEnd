const { body } = require('express-validator');

module.exports = [
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Рейтинг повинен бути від 1 до 5'),
  body('comment')
    .trim()
    .isLength({ min: 10 }).withMessage('Коментар повинен містити мінімум 10 символів'),
  body('listingId')
    .isInt().withMessage('Невірний ідентифікатор оголошення')
];