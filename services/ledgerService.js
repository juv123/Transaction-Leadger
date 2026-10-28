const crypto = require('crypto');
const db = require('../config/db');
const AppError = require('../utils/AppError');

// Must be called inside a db.transaction so a failure rolls everything back
const applyTransaction = (accountId, { type, amount, description, reference_id }) => {
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
};

const addTransaction = db.transaction((accountId, data) => applyTransaction(accountId, data));

// debit one account and credit the other, both legs or nothing
const transfer = db.transaction((fromId, toId, amount, description, reference_id) => {
  const from = db.prepare('SELECT id FROM accounts WHERE id = ?').get(fromId);
  if (!from) throw new AppError('Sender account not found', 404);

  const to = db.prepare('SELECT id FROM accounts WHERE id = ?').get(toId);
  if (!to) throw new AppError('Receiver account not found', 404);

  const debitLeg = applyTransaction(fromId, {
    type: 'debit',
    amount,
    description: description || `Transfer to ${toId}`,
    reference_id,
  });

  const creditLeg = applyTransaction(toId, {
    type: 'credit',
    amount,
    description: description || `Transfer from ${fromId}`,
    reference_id,
  });

  return { from: debitLeg, to: creditLeg };
});

module.exports = { addTransaction, transfer };
