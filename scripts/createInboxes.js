// scripts/createInboxes.js
const { MailSlurp } = require("mailslurp-client");
const fs = require("fs");

const mailslurp = new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY });

(async () => {
  try {
    const inboxes = [];

    for (let i = 1; i <= 100; i++) {
      const inbox = await mailslurp.createInbox();
      console.log(`📧 Inbox ${i}: ${inbox.emailAddress}`);
      inboxes.push({ id: inbox.id, email: inbox.emailAddress });
    }

    // Save to file for later use
    fs.writeFileSync(
      "mailslurp-inboxes.json",
      JSON.stringify(inboxes, null, 2)
    );

    console.log("✅ Created 100 inboxes and saved to mailslurp-inboxes.json");
  } catch (err) {
    console.error("❌ Error creating inboxes:", err.message);
  }
})();
