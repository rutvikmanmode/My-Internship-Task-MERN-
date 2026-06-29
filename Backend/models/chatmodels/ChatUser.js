const mongoose = require("mongoose");

const chatUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        default: ""
    },
    googleId: {
        type: String,
        default: ""
    },
    displayName: {
        type: String,
        trim: true,
        default: ""
    },
    avatarUrl: {
        type: String,
        trim: true,
        default: ""
    },
    about: {
        type: String,
        trim: true,
        default: "Hey there! I am using ChatApp"
    },
    status: {
        type: String,
        trim: true,
        default: "Available"
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    contacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatUser"
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("ChatUser", chatUserSchema);
