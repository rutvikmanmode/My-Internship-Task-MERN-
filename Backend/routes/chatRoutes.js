const express = require("express");
const ChatUser = require("../models/chatmodels/ChatUser");
const Conversation = require("../models/chatmodels/Conversation");
const Message = require("../models/chatmodels/Message");

const router = express.Router();

function getGroupAdminIds(conversation) {
    if (Array.isArray(conversation.groupAdmins) && conversation.groupAdmins.length > 0) {
        return conversation.groupAdmins.map((id) => id.toString());
    }

    if (conversation.groupAdmin) {
        return [conversation.groupAdmin.toString()];
    }

    return [];
}

function isGroupAdmin(conversation, userId) {
    return getGroupAdminIds(conversation).includes(userId.toString());
}

// Middleware to check chat session auth.
function requireChatAuth(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: "Not authenticated"
        });
    }
    next();
}

router.use(requireChatAuth);

// GET /users/search?q= — search users by email or displayName.
router.get("/users/search", async (req, res) => {
    try {
        const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

        if (!query || query.length < 2) {
            return res.json({ success: true, users: [] });
        }

        const users = await ChatUser.find({
            _id: { $ne: req.user._id },
            $or: [
                { email: { $regex: query, $options: "i" } },
                { displayName: { $regex: query, $options: "i" } }
            ]
        })
        .select("email displayName avatarUrl about isOnline lastSeen")
        .limit(20);

        return res.json({ success: true, users });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Search failed",
            details: error.message
        });
    }
});

// GET /conversations — list user's conversations.
router.get("/conversations", async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id
        })
        .populate("participants", "email displayName avatarUrl isOnline lastSeen")
        .populate("lastMessage")
        .populate("groupAdmin", "email displayName")
        .populate("groupAdmins", "email displayName")
        .sort({ lastActivity: -1 });

        // Compute unread counts for each conversation.
        const conversationsWithUnread = await Promise.all(
            conversations.map(async (conv) => {
                const unreadCount = await Message.countDocuments({
                    conversation: conv._id,
                    sender: { $ne: req.user._id },
                    "readBy.user": { $ne: req.user._id }
                });
                const convObj = conv.toObject();
                convObj.unreadCount = unreadCount;
                return convObj;
            })
        );

        return res.json({ success: true, conversations: conversationsWithUnread });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch conversations",
            details: error.message
        });
    }
});

// POST /conversations — create or get a conversation.
router.post("/conversations", async (req, res) => {
    try {
        const { participantId, type, groupName, participantIds } = req.body;

        if (type === "group") {
            // Create group conversation.
            if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: "Group requires at least 2 other participants"
                });
            }

            const allParticipants = [...new Set([req.user._id.toString(), ...participantIds])];

            const conversation = await Conversation.create({
                type: "group",
                participants: allParticipants,
                groupName: groupName || "New Group",
                groupAdmin: req.user._id,
                groupAdmins: [req.user._id],
                createdBy: req.user._id
            });

            const populated = await Conversation.findById(conversation._id)
                .populate("participants", "email displayName avatarUrl isOnline lastSeen")
                .populate("groupAdmin", "email displayName")
                .populate("groupAdmins", "email displayName");

            return res.status(201).json({ success: true, conversation: populated });
        }

        // Private conversation.
        if (!participantId) {
            return res.status(400).json({
                success: false,
                message: "Participant ID is required"
            });
        }

        // Check if conversation already exists.
        let conversation = await Conversation.findOne({
            type: "private",
            participants: { $all: [req.user._id, participantId], $size: 2 }
        })
        .populate("participants", "email displayName avatarUrl isOnline lastSeen")
        .populate("lastMessage");

        if (conversation) {
            return res.json({ success: true, conversation });
        }

        // Create new private conversation.
        conversation = await Conversation.create({
            type: "private",
            participants: [req.user._id, participantId],
            createdBy: req.user._id
        });

        const populated = await Conversation.findById(conversation._id)
            .populate("participants", "email displayName avatarUrl isOnline lastSeen");

        return res.status(201).json({ success: true, conversation: populated });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create conversation",
            details: error.message
        });
    }
});

// GET /conversations/:id/messages — get messages for a conversation.
router.get("/conversations/:id/messages", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const conversation = await Conversation.findOne({
            _id: req.params.id,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const messages = await Message.find({ conversation: req.params.id })
            .populate("sender", "email displayName avatarUrl")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Message.countDocuments({ conversation: req.params.id });

        return res.json({
            success: true,
            messages: messages.reverse(),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch messages",
            details: error.message
        });
    }
});

// POST /conversations/:id/messages — send a message.
router.post("/conversations/:id/messages", async (req, res) => {
    try {
        const { content, type, mediaUrl, mediaPublicId, fileName } = req.body;

        const conversation = await Conversation.findOne({
            _id: req.params.id,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const message = await Message.create({
            conversation: req.params.id,
            sender: req.user._id,
            type: type || "text",
            content: content || "",
            mediaUrl: mediaUrl || "",
            mediaPublicId: mediaPublicId || "",
            fileName: fileName || "",
            status: "sent"
        });

        // Update conversation's last message and activity.
        conversation.lastMessage = message._id;
        conversation.lastActivity = new Date();
        await conversation.save();

        const populated = await Message.findById(message._id)
            .populate("sender", "email displayName avatarUrl");

        // Emit via socket if available.
        const io = req.app.get("io");
        if (io) {
            io.to(`conversation:${req.params.id}`).emit("new-message", {
                message: populated,
                conversationId: req.params.id
            });
        }

        return res.status(201).json({ success: true, message: populated });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to send message",
            details: error.message
        });
    }
});

