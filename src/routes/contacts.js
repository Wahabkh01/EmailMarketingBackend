const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");

const upload = multer({ dest: "uploads/" });

// Normalize headers (backend version)
function normalizeHeader(header) {
  if (!header) return "";
  const normalized = header.toLowerCase().trim();
  
  const headerMappings = {
    'email address': 'email',
    'email_address': 'email',
    'e-mail': 'email',
    'mail': 'email',
    'first name': 'firstName',
    'first_name': 'firstName',
    'firstname': 'firstName',
    'fname': 'firstName',
    'last name': 'lastName',
    'last_name': 'lastName',
    'lastname': 'lastName',
    'lname': 'lastName',
    'surname': 'lastName',
    'full name': 'name',
    'full_name': 'name',
    'fullname': 'name',
    'phone number': 'phone',
    'phone_number': 'phone',
    'mobile': 'phone',
    'cell': 'phone',
    'telephone': 'phone',
    'company name': 'company',
    'company_name': 'company',
    'organization': 'company',
    'org': 'company'
  };

  return headerMappings[normalized] || normalized;
}

// Extract contact fields
function extractContact(row, normalizedHeaders) {
  let email = "";
  let firstName = row.firstName || "";
  let lastName = row.lastName || "";

  // Try to find email
  for (const key of Object.keys(row)) {
    if (
      key.toLowerCase().includes("email") &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[key])
    ) {
      email = row[key];
      break;
    }
  }

  // If full name provided but no first/last
  if (row.name && !firstName && !lastName) {
    const parts = row.name.split(" ");
    firstName = parts[0];
    if (parts.length > 1) lastName = parts.slice(1).join(" ");
  }

  return { firstName, lastName, email };
}


// =============================
// Get all contacts
// =============================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const contacts = await Contact.find({ ownerId: req.userId });
    res.json(contacts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// ... rest of your helpers unchanged ...

// =============================
// Upload CSV/Excel
// =============================
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const headers = sheet.length > 0 ? Object.keys(sheet[0]) : [];
    const normalizedHeaders = headers.map(normalizeHeader);

    const contacts = [];

    for (let row of sheet) {
      const normalizedRow = {};
      headers.forEach((h, i) => {
        normalizedRow[normalizedHeaders[i]] = row[h];
      });

      const { firstName, lastName, email } = extractContact(normalizedRow, normalizedHeaders);
      if (!email) continue;

      contacts.push({
        ownerId: req.userId,
        firstName,
        lastName,
        email: email.toLowerCase(),
        listName: req.body.listName || "Default List",
        status: "valid"
      });
    }

    if (contacts.length > 0) {
      const uniqueEmails = [...new Set(contacts.map(c => c.email))];

      const existing = await Contact.find({
        ownerId: req.userId,
        email: { $in: uniqueEmails }
      }).select("email");

      const existingEmails = new Set(existing.map(e => e.email));
      const newContacts = contacts.filter(c => !existingEmails.has(c.email));

      if (newContacts.length > 0) {
        await Contact.insertMany(newContacts);
      }

      fs.unlinkSync(filePath);

      return res.json({
        msg: "Contacts uploaded successfully",
        inserted: newContacts.length,
        skipped: contacts.length - newContacts.length,
      });
    }

    fs.unlinkSync(filePath);
    res.json({ msg: "No valid contacts found" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// =============================
// Get unique list names
// =============================
router.get("/lists", authMiddleware, async (req, res) => {
  try {
    const lists = await Contact.distinct("listName", { ownerId: req.userId });
    res.json(lists);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// =============================
// Get contacts by list
// =============================
router.get("/by-list/:listName", authMiddleware, async (req, res) => {
  try {
    const contacts = await Contact.find({
      ownerId: req.userId,
      listName: req.params.listName,
      status: "valid",
    }).select("firstName lastName email");
    res.json(contacts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// =============================
// Rename a list
// =============================
router.put("/lists/:oldName", authMiddleware, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ msg: "New name is required" });

    await Contact.updateMany(
      { ownerId: req.userId, listName: req.params.oldName },
      { $set: { listName: newName } }
    );

    res.json({ msg: "List renamed successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// =============================
// Delete a list (and its contacts)
// =============================
router.delete("/lists/:name", authMiddleware, async (req, res) => {
  try {
    await Contact.deleteMany({ ownerId: req.userId, listName: req.params.name });
    res.json({ msg: "List deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});


module.exports = router;
