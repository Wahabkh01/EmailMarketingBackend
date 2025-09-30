const express = require("express");
const router = express.Router();
const Campaign = require("../models/Campaign");
const Contact = require("../models/Contact");
const authMiddleware = require("../middleware/auth");
const { sendEmail } = require("../services/emailService");
const mongoose = require("mongoose");

// =============================
// Create a campaign
// =============================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { subject, preheader, body, recipients, listName, scheduledAt } = req.body;
    let finalRecipients = [];

    if (recipients && recipients.length > 0) {
      finalRecipients = recipients.map((r) =>
        typeof r === "string" ? { email: r } : r
      );
    } else if (listName) {
      const contacts = await Contact.find({
        ownerId: req.userId,
        listName,
        status: "valid",
      });

      if (contacts.length === 0) {
        return res.status(400).json({ msg: "No contacts found for this list" });
      }

      finalRecipients = contacts.map((c) => ({
        email: c.email,
        firstName: c.firstName || "",
        lastName: c.lastName || "",
      }));
    } else {
      return res.status(400).json({
        msg: "Please provide either recipients[] or a listName",
      });
    }

    const campaign = new Campaign({
      userId: req.userId,
      subject,
      preheader,   // 👈 save preheader
      body,
      recipients: finalRecipients,
      scheduledAt,
      status: scheduledAt ? "scheduled" : "draft",
    });
    

    await campaign.save();
    res.json(campaign);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// =============================
// Get all campaigns for logged-in user
// =============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    res.json(campaigns);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// =============================
// Get single campaign by ID
// =============================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!campaign) return res.status(404).json({ msg: "Campaign not found" });

    res.json(campaign);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// =============================
// Update campaign by ID
// =============================
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { subject, preheader, body, recipients, scheduledAt } = req.body;

    // 🔹 find campaign first
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!campaign) {
      return res.status(404).json({ msg: "Campaign not found" });
    }

    // 🔹 now safely update fields
    if (subject !== undefined) campaign.subject = subject;
    if (preheader !== undefined) campaign.preheader = preheader;
    if (body !== undefined) campaign.body = body;
    if (scheduledAt !== undefined) campaign.scheduledAt = scheduledAt;

    // 🔹 recipients normalization
    if (Array.isArray(recipients)) {
      campaign.recipients = recipients.map((r) => {
        if (typeof r === "string") {
          return {
            email: r,
            body: campaign.body,
            firstName: "",
            lastName: "",
            opened: false,
            clicked: false,
          };
        }
        return {
          email: r.email,
          body: r.body || campaign.body,
          firstName: r.firstName || "",
          lastName: r.lastName || "",
          opened: false,
          clicked: false,
        };
      });
    }

    // 🔹 reset stats if already sent
    if (["sent", "sending", "completed"].includes(campaign.status)) {
      campaign.status = "draft";
      campaign.sentCount = 0;
      campaign.openedCount = 0;
      campaign.clickedCount = 0;

      campaign.recipients = campaign.recipients.map((r) => {
        const obj = r.toObject ? r.toObject() : r;
        return {
          ...obj,
          opened: false,
          clicked: false,
          firstName: obj.firstName || "",
          lastName: obj.lastName || "",
        };
      });
    }

    await campaign.save();
    res.json(campaign);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send("Server error");
  }
});


// =============================
// Delete campaign
// =============================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Campaign.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!deleted) {
      return res.status(404).json({ msg: "Campaign not found" });
    }

    res.json({ msg: "Campaign deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).send("Server error");
  }
});

// Enhanced tracking implementation for your campaigns route

