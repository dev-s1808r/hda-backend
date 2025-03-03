const express = require("express");
const { speech } = require("../controllers"); // Adjust path if necessary

const router = express.Router();

router.post("/convert", speech.convertController);

module.exports = router;
