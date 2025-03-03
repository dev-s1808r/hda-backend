const { media } = require("../controllers");

const router = require("express").Router();

router.get("/media/:mediaId", media.findMediaById);
router.patch("/assign-new-media", media.assignNewMedia);
router.patch("/mark-touched", media.markTouched);
router.patch("/update-media", media.updateMedia);
router.patch("/mark-verified", media.markVerified);

module.exports = router;
