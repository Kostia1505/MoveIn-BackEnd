// src/config/database.js (модифікований для підтримки тестування)
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

let dbUrl = process.env.DB_URL;

// Використовуємо окрему тестову базу даних для тестів
if (process.env.NODE_ENV === 'test') {
  dbUrl = process.env.TEST_DB_URL || 'postgres://postgres:ROKSA2001@localhost:5432/movein_test';
}

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV !== 'test', // Вимикаємо логування в режимі тестування
});

module.exports =  sequelize;