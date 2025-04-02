const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const sequelize = require("./config/db"); 
const authRoutes = require("./routes/authRoutes");

dotenv.config();

const app = express();

// Налаштування CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Роут для аутентифікації
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Сервер працює!");
});

// Підключення до бази даних (БЕЗ запуску сервера!)
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Connected to PostgreSQL");
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
  });

module.exports = app; // Експортуємо app
