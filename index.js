console.clear();

const express = require("express");
const cors = require("cors");
const serveIndex = require("serve-index");
const initiate = require("./config/initiate");
const { staticPath } = require("./config/config");
const { errorHandler } = require("./utils/errorHandler");
const routes = require("./routes");
const app = express();

app.use(express.json());
app.use(cors());

app.use(
  "/static",
  express.static(staticPath),
  serveIndex(staticPath, { icons: true })
);

app.use("/folders", routes.folder);
app.use("/auth", routes.auth);
app.use("/users", routes.user);
app.use("/media", routes.media);
app.use("/speech", routes.speech);

app.use(errorHandler);

initiate(app);
