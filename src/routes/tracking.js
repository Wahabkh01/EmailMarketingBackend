const express = require("express");
const router = express.Router();
const Campaign = require("../models/Campaign");

// Open Tracking Pixel
router.get("/open/:campaignId/:recipient", async (req, res) => {
  try {
    const { campaignId, recipient } = req.params;
    const campaign = await Campaign.findById(campaignId);

    if (campaign) {
      campaign.openedCount += 1;
      await campaign.save();
    }

    // Return a transparent 1x1 pixel image
    const img = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApwBHyoF3jQAAAAASUVORK5CYII=",
      "base64"
    );
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": img.length,
    });
    res.end(img);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Click Tracking
router.get("/click/:campaignId/:recipient", async (req, res) => {
  try {
    const { campaignId, recipient } = req.params;
    const { url } = req.query;

    const campaign = await Campaign.findById(campaignId);

    if (campaign) {
      campaign.clickedCount += 1;
      await campaign.save();
    }

    // Redirect to actual link
    return res.redirect(url);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
