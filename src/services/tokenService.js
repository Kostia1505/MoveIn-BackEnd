const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

module.exports = { generateAccessToken, generateRefreshToken };
