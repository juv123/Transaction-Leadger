const AppError = require('./AppError');

const TYPES = ['credit', 'debit'];

const checkType = (type) => {
  if (!TYPES.includes(type)) {
    throw new AppError('type must be credit or debit', 400);
  }
};

const checkAmount = (amount) => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError('amount must be a number greater than 0', 400);
  }
};

// returns the trimmed reference id
const checkReference = (reference_id) => {
  if (typeof reference_id !== 'string' || reference_id.trim() === '') {
    throw new AppError('reference_id is required', 400);
  }
  return reference_id.trim();
};

const checkDescription = (description) => {
  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new AppError('description must be a string', 400);
  }
};

module.exports = { TYPES, checkType, checkAmount, checkReference, checkDescription };
