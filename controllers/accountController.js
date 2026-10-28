const crypto = require('crypto');
const db = require('../config/db');
const AppError = require('../utils/AppError');

const createAccount = (req, res) => {
  const name = req.body.name;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new AppError('name is required', 400);
  }

  const account = {
    id: crypto.randomUUID(),
    name: name.trim(),
    balance: 0,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    'INSERT INTO accounts (id, name, balance, created_at) VALUES (?, ?, ?, ?)'
  ).run(account.id, account.name, account.balance, account.created_at);

  res.status(201).json({ success: true, data: account });
};

const getBalance = (req, res) => {
  const account = db.prepare('SELECT id, balance FROM accounts WHERE id = ?').get(req.params.id);

  if (!account) {
    throw new AppError('Account not found', 404);
  }

  res.json({
    success: true,
    data: { account_id: account.id, balance: account.balance },
  });
};

module.exports = { createAccount, getBalance };
