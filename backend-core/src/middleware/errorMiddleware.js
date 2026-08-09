import process from 'node:process';
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    message = 'Resource not found';
    statusCode = 404;
  }

  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }

  // Always log the exact stack trace to the Cloudflare Worker console
  console.error(`[Express Error Handler] Caught a 500 error on ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: err.stack, // Explicitly exposed for debugging the Cloudflare migration
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
