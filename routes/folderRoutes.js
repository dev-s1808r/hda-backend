const { folder } = require("../controllers");

const router = require("express").Router();

router.post("/scan-static", folder.scanForVideos);
router.get("/scan-static", folder.getContent);
router.get("/scan-static/touched", folder.getTouchedContent);
router.get("/get-db-meta", folder.getDbMeta);

module.exports = router;
