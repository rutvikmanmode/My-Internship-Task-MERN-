const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["private", "group"],
        default: "private"
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatUser",
        required: true
    }],
    groupName: {
        type: String,
        trim: true,
        default: ""
    },
    groupAvatar: {
        type: String,
        trim: true,
        default: ""
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatUser"
    },
    groupAdmins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatUser"
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    mutedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatUser"
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatUser"
    }
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);
