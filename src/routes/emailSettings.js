// backend/src/routes/emailSettings.js
const express = require("express");
const { getSettings, updateSettings } = require("../controllers/EmailSettingsController");
const router = express.Router();

router.get("/", getSettings);
router.post("/", updateSettings);

module.exports = router;
