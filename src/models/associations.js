const User = require('./user');
const Listing = require('./listing');
const Review = require('./review');
const Favorite = require('./favorite');
const Message = require('./message');

// Асоціації для User
User.hasMany(Listing, { foreignKey: 'ownerId' });
User.hasMany(Review, { foreignKey: 'userId' });

// Асоціації для Listing
Listing.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Listing.hasMany(Review, { foreignKey: 'listingId' });

// Асоціації для Review
Review.belongsTo(User, { foreignKey: 'userId' });
Review.belongsTo(Listing, { foreignKey: 'listingId' });

// Асоціації для Favorite
User.belongsToMany(Listing, { through: Favorite, foreignKey: 'userId', as: 'favorites' });
Listing.belongsToMany(User, { through: Favorite, foreignKey: 'listingId' });

// Асоціації для Message
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
Message.belongsTo(Listing, { foreignKey: 'listingId' });

module.exports = {
  User,
  Listing,
  Review,
  Favorite,
  Message
};