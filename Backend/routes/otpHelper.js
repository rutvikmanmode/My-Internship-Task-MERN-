const crypto = require("crypto");
const nodemailer = require("nodemailer");

/**
 * Generate a random 6-digit OTP string.
 */
function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Build SMTP transporter config from environment variables.
 * Reuses the same env vars as contactRoutes (SMTP_HOST, SMTP_PORT, etc.).
 */
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

/**
 * Send an OTP email to the given address.
 * @param {string} email   — recipient address
 * @param {string} otp     — the 6-digit code
 * @param {string} purpose — "register" or "forgot"
 */
async function sendOtpEmail(email, otp, purpose) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
        throw new Error("Email service is not configured");
    }

    const transporter = nodemailer.createTransport(getMailerConfig());

    const purposeLabel = purpose === "register"
        ? "Account Registration"
        : "Password Reset";

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1a1d23; border-radius: 16px; color: #e1e4e8;">
            <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 22px;">${purposeLabel} — OTP</h2>
            <p style="margin: 0 0 24px; color: #8b949e; font-size: 14px;">Use the code below to complete your request. It expires in <strong>5 minutes</strong>.</p>
            <div style="text-align: center; padding: 20px; background: #21262d; border-radius: 12px; border: 1px solid #30363d;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #58a6ff;">${otp}</span>
            </div>
            <p style="margin: 24px 0 0; color: #8b949e; font-size: 13px;">If you did not request this code, please ignore this email.</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `${purposeLabel} OTP — ${otp}`,
        html
    });
}

module.exports = { generateOtp, sendOtpEmail };
