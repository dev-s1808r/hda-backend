require("dotenv").config();

module.exports = {
  port: process.env.PORT,
  dbUrl: process.env.DB_URL,
  staticPath: process.env.STATIC_PATH,
  jwtSecret: process.env.JWT_SECRET,
  baseUrl: process.env.BASE_URL,
  scanPassword: process.env.SCAN_PASSWORD,
  localUrl: process.env.LOCAL_STATIC_URL,
  liveUrl: process.env.LIVE_STATIC_URL,
};
