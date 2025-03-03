require("dotenv").config();

module.exports = {
  port: process.env.PORT,
  dbUrl: process.env.DB_URL,
  staticPath: process.env.STATIC_PATH,
  jwtSecret: process.env.JWT_SECRET,
  baseUrl: process.env.BASE_URL,
};
