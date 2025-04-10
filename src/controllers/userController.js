const User = require('../models/user');
const Listing = require('../models/listing');
const Favorite = require('../models/favorite');

// GET /me/listings
exports.getMyListings = async (req, res) => {
  const listings = await Listing.findAll({ where: { ownerId: req.user.id } });
  res.json(listings);
};

// PATCH /me/profile
exports.updateProfile = async (req, res) => {
    try {
      const { phone, avatar } = req.body;
  
      await User.update(
        { phone, avatar },
        { where: { id: req.user.id } }
      );
  
      res.json({ message: 'Профіль оновлено' });
    } catch (error) {
      res.status(500).json({ error: 'Не вдалося оновити профіль' });
    }
  };

// GET /me/favorites
exports.getFavorites = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    include: [{ association: 'favorites' }]
  });
  res.json(user.favorites);
};
// POST /me/favorites/:listingId — додати до вподобань
exports.addToFavorites = async (req, res) => {
    const { listingId } = req.params;
    const userId = req.user.id;
  
    try {
      await Favorite.findOrCreate({
        where: {
          userId,
          listingId
        }
      });
  
      res.json({ message: 'Додано до вподобань' });
    } catch (error) {
      res.status(500).json({ error: 'Помилка при додаванні' });
    }
  };
  
  // DELETE /me/favorites/:listingId — прибрати з вподобань
  exports.removeFromFavorites = async (req, res) => {
    const { listingId } = req.params;
    const userId = req.user.id;
  
    try {
      const deleted = await Favorite.destroy({
        where: {
          userId,
          listingId
        }
      });
  
      if (deleted) {
        res.json({ message: 'Видалено з вподобань' });
      } else {
        res.status(404).json({ message: 'Не знайдено в уподобаннях' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Помилка при видаленні' });
    }
  };