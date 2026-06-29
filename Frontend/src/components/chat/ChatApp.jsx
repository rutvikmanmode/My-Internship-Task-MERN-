import React, { useState, useEffect, useRef, useCallback } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../../lib/chatSocket";
import { chatApiGet, chatApiPost } from "../../chatApiClient";
import ChatAuth from "./ChatAuth";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import ChatProfile from "./ChatProfile";
import NewChat from "./NewChat";
import "./ChatApp.css";

function ChatApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const [showNewChat, setShowNewChat] = useState(false);
  const [profilePanel, setProfilePanel] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [chatAlert, setChatAlert] = useState(null);

  // Refs to avoid stale closures in socket handlers.
  const activeConversationRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Check auth session.
  useEffect(() => {
    checkAuth();
  }, []);

  // Manage socket connection once authenticated.
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    // Load initial conversations.
    loadConversations();

    // Connection status tracking.
    const onConnect = () => {
      setConnectionStatus("connected");
      // Re-join all conversation rooms on reconnect.
      chatApiGet("/api/chat/conversations").then(data => {
        if (data.success) {
          data.conversations.forEach(conv => {
            socket.emit("join-conversation", { conversationId: conv._id });
          });
        }
      }).catch(() => {});
    };

    const onDisconnect = () => {
      setConnectionStatus("disconnected");
    };

    const onReconnect = () => {
      setConnectionStatus("connected");
      loadConversations();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect", onReconnect);

    // User presence handlers — use refs to avoid stale closure.
    const handleUserOnline = (data) => {
      setConversations(prev => prev.map(conv => {
        if (conv.type === "group") return conv;

        const hasUser = conv.participants.some(p => p._id === data.userId);
        if (!hasUser) return conv;

        const newParticipants = conv.participants.map(p =>
          p._id === data.userId
            ? { ...p, isOnline: true, lastSeen: new Date().toISOString() }
            : p
        );

        return { ...conv, participants: newParticipants };
      }));
    };

    const handleUserOffline = (data) => {
      setConversations(prev => prev.map(conv => {
        if (conv.type === "group") return conv;

        const hasUser = conv.participants.some(p => p._id === data.userId);
        if (!hasUser) return conv;

        const newParticipants = conv.participants.map(p =>
          p._id === data.userId
            ? { ...p, isOnline: false, lastSeen: data.lastSeen || new Date().toISOString() }
            : p
        );

        return { ...conv, participants: newParticipants };
      }));
    };

    // New message preview — update sidebar and unread counts.
    const handleNewMessagePreview = (data) => {
      const currentUser = userRef.current;
      const activeConv = activeConversationRef.current;

      setConversations(prev => {
        const convIndex = prev.findIndex(c => c._id === data.conversationId);
        if (convIndex === -1) {
          // Conversation not in list — reload.
          loadConversations();
          return prev;
        }

        const prevList = [...prev];
        const conv = { ...prevList[convIndex] };

        // Update last message.
        conv.lastMessage = data.message;
        conv.lastActivity = data.message.createdAt;

        // Move to top.
        prevList.splice(convIndex, 1);
        return [conv, ...prevList];
      });

      // Increment unread if not viewing that conversation and not sent by current user.
      if (
        currentUser &&
        data.message.sender._id !== currentUser._id &&
        (!activeConv || activeConv._id !== data.conversationId)
      ) {
        setUnreadCounts(prev => ({
          ...prev,
          [data.conversationId]: (prev[data.conversationId] || 0) + 1
        }));
      }
    };

    // Messages read event — update unread counts.
    const handleMessagesRead = (data) => {
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[data.conversationId];
        return next;
      });
    };

    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("new-message", handleNewMessagePreview);
    socket.on("messages-read", handleMessagesRead);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect", onReconnect);
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
      socket.off("new-message", handleNewMessagePreview);
      socket.off("messages-read", handleMessagesRead);
      disconnectSocket();
    };
  }, [user]);

  const checkAuth = async () => {
    try {
      const data = await chatApiGet("/api/chat/auth/me");
      if (data.success) setUser(data.user);
    } catch (err) {
      // 401 is expected if not logged in.
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await chatApiGet("/api/chat/conversations");
      if (data.success) {
        setConversations(data.conversations);

        // Set initial unread counts from server.
        const counts = {};
        data.conversations.forEach(conv => {
          if (conv.unreadCount > 0) {
            counts[conv._id] = conv.unreadCount;
          }
        });
        setUnreadCounts(prev => ({ ...prev, ...counts }));
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  };

  const handleSelectConversation = useCallback((conv) => {
    setActiveConversation(conv);

    // Clear unread count for this conversation.
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[conv._id];
      return next;
    });

    // Mark messages as read via socket.
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("mark-read", { conversationId: conv._id });
    }
  }, []);

  const handleChatCreated = useCallback((conversation) => {
    setShowNewChat(false);
    setActiveConversation(conversation);

    // Join the socket room for this new conversation.
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("join-conversation", { conversationId: conversation._id });
    }

    // Add to list if not present, or move to top.
    setConversations(prev => {
      const filtered = prev.filter(c => c._id !== conversation._id);
      return [conversation, ...filtered];
    });
  }, []);

  const handleLogout = async () => {
    try {
      await chatApiPost("/api/chat/auth/logout");
    } catch (err) {
      // Ignore — we clear state anyway.
    }
    disconnectSocket();
    setUser(null);
    setConversations([]);
    setActiveConversation(null);
    setUnreadCounts({});
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    setProfilePanel((prev) => {
      if (!prev || prev.mode !== "self") return prev;
      return { ...prev, user: updatedUser };
    });
  };

  const handleConversationUpdate = useCallback((updatedConversation) => {
    if (!updatedConversation?._id) return;

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation._id === updatedConversation._id ? { ...conversation, ...updatedConversation } : conversation
      )
    );

    setActiveConversation((prev) =>
      prev && prev._id === updatedConversation._id ? { ...prev, ...updatedConversation } : prev
    );

    setProfilePanel((prev) =>
      prev && prev.conversation?._id === updatedConversation._id
        ? { ...prev, conversation: { ...prev.conversation, ...updatedConversation } }
        : prev
    );
  }, []);

  const handleChatAlert = useCallback((nextAlert) => {
    setChatAlert(nextAlert);
    setTimeout(() => {
      setChatAlert((current) => (current === nextAlert ? null : current));
    }, 3500);
  }, []);

  const getConversationProfileUser = useCallback((conversation) => {
    if (!conversation || !user) return null;
    if (conversation.type === "group") {
      return null;
    }
    return conversation.participants.find((participant) => participant._id !== user._id) || null;
  }, [user]);

  if (loading) {
    return (
      <div className="chat-app-container" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="chat-loading">
          <div className="chat-loading-spinner"></div>
          <p>Loading Chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <ChatAuth onAuthSuccess={setUser} />;
  }

  return (
    <div className="chat-app-container">
      {connectionStatus === "disconnected" && (
        <div className="chat-connection-banner">
          Connecting...
        </div>
      )}
      <div
        className={`chat-layout ${activeConversation ? "chat-layout--conversation-open" : ""}`}
      >
        <ChatSidebar
          user={user}
          conversations={conversations}
          activeConversation={activeConversation}
          unreadCounts={unreadCounts}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => setShowNewChat(true)}
          onLogout={handleLogout}
          onShowProfile={() => setProfilePanel({ mode: "self", user, conversation: null })}
        />

        <ChatWindow
          user={user}
          activeConversation={activeConversation}
          alert={chatAlert}
          onClearAlert={() => setChatAlert(null)}
          onBack={() => setActiveConversation(null)}
          onOpenContactProfile={() => {
            if (!activeConversation) return;
            const profileUser = getConversationProfileUser(activeConversation) || user;
            setProfilePanel({
              mode: "contact",
              user: profileUser,
              conversation: activeConversation,
            });
          }}
        />

        {profilePanel && (
          <ChatProfile
            user={profilePanel.user}
            currentUser={user}
            conversation={profilePanel.conversation}
            mode={profilePanel.mode}
            onClose={() => setProfilePanel(null)}
            onUserUpdate={handleUserUpdate}
            onConversationUpdate={handleConversationUpdate}
            onAlert={handleChatAlert}
          />
        )}

        {showNewChat && (
          <NewChat
            onClose={() => setShowNewChat(false)}
            onChatCreated={handleChatCreated}
          />
        )}
      </div>
    </div>
  );
}

export default ChatApp;
