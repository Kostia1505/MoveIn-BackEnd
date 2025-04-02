const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
});

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL");

    await sequelize.sync({ alter: true }); // 🚀 Синхронізація моделей
    console.log("✅ Database synchronized!");
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
};

syncDatabase();

module.exports = sequelize;
