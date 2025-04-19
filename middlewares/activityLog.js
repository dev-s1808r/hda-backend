// middlewares/logActivity.js

const { ActivityLog } = require("../models/models");

const logActivity = async (req, res, next) => {
  res.on("finish", async () => {
    console.log("logging");
    try {
      await ActivityLog.create({
        userId: req.user?._id, // If you're using authentication
        action: `${req.method} ${req.originalUrl}`,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        metadata: {
          body: req.body,
          params: req.params,
          query: req.query,
        },
      });
    } catch (err) {
      console.error("Failed to log activity:", err.message);
    }
  });
  next();
};

module.exports = logActivity;
