const media = require("./mediaRoutes");
const folder = require("./folderRoutes");
const auth = require("./authRoutes");
const user = require("./userRoutes");
const speech = require("./speechRoutes");
const logs = require("./logs");

module.exports = {
  media,
  folder,
  auth,
  user,
  speech,
  logs,
};
