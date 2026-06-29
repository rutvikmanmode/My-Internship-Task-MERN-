const ChatUser = require("../models/chatmodels/ChatUser");
const Message = require("../models/chatmodels/Message");
const Conversation = require("../models/chatmodels/Conversation");

function initializeChatSocket(io) {
    // Track which socket belongs to which user.
    const onlineUsers = new Map();

    io.on("connection", async (socket) => {
        const user = socket.request.user;

        if (!user) {
            socket.disconnect(true);
            return;
        }

        const userId = user._id.toString();

        // Mark user as online.
        onlineUsers.set(userId, socket.id);

        await ChatUser.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date()
        });

        // Join all the user's conversation rooms.
        const conversations = await Conversation.find({ participants: userId });
        conversations.forEach((conv) => {
            socket.join(`conversation:${conv._id}`);
        });

        // Broadcast online status change.
        socket.broadcast.emit("user-online", { userId });

        // ── Send Message Event ──
        socket.on("send-message", async (data) => {
            try {
                const { conversationId, content, type, mediaUrl, mediaPublicId, fileName } = data;

                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    participants: userId
                });

                if (!conversation) return;

                const message = await Message.create({
                    conversation: conversationId,
                    sender: userId,
                    type: type || "text",
                    content: content || "",
                    mediaUrl: mediaUrl || "",
                    mediaPublicId: mediaPublicId || "",
                    fileName: fileName || "",
                    status: "sent"
                });

                conversation.lastMessage = message._id;
                conversation.lastActivity = new Date();
                await conversation.save();

                const populated = await Message.findById(message._id)
                    .populate("sender", "email displayName avatarUrl");

                // Broadcast to the conversation room.
                io.to(`conversation:${conversationId}`).emit("new-message", {
                    message: populated,
                    conversationId
                });

                // Mark as delivered for online recipients.
                conversation.participants.forEach((participantId) => {
                    const pid = participantId.toString();
                    if (pid !== userId && onlineUsers.has(pid)) {
                        Message.findByIdAndUpdate(message._id, { status: "delivered" }).exec();
                        io.to(`conversation:${conversationId}`).emit("message-status-update", {
                            messageId: message._id,
                            status: "delivered",
                            conversationId
                        });
                    }
                });
            } catch (error) {
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        // ── Typing Events ──
        socket.on("typing", (data) => {
            socket.to(`conversation:${data.conversationId}`).emit("typing", {
                userId,
                displayName: user.displayName,
                conversationId: data.conversationId
            });
        });

        socket.on("stop-typing", (data) => {
            socket.to(`conversation:${data.conversationId}`).emit("stop-typing", {
                userId,
                conversationId: data.conversationId
            });
        });

        // ── Mark Messages as Read ──
        socket.on("mark-read", async (data) => {
            try {
                const { conversationId } = data;

                await Message.updateMany(
                    {
                        conversation: conversationId,
                        sender: { $ne: userId },
                        "readBy.user": { $ne: userId }
                    },
                    {
                        $push: { readBy: { user: userId, readAt: new Date() } },
                        $set: { status: "read" }
                    }
                );

                io.to(`conversation:${conversationId}`).emit("messages-read", {
                    conversationId,
                    readBy: userId
                });
            } catch (error) {
                socket.emit("error", { message: "Failed to mark as read" });
            }
        });

        // ── Join Conversation Room (for new conversations) ──
        socket.on("join-conversation", (data) => {
            socket.join(`conversation:${data.conversationId}`);
        });

        // ── Disconnect ──
        socket.on("disconnect", async () => {
            onlineUsers.delete(userId);

            await ChatUser.findByIdAndUpdate(userId, {
                isOnline: false,
                lastSeen: new Date()
            });

            socket.broadcast.emit("user-offline", {
                userId,
                lastSeen: new Date()
            });
        });
    });
}

module.exports = initializeChatSocket;
