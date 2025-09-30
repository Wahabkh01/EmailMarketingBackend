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
      // Add timeout configurations
      connectionTimeout: 20000,   // 10 seconds to establish connection
      greetingTimeout: 20000,     // 10 seconds to receive greeting
      socketTimeout: 60000,       // 30 seconds for socket inactivity
      // Add pool configuration for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
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
    console.error(`❌ Error sending email to ${to}:`, err.message);
    console.error("Error code:", err.code);
    console.error("Error command:", err.command);
    throw err;
  }
}

module.exports = { sendEmail };