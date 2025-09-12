// backend/src/models/EmailSettings.js
const mongoose = require("mongoose");

const EmailSettingsSchema = new mongoose.Schema({
  smtpHost: { type: String, required: true },
  smtpPort: { type: Number, required: true, default: 587 },
  secure: { type: Boolean, default: false }, // true for 465, false for 587
  user: { type: String, required: true },
  pass: { type: String, required: true },
  senderName: { type: String, default: "" },
  replyTo: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("EmailSettings", EmailSettingsSchema);
