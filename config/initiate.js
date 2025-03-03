const mongoose = require("mongoose");
const { dbUrl, port } = require("./config");

function initiate(app) {
  mongoose
    .connect(dbUrl)
    .then(() => {
      console.log("Database connected");
      app.listen(port, () => {
        console.log(`Initiated on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error("Database connection failed:", error);
    });
}

module.exports = initiate;
