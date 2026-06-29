import React, { useMemo, useState } from "react";
import { chatApiGet, chatApiPost } from "../../chatApiClient";
import "./ChatApp.css";

function NewChat({ onClose, onChatCreated }) {
  const [mode, setMode] = useState("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const selectedUserIds = useMemo(
    () => new Set(selectedUsers.map((user) => user._id)),
    [selectedUsers]
  );

  const resetGroupState = () => {
    setGroupName("");
    setSelectedUsers([]);
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setSearchQuery("");
    setResults([]);
    if (nextMode === "chat") {
      resetGroupState();
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      const data = await chatApiGet(`/api/chat/users/search?q=${encodedQuery}`);
      if (data.success) {
        setResults(data.users);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (userId) => {
    try {
      const data = await chatApiPost("/api/chat/conversations", {
        type: "private",
        participantId: userId,
      });
      if (data.success) {
        onChatCreated(data.conversation);
      }
    } catch (err) {
      console.error("Failed to start chat", err);
    }
  };

  const toggleGroupMember = (user) => {
    setSelectedUsers((prev) => {
      if (prev.some((item) => item._id === user._id)) {
        return prev.filter((item) => item._id !== user._id);
      }
      return [...prev, user];
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;

    setCreatingGroup(true);
    try {
      const data = await chatApiPost("/api/chat/conversations", {
        type: "group",
        groupName: groupName.trim(),
        participantIds: selectedUsers.map((member) => member._id),
      });

      if (data.success) {
        resetGroupState();
        onChatCreated(data.conversation);
      }
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const trimmedSearch = searchQuery.trim();
  const hasSearch = trimmedSearch.length > 0;
  const canSearch = trimmedSearch.length >= 2;
  const helperTitle =
    mode === "group" ? "Build your group" : "Start a conversation";
  const helperText = !hasSearch
    ? mode === "group"
      ? "Search for teammates by name or email, then pick at least two members."
      : "Search by name or email to quickly start a direct chat."
    : !canSearch
      ? "Type at least 2 characters to search."
      : loading
        ? "Searching for matching people..."
        : results.length === 0
          ? `No users found for "${trimmedSearch}". Try a different name or email.`
          : `${results.length} ${results.length === 1 ? "person" : "people"} found`;

  return (
    <div className="chat-drawer open">
      <div className="drawer-header">
        <button onClick={onClose} aria-label="Back">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z"></path></svg>
        </button>
        <div className="drawer-header-copy">
          <h2>{mode === "group" ? "Create group" : "New chat"}</h2>
          <p>{mode === "group" ? "Pick at least two members and name the group." : "Search for someone to start chatting."}</p>
        </div>
      </div>

      <div className="drawer-content">
        <div className="new-chat-shell">
          <section className="new-chat-toolbar-card">
            <div className="new-chat-toolbar-copy">
              <span className="new-chat-kicker">Choose chat type</span>
              <h3>{mode === "group" ? "Create a new group" : "Open a direct chat"}</h3>
              <p>
                {mode === "group"
                  ? "Name the group and add members before creating it."
                  : "Search once, then tap a person to start chatting right away."}
              </p>
            </div>

            <div className="new-chat-toolbar" role="tablist" aria-label="Chat type">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "chat"}
                className={`new-chat-mode-btn ${mode === "chat" ? "active" : ""}`}
                onClick={() => handleModeChange("chat")}
              >
                Direct chat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "group"}
                className={`new-chat-mode-btn ${mode === "group" ? "active" : ""}`}
                onClick={() => handleModeChange("group")}
              >
                Create group
              </button>
            </div>
          </section>

          {mode === "group" && (
            <section className="new-group-panel">
              <div className="new-group-panel-header">
                <div>
                  <h4>Group details</h4>
                  <p>Add a clear name and choose at least two people.</p>
                </div>
                <div className="new-group-counter">
                  {selectedUsers.length} selected
                </div>
              </div>

              <div className="chat-input-group">
                <label>Group name</label>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={60}
                />
              </div>

              {selectedUsers.length > 0 && (
                <div className="group-member-list">
                  {selectedUsers.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      className="group-member-chip"
                      onClick={() => toggleGroupMember(member)}
                    >
                      <span>{member.displayName || member.email}</span>
                      <span aria-hidden="true">&times;</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="new-chat-search-card">
            <div className="new-chat-section-head">
              <div>
                <h4>{mode === "group" ? "Find people to add" : "Search people"}</h4>
                <p>Use a name or email address for fast results.</p>
              </div>
              {hasSearch && canSearch && !loading && results.length > 0 && (
                <span className="new-chat-results-count">
                  {results.length} result{results.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="sidebar-search">
              <form className="search-input-wrapper" onSubmit={handleSearch}>
                <button type="submit" className="search-submit-btn" aria-label="Search users">
                  <svg viewBox="0 0 24 24" width="20" height="20" color="currentColor"><path fill="currentColor" d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 001.256-3.386 5.207 5.207 0 10-5.207 5.208 5.183 5.183 0 003.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 110-7.21 3.605 3.605 0 010 7.21z"></path></svg>
                </button>
                <input
                  type="text"
                  placeholder={mode === "group" ? "Search people to add" : "Search by name or email"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {hasSearch && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => {
                      setSearchQuery("");
                      setResults([]);
                    }}
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>
          </section>

          <div className="conversation-list new-chat-results-panel">
            {!hasSearch || !canSearch || loading || results.length === 0 ? (
              <div className="new-chat-helper-card">
                <div className="new-chat-helper-icon" aria-hidden="true">
                  {loading ? "..." : mode === "group" ? "+" : "@"}
                </div>
                <h4>{loading ? "Searching" : helperTitle}</h4>
                <p>{helperText}</p>
              </div>
            ) : (
              results.map((u) => {
                const isSelected = selectedUserIds.has(u._id);

                return (
                  <button
                    key={u._id}
                    type="button"
                    className={`search-result-item ${isSelected ? "search-result-item--selected" : ""}`}
                    onClick={() => (mode === "group" ? toggleGroupMember(u) : handleStartChat(u._id))}
                  >
                    <div className="conversation-avatar">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.displayName} />
                      ) : (
                        u.displayName ? u.displayName.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="conversation-details">
                      <div className="conversation-top">
                        <span className="conversation-name">{u.displayName || u.email}</span>
                        {mode === "group" && (
                          <span className={`selection-pill ${isSelected ? "selected" : ""}`}>
                            {isSelected ? "Added" : "Add"}
                          </span>
                        )}
                      </div>
                      <div className="conversation-last-msg">{u.about || "Available to chat"}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {mode === "group" && (
            <div className="new-group-footer">
              <div className="new-group-summary">
                {selectedUsers.length} member{selectedUsers.length === 1 ? "" : "s"} selected
              </div>
              <button
                type="button"
                className="chat-btn"
                disabled={!groupName.trim() || selectedUsers.length < 2 || creatingGroup}
                onClick={handleCreateGroup}
              >
                {creatingGroup ? "Creating..." : "Create group"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewChat;
