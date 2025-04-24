const express = require('express');
const router = express.Router();
const controller = require('../controllers/reviewController');
const auth = require('../middleware/authMiddleware');
const validator = require('../middleware/reviewValidator');

router.post('/', auth, validator, controller.createReview);
router.get('/:listingId', controller.getReviews);
router.put('/:id', auth, validator, controller.updateReview);
router.delete('/:id', auth, controller.deleteReview);

module.exports = router;