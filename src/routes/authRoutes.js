const express = require("express");
const passport = require("passport");
const { register, googleAuth } = require("../controllers/authController");

const router = express.Router();

// Маршрут для реєстрації
router.post("/register", register);

// Маршрут для Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Маршрут для обробки колбеку після авторизації через Google
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/" }), googleAuth);

module.exports = router;
