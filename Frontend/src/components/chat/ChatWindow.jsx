import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "../../lib/chatSocket";
import { chatApiGet, chatApiPost, chatApiUpload } from "../../chatApiClient";
import "./ChatApp.css";

const CHAT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
const QUICK_EMOJIS = [
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F60D}",
  "\u{1F60E}",
  "\u{1F973}",
  "\u{1F914}",
  "\u{1F44D}",
  "\u{1F64F}",
  "\u{2764}\u{FE0F}",
  "\u{1F525}",
  "\u{1F389}",
  "\u{1F622}",
];
const MUTED_CONVERSATIONS_STORAGE_KEY = "chat-muted-conversations";

function ChatWindow({ user, activeConversation, alert, onClearAlert, onBack, onOpenContactProfile }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [mutedConversationIds, setMutedConversationIds] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [pendingMedia, setPendingMedia] = useState(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const emojiMenuRef = useRef(null);
  const conversationMenuRef = useRef(null);

  void CHAT_API_BASE_URL;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setShowAttachMenu(false);
      }
      if (emojiMenuRef.current && !emojiMenuRef.current.contains(e.target)) {
        setShowEmojiMenu(false);
      }
      if (conversationMenuRef.current && !conversationMenuRef.current.contains(e.target)) {
        setShowConversationMenu(false);
      }
    };

    if (showAttachMenu || showEmojiMenu || showConversationMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAttachMenu, showEmojiMenu, showConversationMenu]);

  useEffect(() => {
    try {
      const savedMutedMap = JSON.parse(localStorage.getItem(MUTED_CONVERSATIONS_STORAGE_KEY) || "{}");
      setMutedConversationIds(savedMutedMap && typeof savedMutedMap === "object" ? savedMutedMap : {});
    } catch {
      setMutedConversationIds({});
    }
  }, []);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      setTypingUsers({});
      setShowSearchBar(false);
      setMessageSearch("");
      setShowConversationMenu(false);
      setShowMediaPanel(false);
      setPendingMedia(null);
      setMediaCaption("");
      return;
    }

    setShowSearchBar(false);
    setMessageSearch("");
    setShowConversationMenu(false);
    setShowMediaPanel(false);
    setPendingMedia(null);
    setMediaCaption("");
    loadMessages();

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("mark-read", { conversationId: activeConversation._id });
    }
  }, [activeConversation?._id]);

  useEffect(() => {
    return () => {
      if (pendingMedia?.previewUrl) {
        URL.revokeObjectURL(pendingMedia.previewUrl);
      }
    };
  }, [pendingMedia]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const handleNewMessage = (data) => {
      if (activeConversation && data.conversationId === activeConversation._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
        scrollToBottom();

        if (data.message.sender._id !== user._id) {
          socket.emit("mark-read", { conversationId: activeConversation._id });
        }
      }
    };

    const handleMessageStatus = (data) => {
      if (activeConversation && data.conversationId === activeConversation._id) {
        setMessages((prev) =>
          prev.map((m) => (m._id === data.messageId ? { ...m, status: data.status } : m))
        );
      }
    };

    const handleMessagesRead = (data) => {
      if (activeConversation && data.conversationId === activeConversation._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender._id === user._id && m.status !== "read" ? { ...m, status: "read" } : m
          )
        );
      }
    };

    const handleTyping = (data) => {
      if (activeConversation && data.conversationId === activeConversation._id && data.userId !== user._id) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: data.displayName }));
      }
    };

    const handleStopTyping = (data) => {
      if (activeConversation && data.conversationId === activeConversation._id) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-status-update", handleMessageStatus);
    socket.on("messages-read", handleMessagesRead);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("message-status-update", handleMessageStatus);
      socket.off("messages-read", handleMessagesRead);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [activeConversation?._id, user?._id]);

  const loadMessages = async () => {
    if (!activeConversation) return;
    setLoading(true);
    setSendError(null);
    try {
      const data = await chatApiGet(`/api/chat/conversations/${activeConversation._id}/messages`);
      if (data.success) {
        setMessages(data.messages);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const syncTypingState = (nextValue) => {
    setInputText(nextValue);

    const socket = getSocket();
    if (socket && socket.connected && activeConversation) {
      if (nextValue.trim() && !isTyping) {
        setIsTyping(true);
        socket.emit("typing", { conversationId: activeConversation._id });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      if (nextValue.trim()) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          socket.emit("stop-typing", { conversationId: activeConversation._id });
        }, 2000);
      } else {
        setIsTyping(false);
        socket.emit("stop-typing", { conversationId: activeConversation._id });
      }
    }
  };

  const handleInputChange = (e) => {
    syncTypingState(e.target.value);
  };

  const handleEmojiSelect = (emoji) => {
    syncTypingState(`${inputText}${emoji}`);
    setShowEmojiMenu(false);
  };

  const clearPendingMedia = () => {
    if (pendingMedia?.previewUrl) {
      URL.revokeObjectURL(pendingMedia.previewUrl);
    }
    setPendingMedia(null);
    setMediaCaption("");
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !pendingMedia) || !activeConversation) return;

    if (pendingMedia) {
      setSendError(null);
      setShowEmojiMenu(false);
      setShowAttachMenu(false);
      setUploading(true);
      setUploadProgress(`Uploading ${pendingMedia.file.name}...`);

      try {
        const formData = new FormData();
        formData.append("file", pendingMedia.file);
        formData.append("type", pendingMedia.uploadType);

        const uploadResult = await chatApiUpload("/api/chat/upload/upload", formData);

        if (uploadResult.success) {
          const payload = {
            conversationId: activeConversation._id,
            content: mediaCaption.trim(),
            type: pendingMedia.messageType,
            mediaUrl: uploadResult.url,
            mediaPublicId: uploadResult.publicId,
            fileName: uploadResult.fileName || pendingMedia.file.name,
          };

          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("send-message", payload);
          } else {
            await chatApiPost(`/api/chat/conversations/${activeConversation._id}/messages`, payload);
          }
        }

        clearPendingMedia();
      } catch (err) {
        console.error("Upload failed", err);
        setSendError(err?.data?.message || "File upload failed. Please try again.");
      } finally {
        setUploading(false);
        setUploadProgress("");
      }
      return;
    }

    const content = inputText.trim();
    setInputText("");
    setSendError(null);
    setShowEmojiMenu(false);

    const socket = getSocket();
    if (socket && socket.connected) {
      setIsTyping(false);
      clearTimeout(typingTimeoutRef.current);
      socket.emit("stop-typing", { conversationId: activeConversation._id });
      socket.emit("send-message", {
        conversationId: activeConversation._id,
        content,
        type: "text",
      });
    } else {
      try {
        await chatApiPost(`/api/chat/conversations/${activeConversation._id}/messages`, {
          content,
          type: "text",
        });
      } catch (err) {
        console.error("Failed to send message", err);
        setSendError("Message failed to send. Please try again.");
        setInputText(content);
      }
    }
  };

  const handleAttachClick = () => {
    setShowEmojiMenu(false);
    setShowAttachMenu((prev) => !prev);
  };

  const handleEmojiButtonClick = () => {
    setShowAttachMenu(false);
    setShowEmojiMenu((prev) => !prev);
  };

  const openFilePicker = (type) => {
    const inputRef = type === "media" ? mediaInputRef : documentInputRef;
    if (!inputRef.current) return;

    inputRef.current.value = "";
    inputRef.current.click();
    setShowAttachMenu(false);
  };

  const handleFileSelected = async (e, selectedType = "document") => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    let messageType = selectedType === "media" ? "image" : "document";
    let uploadType = selectedType === "media" ? "image" : "document";

    if (file.type.startsWith("image/")) {
      messageType = "image";
      uploadType = "image";
    } else if (file.type.startsWith("video/")) {
      messageType = "video";
      uploadType = "video";
    }

    if (selectedType === "media") {
      if (pendingMedia?.previewUrl) {
        URL.revokeObjectURL(pendingMedia.previewUrl);
      }

      setPendingMedia({
        file,
        messageType,
        uploadType,
        previewUrl: URL.createObjectURL(file),
      });
      setMediaCaption("");
      setShowAttachMenu(false);
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);

      const uploadResult = await chatApiUpload("/api/chat/upload/upload", formData);

      if (uploadResult.success) {
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit("send-message", {
            conversationId: activeConversation._id,
            content: "",
            type: messageType,
            mediaUrl: uploadResult.url,
            mediaPublicId: uploadResult.publicId,
            fileName: uploadResult.fileName || file.name,
          });
        } else {
          await chatApiPost(`/api/chat/conversations/${activeConversation._id}/messages`, {
            type: messageType,
            mediaUrl: uploadResult.url,
            mediaPublicId: uploadResult.publicId,
            fileName: uploadResult.fileName || file.name,
          });
        }
      }
    } catch (err) {
      console.error("Upload failed", err);
      setSendError(err?.data?.message || "File upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress("");
      e.target.value = "";
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "offline";
    const date = new Date(lastSeen);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return `last seen today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `last seen yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    return `last seen ${date.toLocaleDateString([], { day: "2-digit", month: "short" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const getConversationDetails = () => {
    if (!activeConversation) return null;

    if (activeConversation.type === "group") {
      const activeTypingNames = Object.values(typingUsers);
      return {
        name: activeConversation.groupName,
        avatar: activeConversation.groupAvatar,
        status:
          activeTypingNames.length > 0
            ? `${activeTypingNames.join(", ")} typing...`
            : `${activeConversation.participants.length} members`,
      };
    }

    const otherUser = activeConversation.participants.find((p) => p._id !== user._id) || user;
    const activeTypingNames = Object.values(typingUsers);

    let status;
    if (activeTypingNames.length > 0) {
      status = "typing...";
    } else if (otherUser.isOnline) {
      status = "online";
    } else {
      status = formatLastSeen(otherUser.lastSeen);
    }

    return {
      name: otherUser.displayName || otherUser.email,
      avatar: otherUser.avatarUrl,
      status,
    };
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateSeparator = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) return "Today";

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
  };

  const shouldShowDateSeparator = (msg, index, messageList = messages) => {
    if (index === 0) return true;
    const prevDate = new Date(messageList[index - 1].createdAt).toDateString();
    const currDate = new Date(msg.createdAt).toDateString();
    return prevDate !== currDate;
  };

  const getNameInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const normalizedSearch = messageSearch.trim().toLowerCase();
  const displayedMessages = useMemo(() => {
    if (!normalizedSearch) return messages;

    return messages.filter((msg) => {
      const content = msg.content?.toLowerCase() || "";
      const fileName = msg.fileName?.toLowerCase() || "";
      return content.includes(normalizedSearch) || fileName.includes(normalizedSearch);
    });
  }, [messages, normalizedSearch]);

  const mediaMessages = useMemo(
    () => messages.filter((msg) => msg.mediaUrl),
    [messages]
  );

  const isConversationMuted = activeConversation ? Boolean(mutedConversationIds[activeConversation._id]) : false;

  const handleToggleMuteConversation = () => {
    if (!activeConversation) return;

    setMutedConversationIds((prev) => {
      const next = {
        ...prev,
        [activeConversation._id]: !prev[activeConversation._id],
      };
      localStorage.setItem(MUTED_CONVERSATIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setShowConversationMenu(false);
  };

  const handleToggleSearchBar = () => {
    setShowConversationMenu(false);
    setShowSearchBar((prev) => {
      if (prev) {
        setMessageSearch("");
      }
      return !prev;
    });
  };

  const handleOpenMediaPanel = () => {
    setShowConversationMenu(false);
    setShowMediaPanel(true);
  };

  const renderHighlightedText = (text) => {
    if (!text) return null;
    if (!normalizedSearch) return text;

    const escaped = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));

    return parts.map((part, index) =>
      part.toLowerCase() === normalizedSearch ? (
        <mark key={`${part}-${index}`} className="chat-search-highlight">
          {part}
        </mark>
      ) : (
        <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
      )
    );
  };

  if (!activeConversation) {
    return (
      <div className="chat-main chat-empty">
        <svg viewBox="0 0 100 100" width="100" height="100" opacity="0.5">
          <circle cx="50" cy="50" r="48" fill="none" stroke="#8696a0" strokeWidth="4" />
          <path d="M30 50h40M50 30v40" stroke="#8696a0" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <h2>Chat App</h2>
        <p>Send and receive messages in real time.</p>
        <p>Select a conversation or start a new chat to begin.</p>
      </div>
    );
  }

  const details = getConversationDetails();
  const activeTypingNames = Object.values(typingUsers);

  return (
    <div className="chat-main">
      <div className="chat-window-header">
        <div className="chat-header-info" onClick={() => onOpenContactProfile && onOpenContactProfile()}>
          <button className="chat-back-btn" onClick={(e) => { e.stopPropagation(); onBack(); }}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M14.71 6.29a1 1 0 010 1.41L10.41 12l4.3 4.29a1 1 0 01-1.42 1.42l-5-5a1 1 0 010-1.42l5-5a1 1 0 011.42 0z" />
            </svg>
          </button>

          <div className="chat-header-avatar">
            {details.avatar ? <img src={details.avatar} alt={details.name} /> : getNameInitials(details.name)}
          </div>

          <div className="chat-header-text">
            <span className="chat-header-name">{details.name}</span>
            <span
              className={`chat-header-status ${(details.status === "online" || details.status === "typing...") ? "chat-header-status--active" : ""}`}
            >
              {details.status}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            title="Search"
            aria-label="Search conversation"
            onClick={handleToggleSearchBar}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M10.5 3a7.5 7.5 0 015.94 12.08l4.24 4.24-1.42 1.42-4.24-4.24A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
            </svg>
          </button>
          <div className="chat-header-menu-anchor" ref={conversationMenuRef}>
            <button
              title="Conversation options"
              aria-label="Conversation options"
              onClick={() => setShowConversationMenu((prev) => !prev)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="currentColor" d="M12 7a1.75 1.75 0 110-3.5A1.75 1.75 0 0112 7zm0 6.75a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5zm0 6.75a1.75 1.75 0 110-3.5A1.75 1.75 0 0112 20.5z" />
              </svg>
            </button>

            {showConversationMenu && (
              <div className="chat-header-dropdown-menu">
                <button type="button" onClick={handleOpenMediaPanel}>
                  View media
                </button>
                <button type="button" onClick={handleToggleMuteConversation}>
                  {isConversationMuted ? "Unmute notifications" : "Mute notifications"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSearchBar && (
        <div className="chat-message-search-bar">
          <div className="chat-message-search-input">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M10.5 3a7.5 7.5 0 015.94 12.08l4.24 4.24-1.42 1.42-4.24-4.24A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
            </svg>
            <input
              type="text"
              placeholder="Search in this chat"
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
              autoFocus
            />
            {messageSearch && (
              <button type="button" onClick={() => setMessageSearch("")} aria-label="Clear message search">
                Clear
              </button>
            )}
          </div>
          <div className="chat-message-search-count">
            {displayedMessages.length} result{displayedMessages.length === 1 ? "" : "s"}
          </div>
        </div>
      )}

      {alert && (
        <div className={`chat-inline-alert chat-inline-alert--${alert.type || "info"}`}>
          <span>{alert.message}</span>
          <button type="button" onClick={onClearAlert} aria-label="Close alert">
            x
          </button>
        </div>
      )}

      {uploading && (
        <div className="chat-upload-overlay">
          <div className="chat-upload-spinner"></div>
          <p>{uploadProgress}</p>
        </div>
      )}

      {pendingMedia && (
        <div className="chat-media-preview-panel">
          <div className="chat-media-preview-header">
            <div>
              <h3>Preview media</h3>
              <p>{pendingMedia.file.name}</p>
            </div>
            <button type="button" onClick={clearPendingMedia} aria-label="Remove selected media">
              Remove
            </button>
          </div>

          <div className="chat-media-preview-frame">
            {pendingMedia.messageType === "video" ? (
              <video src={pendingMedia.previewUrl} controls />
            ) : (
              <img src={pendingMedia.previewUrl} alt="Selected media preview" />
            )}
          </div>

          <div className="chat-media-preview-caption">
            <input
              type="text"
              placeholder="Add a caption"
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              maxLength={300}
            />
          </div>
        </div>
      )}

      <div className="chat-messages">
        {loading ? (
          <div style={{ textAlign: "center", color: "#8696a0", padding: "40px 0" }}>Loading messages...</div>
        ) : (
          <>
            {displayedMessages.length === 0 && (
              <div className="message-date" style={{ alignSelf: "center", margin: "20px 0" }}>
                {normalizedSearch ? "No matching messages found." : "No messages yet. Say hi!"}
              </div>
            )}

            {displayedMessages.map((msg, index) => {
              const isSent = msg.sender._id === user._id;
              const timeString = formatMessageTime(msg.createdAt);
              const prevMsg = index > 0 ? displayedMessages[index - 1] : null;
              const isFirstInGroup = !prevMsg || prevMsg.sender._id !== msg.sender._id;
              const showDate = shouldShowDateSeparator(msg, index, displayedMessages);

              return (
                <React.Fragment key={msg._id}>
                  {showDate && <div className="message-date">{formatDateSeparator(msg.createdAt)}</div>}

                  <div className={`message-row ${isSent ? "sent" : "received"} ${isFirstInGroup ? "first" : ""}`}>
                    <div className="message-bubble">
                      {!isSent && activeConversation.type === "group" && isFirstInGroup && (
                        <div className="message-sender">{msg.sender.displayName || msg.sender.email}</div>
                      )}

                      {msg.mediaUrl ? (
                        <div className="message-media">
                          {msg.type === "video" ? (
                            <video src={msg.mediaUrl} controls />
                          ) : msg.type === "image" ? (
                            <img src={msg.mediaUrl} alt="Media message" />
                          ) : (
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="message-document-link">
                              <span className="doc-icon">FILE</span>
                              <span className="doc-name">{renderHighlightedText(msg.fileName || "Document")}</span>
                              <span className="doc-download">Open</span>
                            </a>
                          )}
                        </div>
                      ) : null}

                      {msg.content && (
                        <div className="message-content">
                          {renderHighlightedText(msg.content)}
                          <span style={{ display: "inline-block", width: isSent ? "70px" : "45px" }}></span>
                        </div>
                      )}

                      <div
                        className="message-meta"
                        style={{
                          position: msg.content ? "absolute" : "relative",
                          bottom: msg.content ? "4px" : "auto",
                          right: msg.content ? "8px" : "auto",
                        }}
                      >
                        <span className="message-time">{timeString}</span>
                        {isSent && (
                          <span className={`message-status ${msg.status === "read" ? "read" : ""}`}>
                            {msg.status === "sent" && "✓"}
                            {msg.status === "delivered" && "✓✓"}
                            {msg.status === "read" && "✓✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {activeTypingNames.length > 0 && (
              <div className="message-row received first">
                <div className="message-bubble typing-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {sendError && (
        <div className="chat-send-error">
          {sendError}
          <button onClick={() => setSendError(null)}>x</button>
        </div>
      )}

      {showMediaPanel && (
        <div className="conversation-media-panel-overlay" onClick={() => setShowMediaPanel(false)}>
          <div className="conversation-media-panel" onClick={(e) => e.stopPropagation()}>
            <div className="conversation-media-panel-header">
              <div>
                <h3>Shared media</h3>
                <p>{mediaMessages.length} item{mediaMessages.length === 1 ? "" : "s"}</p>
              </div>
              <button type="button" onClick={() => setShowMediaPanel(false)} aria-label="Close media panel">
                Close
              </button>
            </div>

            <div className="conversation-media-grid">
              {mediaMessages.length === 0 ? (
                <div className="conversation-media-empty">No shared media in this chat yet.</div>
              ) : (
                mediaMessages.map((msg) => (
                  <a
                    key={msg._id}
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="conversation-media-card"
                  >
                    <div className="conversation-media-preview">
                      {msg.type === "video" ? (
                        <video src={msg.mediaUrl} />
                      ) : msg.type === "image" ? (
                        <img src={msg.mediaUrl} alt={msg.fileName || "Shared media"} />
                      ) : (
                        <div className="conversation-media-file">FILE</div>
                      )}
                    </div>
                    <div className="conversation-media-meta">
                      <strong>{msg.fileName || msg.type || "Attachment"}</strong>
                      <span>{formatDateSeparator(msg.createdAt)}</span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={mediaInputRef}
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e, "media")}
      />

      <input
        type="file"
        ref={documentInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e, "document")}
      />

      <form className="chat-input-area" onSubmit={handleSendMessage}>
        {showAttachMenu && (
          <div className="attachment-menu" ref={attachMenuRef}>
            <button type="button" className="attachment-item" onClick={() => openFilePicker("media")}>
              <div className="attachment-icon bg-image">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="white" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
              </div>
              <span>Photos & Videos</span>
            </button>
            <button type="button" className="attachment-item" onClick={() => openFilePicker("document")}>
              <div className="attachment-icon bg-document">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="white" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
              </div>
              <span>Document</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className={`chat-attach-btn ${showAttachMenu ? "active" : ""}`}
          title="Attach"
          onClick={handleAttachClick}
          disabled={uploading}
          aria-label="Attach file"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M16.5 6.5l-6.79 6.79a3 3 0 104.24 4.24l7.14-7.14a5 5 0 10-7.07-7.07L5.88 11.46a7 7 0 109.9 9.9l5.3-5.3-1.41-1.41-5.3 5.3a5 5 0 11-7.07-7.07l8.14-8.14a3 3 0 114.24 4.24l-7.14 7.14a1 1 0 11-1.41-1.41l6.79-6.79z"
            />
          </svg>
        </button>

        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input-field"
            placeholder={pendingMedia ? "Add a caption above or press Send" : "Type a message"}
            value={inputText}
            onChange={handleInputChange}
            disabled={uploading || Boolean(pendingMedia)}
          />
        </div>

        <div className="chat-input-actions">
          <div className="chat-emoji-menu-anchor" ref={emojiMenuRef}>
            {showEmojiMenu && (
              <div className="chat-emoji-menu">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="chat-emoji-option"
                    onClick={() => handleEmojiSelect(emoji)}
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className={`chat-emoji-btn ${showEmojiMenu ? "active" : ""}`}
              onClick={handleEmojiButtonClick}
              disabled={uploading}
              title="Add emoji"
              aria-label="Add emoji"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-3.5 7A1.5 1.5 0 1110 7.5 1.5 1.5 0 018.5 9zm7 0A1.5 1.5 0 1117 7.5 1.5 1.5 0 0115.5 9zM12 18c-2.33 0-4.31-1.46-5.11-3.5h10.22C16.31 16.54 14.33 18 12 18z"
                />
              </svg>
            </button>
          </div>

          <button
            type="submit"
            className={`chat-send-btn ${inputText.trim() || pendingMedia ? "active" : ""}`}
            disabled={(!inputText.trim() && !pendingMedia) || uploading}
            title={pendingMedia ? "Send media" : "Send"}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;
