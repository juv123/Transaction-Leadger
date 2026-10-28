const AppError = require('../utils/AppError');
const ledger = require('../services/ledgerService');
const { checkAmount, checkReference, checkDescription } = require('../utils/validate');

const createTransfer = (req, res) => {
  const { from_account_id, to_account_id, amount, description, reference_id } = req.body;

  if (!from_account_id || typeof from_account_id !== 'string') {
    throw new AppError('from_account_id is required', 400);
  }
  if (!to_account_id || typeof to_account_id !== 'string') {
    throw new AppError('to_account_id is required', 400);
  }
  if (from_account_id === to_account_id) {
    throw new AppError('Cannot transfer to the same account', 400);
  }
  checkAmount(amount);
  checkDescription(description);
  const reference = checkReference(reference_id);

  const result = ledger.transfer(from_account_id, to_account_id, amount, description, reference);

  res.status(201).json({ success: true, data: result });
};

module.exports = { createTransfer };