// =============================
// Send campaign under 50s (short random delay)
// =============================
router.post("/:id/send", authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!campaign) return res.status(404).json({ msg: "Campaign not found" });
    if (!campaign.recipients || campaign.recipients.length === 0) {
      return res.status(400).json({ msg: "No recipients to send to" });
    }

    campaign.status = "sending";
    await campaign.save();

    // Respond immediately so Render doesn’t time out
    res.json({ msg: "Campaign sending started" });

    // Fire and forget (but short delays to avoid 50s timeout)
    (async () => {
      let sentCount = 0;
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));

      for (let recipient of campaign.recipients) {
        try {
          await sendEmail({
            to: recipient.email,
            subject: campaign.subject,
            html: campaign.body,
          });
          sentCount++;
          campaign.sentCount = sentCount;
          await campaign.save();

          // 🔥 Short random delay (100–500 ms) instead of minutes
          const randomDelay = Math.floor(Math.random() * 40) + 100;
          await delay(randomDelay);
        } catch (err) {
          console.error("❌ Failed to send:", recipient.email, err.message);
        }
      }

      campaign.status = "sent";
      await campaign.save();
      console.log("✅ Campaign finished:", campaign._id);
    })();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});


// =============================
// Analytics (fixed)
// =============================
router.get("/:id/analytics", authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!campaign) return res.status(404).json({ msg: "Campaign not found" });

    const totalRecipients = campaign.recipients.length;
    const totalSent = campaign.sentCount || 0;
    const totalOpened = campaign.recipients.filter(r => r.opened).length;
    const totalClicked = campaign.recipients.filter(r => r.clicked).length;

    // Split opens by proxy vs real
    const realOpens = campaign.recipients.filter(r => r.opened && !r.proxyType).length;
    const proxyOpens = campaign.recipients.filter(r => r.proxyType).length;

    // Calculate click-to-open ratio from real users
    const realClicks = campaign.recipients.filter(r => r.clicked && !r.proxyType).length;
    const ctorReal = realOpens > 0 ? realClicks / realOpens : 0.12; // fallback 12%

    // Estimate hidden opens for proxy users
    const proxyClicks = campaign.recipients.filter(r => r.clicked && r.proxyType).length;
    const estProxyOpens = ctorReal > 0 ? Math.round(proxyClicks / ctorReal) : 0;

    const adjustedOpens = realOpens + estProxyOpens;
    const adjustedOpenRate = totalRecipients ? (adjustedOpens / totalRecipients) * 100 : 0;

    res.json({
      totalRecipients,
      totalSent,
      totalOpened,
      totalClicked,
      realOpens,
      proxyOpens,
      estProxyOpens,
      openRate: totalRecipients ? (totalOpened / totalRecipients) * 100 : 0,
      adjustedOpenRate,
      clickRate: totalRecipients ? (totalClicked / totalRecipients) * 100 : 0,
      linkStats: campaign.linkStats || {}, // ✅ always return object
    });
    
  } catch (err) {
    console.error("Analytics error:", err.message);
    res.status(500).send("Server error");
  }
});



// =============================
// Enhanced open tracking endpoint
// =============================
router.get("/track/open/:campaignId/:recipientId", async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;
    const ua = req.headers['user-agent'] || "";
    const ip = req.ip;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).send("Campaign not found");

    const recipient = campaign.recipients.id(recipientId);
    if (!recipient) return res.status(404).send("Recipient not found");

    // Detect proxy opens
    let proxyType = null;
    if (/apple/i.test(ua) || /apple.*mail/i.test(ua)) proxyType = "apple";
    if (/googleimageproxy/i.test(ua)) proxyType = "gmail";

    // Mark open (deduped)
    if (!recipient.opened) {
      recipient.opened = true;
      recipient.openedAt = new Date();
      recipient.trackingMethod = proxyType ? "proxy" : "pixel";
      recipient.proxyType = proxyType;
      campaign.openedCount = campaign.recipients.filter(r => r.opened).length;
      campaign.markModified("recipients");
      await campaign.save();
      console.log(`📧 Open tracked for ${recipient.email} (${proxyType || "real"})`);
    }

    // Return 1×1 transparent PNG
    const transparentPixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NkYGBgAAAABQABDQottAAAAABJRU5ErkJggg==",
      "base64"
    );
    res.writeHead(200, { "Content-Type": "image/png", "Content-Length": transparentPixel.length });
    res.end(transparentPixel);

  } catch (err) {
    console.error("Open tracking error:", err);
    res.status(500).send("Server error");
  }
});

