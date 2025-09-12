const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
  type: { type: String, enum: ["open", "click", "bounce"] },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Event", eventSchema);
