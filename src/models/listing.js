const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

const Listing = sequelize.define('Listing', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  location: { type: DataTypes.STRING, allowNull: false },
  ownerId: { type: DataTypes.INTEGER, allowNull: false },
  operationType: { 
    type: DataTypes.ENUM('sale', 'rent'), 
    allowNull: false 
  },
  propertyType: { 
    type: DataTypes.ENUM('apartment', 'house'), 
    allowNull: false 
  },
  rooms: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  floors: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  }
});

User.hasMany(Listing, { foreignKey: 'ownerId' });
Listing.belongsTo(User, { foreignKey: 'ownerId' });
Listing.hasMany(require('./review'), { foreignKey: 'listingId' });
Listing.belongsTo(require('./user'), { foreignKey: 'ownerId' });

module.exports = Listing;