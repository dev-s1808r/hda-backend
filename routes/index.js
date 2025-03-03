const media = require("./mediaRoutes");
const folder = require("./folderRoutes");
const auth = require("./authRoutes");
const user = require("./userRoutes");
const speech = require("./speechRoutes");

module.exports = {
  media,
  folder,
  auth,
  user,
  speech,
};
