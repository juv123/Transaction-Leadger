const Database = require('better-sqlite3');

const db = new Database(process.env.DB_FILE || 'ledger.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount REAL NOT NULL CHECK (amount > 0),
    description TEXT,
    reference_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    UNIQUE (account_id, reference_id)
  );

  -- transactions are append only
  CREATE TRIGGER IF NOT EXISTS transactions_no_update
  BEFORE UPDATE ON transactions
  BEGIN
    SELECT RAISE(ABORT, 'Transactions cannot be modified');
  END;

  CREATE TRIGGER IF NOT EXISTS transactions_no_delete
  BEFORE DELETE ON transactions
  BEGIN
    SELECT RAISE(ABORT, 'Transactions cannot be deleted');
  END;
`);

module.exports = db;
