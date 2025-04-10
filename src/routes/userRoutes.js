const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/me/listings', authMiddleware, userController.getMyListings);
router.patch('/me/profile', authMiddleware, userController.updateProfile);
router.get('/me/favorites', authMiddleware, userController.getFavorites);
router.post('/me/favorites/:listingId', authMiddleware, userController.addToFavorites);
router.delete('/me/favorites/:listingId', authMiddleware, userController.removeFromFavorites);


module.exports = router;
