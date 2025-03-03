const { user } = require("../controllers");

const router = require("express").Router();

router.get("/get-all-users", user.listUsers);
router.get("/get-current-user/:userId", user.getUserById);

module.exports = router;
