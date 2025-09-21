// backend/src/controllers/emailSettingsController.js
const EmailSettings = require("../models/EmailSettings");

async function getSettings(req, res) {
  try {
    const settings = await EmailSettings.findOne({ userId: req.userId });
    res.json(settings || {}); // return empty object if none exist
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateSettings(req, res) {
  try {
    const { smtpHost, smtpPort, secure, user, pass, senderName, replyTo } = req.body;

    const settings = await EmailSettings.findOneAndUpdate(
      { userId: req.userId },  // scoped to logged-in user
      { smtpHost, smtpPort, secure, user, pass, senderName, replyTo, userId: req.userId },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getSettings, updateSettings };