// PUT /conversations/:id/mute — toggle mute.
router.put("/conversations/:id/mute", async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        const userId = req.user._id.toString();
        const isMuted = conversation.mutedBy.some(id => id.toString() === userId);

        if (isMuted) {
            conversation.mutedBy = conversation.mutedBy.filter(id => id.toString() !== userId);
        } else {
            conversation.mutedBy.push(req.user._id);
        }

        await conversation.save();

        return res.json({
            success: true,
            muted: !isMuted
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to toggle mute",
            details: error.message
        });
    }
});

router.put("/conversations/:id/admin", async (req, res) => {
    try {
        const { adminUserId, action = "add" } = req.body;

        const conversation = await Conversation.findOne({
            _id: req.params.id,
            participants: req.user._id,
            type: "group"
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Group conversation not found"
            });
        }

        if (!isGroupAdmin(conversation, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Only the group admin can change admin"
            });
        }

        if (!adminUserId || !conversation.participants.some((id) => id.toString() === adminUserId)) {
            return res.status(400).json({
                success: false,
                message: "Selected user must be a current group member"
            });
        }

        const adminIds = getGroupAdminIds(conversation);
        conversation.groupAdmins = adminIds;

        if (action === "remove") {
            if (!adminIds.includes(adminUserId)) {
                return res.status(400).json({
                    success: false,
                    message: "Selected user is not a group admin"
                });
            }

            if (adminIds.length <= 1) {
                return res.status(400).json({
                    success: false,
                    message: "Group must have at least one admin"
                });
            }

            conversation.groupAdmins = conversation.groupAdmins.filter((id) => id.toString() !== adminUserId);
        } else {
            if (!adminIds.includes(adminUserId)) {
                conversation.groupAdmins = [...conversation.groupAdmins, adminUserId];
            }
        }

        const nextAdminIds = conversation.groupAdmins.map((id) => id.toString());
        conversation.groupAdmin = conversation.groupAdmins[0] || conversation.groupAdmin;
        await conversation.save();

        const populated = await Conversation.findById(conversation._id)
            .populate("participants", "email displayName avatarUrl isOnline lastSeen")
            .populate("lastMessage")
            .populate("groupAdmin", "email displayName")
            .populate("groupAdmins", "email displayName");

        return res.json({
            success: true,
            message: action === "remove" ? "Group admin removed successfully" : "Group admin updated successfully",
            adminIds: nextAdminIds,
            conversation: populated
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to change group admin",
            details: error.message
        });
    }
});

router.delete("/conversations/:id/members/:memberId", async (req, res) => {
    try {
        const { id, memberId } = req.params;

        const conversation = await Conversation.findOne({
            _id: id,
            participants: req.user._id,
            type: "group"
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Group conversation not found"
            });
        }

        if (!isGroupAdmin(conversation, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "Only the group admin can remove members"
            });
        }

        if (memberId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "Admin cannot remove themselves"
            });
        }

        if (getGroupAdminIds(conversation).includes(memberId)) {
            return res.status(400).json({
                success: false,
                message: "Remove admin access before removing this member"
            });
        }

        const isMember = conversation.participants.some((participantId) => participantId.toString() === memberId);
        if (!isMember) {
            return res.status(404).json({
                success: false,
                message: "Member not found in this group"
            });
        }

        conversation.participants = conversation.participants.filter(
            (participantId) => participantId.toString() !== memberId
        );
        conversation.lastActivity = new Date();
        await conversation.save();

        const populated = await Conversation.findById(conversation._id)
            .populate("participants", "email displayName avatarUrl isOnline lastSeen")
            .populate("lastMessage")
            .populate("groupAdmin", "email displayName")
            .populate("groupAdmins", "email displayName");

        return res.json({
            success: true,
            message: "Member removed from group",
            conversation: populated
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to remove group member",
            details: error.message
        });
    }
});

// PUT /conversations/:id/read — mark messages as read.
router.put("/conversations/:id/read", async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });
        }

        // Update all unread messages in this conversation not sent by the current user.
        await Message.updateMany(
            {
                conversation: req.params.id,
                sender: { $ne: req.user._id },
                "readBy.user": { $ne: req.user._id }
            },
            {
                $push: { readBy: { user: req.user._id, readAt: new Date() } },
                $set: { status: "read" }
            }
        );

        // Emit read status via socket.
        const io = req.app.get("io");
        if (io) {
            io.to(`conversation:${req.params.id}`).emit("messages-read", {
                conversationId: req.params.id,
                readBy: req.user._id
            });
        }

        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to mark as read",
            details: error.message
        });
    }
});

// PUT /profile — update chat user profile.
router.put("/profile", async (req, res) => {
    try {
        const { displayName, about, status, avatarUrl } = req.body;
        const user = await ChatUser.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (displayName !== undefined) user.displayName = displayName;
        if (about !== undefined) user.about = about;
        if (status !== undefined) user.status = status;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

        await user.save();

        return res.json({
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                about: user.about,
                status: user.status
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update profile",
            details: error.message
        });
    }
});

module.exports = router;
