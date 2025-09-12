// backend/src/services/emailService.js
const nodemailer = require("nodemailer");
const EmailSettings = require("../models/EmailSettings");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmail({ to, subject, html }) {
  try {
    if (!isValidEmail(to)) throw new Error(`Invalid email address: ${to}`);

    const settings = await EmailSettings.findOne().sort({ createdAt: -1 });
    if (!settings) throw new Error("SMTP settings not configured");

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.secure,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
    });

    await transporter.sendMail({
      from: `"${settings.senderName || settings.user}" <${settings.user}>`,
      to,
      replyTo: settings.replyTo || settings.user,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
    throw err;
  }
}

module.exports = { sendEmail };
