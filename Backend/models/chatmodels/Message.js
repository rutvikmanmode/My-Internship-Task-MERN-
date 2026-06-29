const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatUser",
        required: true
    },
    type: {
        type: String,
        enum: ["text", "image", "video", "document", "voice"],
        default: "text"
    },
    content: {
        type: String,
        default: ""
    },
    mediaUrl: {
        type: String,
        default: ""
    },
    mediaPublicId: {
        type: String,
        default: ""
    },
    fileName: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent"
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChatUser"
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
