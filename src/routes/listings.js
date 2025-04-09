const express = require('express');
const router = express.Router();
const db = require('../config/database');

//отримати всі оголошення
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM listings ORDER BY created_at DESC');
  res.json(result.rows);
});

//отримати одне оголошення
router.get('/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
});

//створити нове оголошення
router.post('/', async (req, res) => {
  const { title, description, price, location } = req.body;
  const result = await db.query(
    'INSERT INTO listings (title, description, price, location) VALUES ($1, $2, $3, $4) RETURNING *',
    [title, description, price, location]
  );
  res.status(201).json(result.rows[0]);
});

//оновити оголошення
router.put('/:id', async (req, res) => {
  const { title, description, price, location } = req.body;
  const result = await db.query(
    'UPDATE listings SET title = $1, description = $2, price = $3, location = $4 WHERE id = $5 RETURNING *',
    [title, description, price, location, req.params.id]
  );
  res.json(result.rows[0]);
});

//видалити оголошення
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

module.exports = router;