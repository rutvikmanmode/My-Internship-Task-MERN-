const express = require("express");
// Nodemailer is used to send emails from the request page "mail" button.
const nodemailer = require("nodemailer");

const Contact = require("../models/Contact");

const router = express.Router();
const EMAIL_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
    // Keep validation consistent with frontend rules.
    if (!email) {
        return "Email is required";
    }

    if (/\s/.test(email)) {
        return "Email must not contain spaces";
    }

    if (email.length < EMAIL_MIN_LENGTH || email.length > EMAIL_MAX_LENGTH) {
        return `Email must be ${EMAIL_MIN_LENGTH}-${EMAIL_MAX_LENGTH} characters long`;
    }

    if (!EMAIL_REGEX.test(email)) {
        return "Enter a valid email address";
    }

    return "";
}

function normalizeContactPayload(payload = {}) {
    // Normalize and trim incoming payload fields.
    return {
        name: typeof payload.name === "string" ? payload.name.trim() : "",
        email: typeof payload.email === "string" ? payload.email.trim() : "",
        subject: typeof payload.subject === "string" ? payload.subject.trim() : "",
        message: typeof payload.message === "string" ? payload.message.trim() : "",
        status: payload.status
    };
}

// Build SMTP config for Nodemailer from .env values.
function getMailerConfig() {
    const port = Number.parseInt(process.env.SMTP_PORT, 10);
    const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

    return {
        host: process.env.SMTP_HOST,
        port: Number.isFinite(port) ? port : 587,
        secure,
        auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || ""
            }
            : undefined
    };
}

// Ensure required SMTP env vars are present before sending.
function isMailerConfigured() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
        return false;
    }

    if (process.env.SMTP_USER && !process.env.SMTP_PASS) {
        return false;
    }

    return true;
}

// Default reply if no custom subject/body is provided.
function buildDefaultReply(contact) {
    const createdAt = contact?.createdAt
        ? new Date(contact.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
        : "N/A";
    const status = contact?.status || "Open";
    const lines = [
        `Dear ${contact.name},`,
        "",
        "Thank you for your enquiry. We have received your request and will contact you shortly.",
        "",
        `Status: ${status}`,
        `Enquiry Date: ${createdAt}`,
        `Inquiry: ${contact.inquireNumber}`,
        `Subject: ${contact.subject}`,
        `Message: ${contact.message}`,
        "",
        process.env.CONTACT_SIGNATURE || "Best regards,"
    ];

    return lines.join("\n");
}

async function sendContactEmail({ contact, subject, message }) {
    // Centralized mail sending helper.
    if (!isMailerConfigured()) {
        const error = new Error("Email service is not configured");
        error.code = "MAILER_NOT_CONFIGURED";
        throw error;
    }

    const transporter = nodemailer.createTransport(getMailerConfig());

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: contact.email,
        replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
        subject,
        text: message
    });
}

async function generateInquireNumber() {
    // Create a unique inquiry number per year.
    const currentYear = new Date().getFullYear();
    const latestContact = await Contact.findOne({
        inquireNumber: new RegExp(`^IN${currentYear}-`)
    })
        .sort({ createdAt: -1, _id: -1 })
        .select("inquireNumber");

    const latestSequence = latestContact?.inquireNumber
        ? Number.parseInt(latestContact.inquireNumber.split("-")[1], 10)
        : 0;

    const nextSequence = Number.isNaN(latestSequence) ? 1 : latestSequence + 1;

    return `IN${currentYear}-${String(nextSequence).padStart(3, "0")}`;
}

router.get("/", async (req, res) => {
    try {
        // Support both full list and paginated list.
        const pageParam = req.query.page;
        const limitParam = req.query.limit;

        if (pageParam === undefined && limitParam === undefined) {
            const contacts = await Contact.find().sort({ createdAt: -1, _id: -1 });
            return res.json(contacts);
        }

        const requestedPage = Math.max(1, Number.parseInt(pageParam, 10) || 1);
        const limit = Math.max(1, Number.parseInt(limitParam, 10) || 5);

        const totalItems = await Contact.countDocuments();
        const totalPages = Math.ceil(totalItems / limit) || 1;
        const page = Math.min(requestedPage, totalPages);

        const contacts = await Contact.find()
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.json({
            data: contacts,
            meta: {
                page,
                limit,
                totalItems,
                totalPages
            }
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to fetch inquiries",
            details: error.message
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                error: "Inquiry not found"
            });
        }

        return res.json(contact);
    } catch (error) {
        return res.status(500).json({
            error: "Failed to fetch inquiry",
            details: error.message
        });
    }
});

router.post("/", async (req, res) => {
    try {
        // Create a new inquiry with validation.
        const { name, email, subject, message } = normalizeContactPayload(req.body);

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                error: "name, email, subject, and message are required"
            });
        }

        const emailError = validateEmail(email);

        if (emailError) {
            return res.status(400).json({
                error: emailError
            });
        }

        const contact = await Contact.create({
            name,
            email,
            subject,
            message,
            inquireNumber: await generateInquireNumber()
        });

        return res.status(201).json({
            message: "Inquiry created successfully",
            contact
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to save contact",
            details: error.message
        });
    }
});

// Sends an email reply for a specific inquiry.
router.post("/:id/email", async (req, res) => {
    try {
        // Send an email for a specific inquiry.
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                error: "Inquiry not found"
            });
        }

        const requestedSubject =
            typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
        const requestedMessage =
            typeof req.body?.message === "string" ? req.body.message.trim() : "";

        const mailSubject = requestedSubject || "Enquiry received";
        const mailText = requestedMessage || buildDefaultReply(contact);

        await sendContactEmail({
            contact,
            subject: mailSubject,
            message: mailText
        });

        return res.json({
            message: "Email sent successfully"
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to send email",
            details: error.message
        });
    }
});

router.put("/:id", async (req, res) => {
    try {
        // Update inquiry details.
        const { name, email, subject, message, status } = normalizeContactPayload(req.body);

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                error: "name, email, subject, and message are required"
            });
        }

        const emailError = validateEmail(email);

        if (emailError) {
            return res.status(400).json({
                error: emailError
            });
        }

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            {
                name,
                email,
                subject,
                message,
                status
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!contact) {
            return res.status(404).json({
                error: "Inquiry not found"
            });
        }

        return res.json({
            message: "Inquiry updated successfully",
            contact
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to update inquiry",
            details: error.message
        });
    }
});

router.patch("/:id/resolve", async (req, res) => {
    try {
        // Mark inquiry resolved and send a resolution email.
        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            {
                status: "Resolved"
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!contact) {
            return res.status(404).json({
                error: "Inquiry not found"
            });
        }

        try {
            await sendContactEmail({
                contact,
                subject: "Enquiry resolved",
                message: `Dear Sir/Madam

I would like to inform you that the enquiry has been successfully completed. All the required information has been reviewed and addressed. If any further clarification or additional details are needed, please feel free to let me know.

Thank you for your time and support.`
            });
        } catch (mailError) {
            return res.status(500).json({
                error: "Inquiry resolved, but failed to send email",
                details: mailError.message,
                contact
            });
        }

        return res.json({
            message: "Inquiry resolved successfully",
            contact
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to resolve inquiry",
            details: error.message
        });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        // Delete an inquiry by id.
        const contact = await Contact.findByIdAndDelete(req.params.id);

        if (!contact) {
            return res.status(404).json({
                error: "Inquiry not found"
            });
        }

        return res.json({
            message: "Inquiry deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to delete inquiry",
            details: error.message
        });
    }
});

module.exports = router;
