// backend/src/controllers/emailSettingsController.js
const EmailSettings = require("../models/EmailSettings");

async function getSettings(req, res) {
  try {
    const settings = await EmailSettings.findOne().sort({ createdAt: -1 });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateSettings(req, res) {
  try {
    const { smtpHost, smtpPort, secure, user, pass, senderName, replyTo } = req.body;

    const settings = await EmailSettings.findOneAndUpdate(
      {},
      { smtpHost, smtpPort, secure, user, pass, senderName, replyTo },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getSettings, updateSettings };
