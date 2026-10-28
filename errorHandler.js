const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    const body = { success: false, message: err.message };
    if (err.data) body.data = err.data;
    return res.status(err.statusCode).json(body);
  }

  // bad json body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  // other body parser problems (payload too large etc)
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ success: false, message: 'Invalid request body' });
  }

  console.error(err);
  res.status(500).json({ success: false, message: 'Something went wrong' });
};

module.exports = { notFound, errorHandler };
