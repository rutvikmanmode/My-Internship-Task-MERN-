import React, { useState } from "react";
import "./ChatApp.css";

function ChatSidebar({ user, conversations, activeConversation, unreadCounts, onSelectConversation, onNewChat, onLogout, onShowProfile }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const getInitials = (name, email) => {
    const source = name || email || "?";
    const parts = source.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const name = conv.type === "group"
      ? conv.groupName
      : conv.participants.find(p => p._id !== user._id)?.displayName || "Unknown";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getConversationDetails = (conv) => {
    if (conv.type === "group") {
      return {
        name: conv.groupName,
        avatar: conv.groupAvatar,
        lastMsg: conv.lastMessage?.content || "Tap to chat",
        time: conv.lastMessage?.createdAt || conv.lastActivity,
        isOnline: false
      };
    }

    const otherUser = conv.participants.find(p => p._id !== user._id) || user;
    return {
      name: otherUser.displayName || otherUser.email,
      avatar: otherUser.avatarUrl,
      lastMsg: conv.lastMessage?.content || "Tap to chat",
      time: conv.lastMessage?.createdAt || conv.lastActivity,
      isOnline: otherUser.isOnline,
      lastSeen: otherUser.lastSeen
    };
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  return (
    <div className="chat-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-avatar" onClick={onShowProfile} title="Open Profile">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} />
          ) : (
            getInitials(user.displayName, user.email)
          )}
        </div>

        <div className="sidebar-actions">
          <button title="New Chat" onClick={onNewChat}>
            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"></path></svg>
          </button>
          <div style={{ position: "relative" }}>
            <button title="Menu" onClick={() => setShowMenu(prev => !prev)}>
              <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 7a2 2 0 10-.001-4.001A2 2 0 0012 7zm0 2a2 2 0 10-.001 3.999A2 2 0 0012 9zm0 6a2 2 0 10-.001 3.999A2 2 0 0012 15z"></path></svg>
            </button>
            {showMenu && (
              <div className="sidebar-dropdown-menu">
                <button onClick={() => { setShowMenu(false); onLogout(); }}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && <div className="sidebar-menu-overlay" onClick={() => setShowMenu(false)}></div>}

      {/* Search Bar */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <svg viewBox="0 0 24 24" width="20" height="20" color="#8696a0"><path fill="currentColor" d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 001.256-3.386 5.207 5.207 0 10-5.207 5.208 5.183 5.183 0 003.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 110-7.21 3.605 3.605 0 010 7.21z"></path></svg>
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="conversation-list">
        {filteredConversations.length === 0 ? (
          <div className="chat-empty" style={{ fontSize: '14px', paddingTop: '40px' }}>
            No chats found
          </div>
        ) : (
          filteredConversations.map(conv => {
            const details = getConversationDetails(conv);
            const isActive = activeConversation && activeConversation._id === conv._id;
            const unreadCount = unreadCounts[conv._id] || 0;

            return (
              <div
                key={conv._id}
                className={`conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectConversation(conv)}
              >
                <div className="conversation-avatar">
                  {details.avatar ? (
                    <img src={details.avatar} alt={details.name} />
                  ) : (
                    getInitials(details.name)
                  )}
                  {details.isOnline && (
                    <div className="online-indicator"></div>
                  )}
                </div>

                <div className="conversation-details">
                  <div className="conversation-top">
                    <span className="conversation-name">{details.name}</span>
                    <span className={`conversation-time ${unreadCount > 0 ? "conversation-time--unread" : ""}`}>
                      {formatTime(details.time)}
                    </span>
                  </div>

                  <div className="conversation-bottom">
                    <span className="conversation-last-msg">
                      {details.lastMsg}
                    </span>
                    {unreadCount > 0 && (
                      <div className="conversation-unread">{unreadCount}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ChatSidebar;
