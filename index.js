const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const markdownIt = require("markdown-it");
const validator = require("email-validator");
const path = require("path");

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
  service: "Gmail", // Replace with "Outlook" or others
  auth: {
    user: process.env.email,
    pass: process.env.pass,
  },
});

const md = new markdownIt(); // Markdown parser

// Render the Emailer Form
app.get("/", (req, res) => {
  res.render("emailer");
});

// Handle Email Sending
app.post("/sendEmails", async (req, res) => {
  const { recipients, subject, content, contentType, schedule, personalizationTags } = req.body;

  try {
    // Validate and sanitize recipients
    const recipientList = recipients.split(",").map((email) => email.trim());
    const validRecipients = Array.from(new Set(recipientList.filter(validator.validate)));

    if (validRecipients.length === 0) {
      return res.status(400).send("No valid recipients provided.");
    }

    // Process content type
    let processedContent;
    if (contentType === "markdown") {
      processedContent = md.render(content);
    } else if (contentType === "html") {
      processedContent = content;
    } else {
      processedContent = content.replace(/\n/g, "<br>");
    }

    // Parse personalization tags
    const tags = personalizationTags ? JSON.parse(personalizationTags) : {};

    // Schedule email sending
    const sendTime = schedule ? new Date(schedule) : new Date();
    if (sendTime > new Date()) {
      console.log(`Emails scheduled to send at ${sendTime}`);
      setTimeout(() => {
        sendEmails(validRecipients, subject, processedContent, tags);
      }, sendTime - new Date());
      return res.send("Emails scheduled successfully.");
    }

    // Send emails immediately
    await sendEmails(validRecipients, subject, processedContent, tags);
    res.send("Emails sent successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while sending emails.");
  }
});

// Send Emails Function
const sendEmails = async (recipients, subject, content, tags) => {
  for (const recipient of recipients) {
    let personalizedContent = content;
    for (const [tag, values] of Object.entries(tags)) {
      personalizedContent = personalizedContent.replace(new RegExp(`{{${tag}}}`, "g"), values[recipient] || "");
    }

    await transporter.sendMail({
      from: '"Your Name" <your-email@gmail.com>',
      to: recipient,
      subject,
      html: personalizedContent,
    });
    console.log(`Email sent to ${recipient}`);
  }
};

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});