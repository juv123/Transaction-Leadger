const crypto = require('crypto');
const db = require('../config/db');
const AppError = require('../utils/AppError');

const TYPES = ['credit', 'debit'];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// runs as a single db transaction so balance + insert stay in sync
const processTransaction = db.transaction((accountId, body) => {
  const { type, amount, description, reference_id } = body;

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
  if (!account) {
    throw new AppError('Account not found', 404);
  }

  const duplicate = db
    .prepare('SELECT * FROM transactions WHERE account_id = ? AND reference_id = ?')
    .get(accountId, reference_id);
  if (duplicate) {
    throw new AppError('Transaction already exists', 409, duplicate);
  }

  if (type === 'debit' && account.balance < amount) {
    throw new AppError('Insufficient balance', 422, { balance: account.balance });
  }

  const newBalance = type === 'credit' ? account.balance + amount : account.balance - amount;
  db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(newBalance, accountId);

  const txn = {
    id: crypto.randomUUID(),
    account_id: accountId,
    type,
    amount,
    description: description || null,
    reference_id,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(txn.id, txn.account_id, txn.type, txn.amount, txn.description, txn.reference_id, txn.created_at);

  return { transaction: txn, balance: newBalance };
});

const addTransaction = (req, res) => {
  const { type, amount, description, reference_id } = req.body;

  if (!TYPES.includes(type)) {
    throw new AppError('type must be credit or debit', 400);
  }
  if (typeof amount !== 'number' || !(amount > 0)) {
    throw new AppError('amount must be a number greater than 0', 400);
  }
  if (!reference_id || typeof reference_id !== 'string' || reference_id.trim() === '') {
    throw new AppError('reference_id is required', 400);
  }

  const result = processTransaction(req.params.id, {
    type,
    amount,
    description,
    reference_id: reference_id.trim(),
  });

  res.status(201).json({ success: true, data: result });
};

const getTransactions = (req, res) => {
  const { type } = req.query;

  if (type && !TYPES.includes(type)) {
    throw new AppError('type must be credit or debit', 400);
  }

  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? DEFAULT_LIMIT : Number(req.query.limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError('page must be a positive integer', 400);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new AppError(`limit must be an integer between 1 and ${MAX_LIMIT}`, 400);
  }

  const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) {
    throw new AppError('Account not found', 404);
  }

  let where = 'WHERE account_id = ?';
  const params = [req.params.id];

  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM transactions ${where}`).get(...params);

  // rowid as tie breaker for entries created in the same millisecond
  const transactions = db
    .prepare(
      `SELECT * FROM transactions ${where}
       ORDER BY created_at DESC, rowid DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, (page - 1) * limit);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      current_page: page,
      page_size: limit,
      total_records: total,
      total_pages: Math.ceil(total / limit),
    },
  });
};

module.exports = { addTransaction, getTransactions };
