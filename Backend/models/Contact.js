const mongoose = require("mongoose");

const EMAIL_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Contact inquiry schema definition.
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        minlength: EMAIL_MIN_LENGTH,
        maxlength: EMAIL_MAX_LENGTH,
        validate: {
            validator(value) {
                return !/\s/.test(value) && EMAIL_REGEX.test(value);
            },
            message: "Email must be valid, contain no spaces, and match the required format"
        }
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    inquireNumber: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ["Open", "Resolved"],
        default: "Open"
    }
}, {
    // Store createdAt/updatedAt for sorting and emails.
    timestamps: true
});

// Contact model for CRUD operations.
module.exports = mongoose.model("Contact", contactSchema);
