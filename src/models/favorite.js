const { DataTypes } = require('sequelize');
const  sequelize  = require('../config/database');
const User = require('./user');
const Listing = require('./listing');

const Favorite = sequelize.define('Favorite', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  listingId: { type: DataTypes.INTEGER, primaryKey: true }
});

module.exports = Favorite;