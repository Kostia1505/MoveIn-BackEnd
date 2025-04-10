const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');
const Listing = require('./listing');

const Favorite = sequelize.define('Favorite', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  listingId: { type: DataTypes.INTEGER, primaryKey: true }
});

User.belongsToMany(Listing, { through: Favorite, foreignKey: 'userId', as: 'favorites' });
Listing.belongsToMany(User, { through: Favorite, foreignKey: 'listingId' });

module.exports = Favorite;