// =============================
// IMPROVED click tracking (also marks as opened)
// =============================
router.get("/track/click/:campaignId/:recipientId", async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;
    const { url, idx } = req.query;

    console.log(`🖱️ Click tracking: Campaign=${campaignId}, Recipient=${recipientId}, URL=${url}`);

    if (!url) {
      console.log("❌ Missing target URL");
      return res.status(400).send("Missing target URL");
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      console.log(`❌ Campaign not found: ${campaignId}`);
      return res.status(404).send("Campaign not found");
    }

    // Find recipient by ID or index
    let recipient = null;
    if (recipientId && recipientId !== 'undefined') {
      recipient = campaign.recipients.id(recipientId);
    }
    if (!recipient && idx !== undefined) {
      const index = parseInt(idx);
      if (index >= 0 && index < campaign.recipients.length) {
        recipient = campaign.recipients[index];
      }
    }

    if (!recipient) {
      console.log(`❌ Recipient not found: ID=${recipientId}, Index=${idx}`);
      return res.status(404).send("Recipient not found");
    }

    console.log(`👤 Click from: ${recipient.email}`);

    // Mark as opened if not already (click implies open)
    let wasNewOpen = false;
    if (!recipient.opened) {
      recipient.opened = true;
      recipient.openedAt = new Date();
      wasNewOpen = true;
    }

    // Mark as clicked if not already
    let wasNewClick = false;
    if (!recipient.clicked) {
      recipient.clicked = true;
      recipient.clickedAt = new Date();
      wasNewClick = true;
    }

    // Track clicked links
    if (!recipient.clickedLinks) recipient.clickedLinks = [];
    if (!recipient.clickedLinks.includes(url)) {
      recipient.clickedLinks.push(url);
    }

    // Update campaign-level counts
    if (wasNewOpen || wasNewClick) {
      const totalOpened = campaign.recipients.filter(r => r.opened).length;
      const totalClicked = campaign.recipients.filter(r => r.clicked).length;
      
      campaign.openedCount = totalOpened;
      campaign.clickedCount = totalClicked;
      
      campaign.markModified("recipients");
      await campaign.save();

      console.log(`✅ CLICK TRACKED: ${recipient.email} -> ${url}`);
      if (wasNewOpen) console.log(`✅ ALSO MARKED AS OPENED (Total opens: ${totalOpened})`);
      if (wasNewClick) console.log(`✅ NEW CLICK (Total clicks: ${totalClicked})`);
    }

    // Redirect to original URL
    return res.redirect(decodeURIComponent(url));
  } catch (err) {
    console.error("❌ Click tracking error:", err);
    res.status(500).send("Server error");
  }
});

// =============================
// TEST ENDPOINT: Manually trigger open tracking
// =============================
router.post("/test-open/:campaignId", authMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { email } = req.body;

    console.log(`🧪 TEST: Manual open for ${email} in campaign ${campaignId}`);

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ msg: "Campaign not found" });
    }

    // Find recipient by email
    const recipient = campaign.recipients.find(r => r.email === email);
    if (!recipient) {
      return res.status(404).json({ msg: "Recipient not found" });
    }

    if (!recipient.opened) {
      recipient.opened = true;
      recipient.openedAt = new Date();
      
      const totalOpened = campaign.recipients.filter(r => r.opened).length;
      campaign.openedCount = totalOpened;
      
      campaign.markModified("recipients");
      await campaign.save();

      console.log(`✅ TEST OPEN SUCCESSFUL: ${email} (Total opens: ${totalOpened})`);
      
      return res.json({ 
        msg: "Open tracked successfully", 
        email,
        opened: true,
        totalOpens: totalOpened
      });
    }
    
    return res.json({ 
      msg: "Already tracked as opened", 
      email,
      opened: true,
      totalOpens: campaign.openedCount
    });
  } catch (err) {
    console.error("❌ Test open error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;
