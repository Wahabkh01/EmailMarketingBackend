// backend/src/routes/emailSettings.js
const express = require("express");
const { getSettings, updateSettings } = require("../controllers/EmailSettingsController");
const auth = require("../middleware/auth");

const router = express.Router();

// ✅ Protected routes (require JWT token)
router.get("/", auth, getSettings);
router.post("/", auth, updateSettings);

module.exports = router;
