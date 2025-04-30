const { DataTypes } = require('sequelize');
const  sequelize  = require('../config/database');

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true, },
  avatar: { type: DataTypes.TEXT, allowNull: true, }
});

module.exports = User;