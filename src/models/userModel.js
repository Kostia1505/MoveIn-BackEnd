const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, // Пароль не потрібен для Google OAuth
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  googleId: {
    type: DataTypes.STRING, // 🔹 Додали googleId
    allowNull: true,
  },
}, { tableName: "users" });

module.exports = User;
