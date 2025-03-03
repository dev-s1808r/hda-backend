class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log the error (can integrate with Winston or other logging libraries)

  console.log("Error occurred\n");
  console.error(`[${new Date().toISOString()}] ${err.name}: ${message}`);
  console.log(err.stack);
  console.log("\nError stack ends");

  // Send JSON response
  res.status(statusCode).json({
    status: "error",
    message,
  });
};

module.exports = { errorHandler, AppError };
