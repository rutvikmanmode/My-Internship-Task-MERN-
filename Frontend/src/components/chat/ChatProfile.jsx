import React, { useMemo, useRef, useState } from "react";
import { chatApiDelete, chatApiPut, chatApiUpload } from "../../chatApiClient";
import "./ChatApp.css";

function ChatProfile({
  user,
  currentUser,
  conversation,
  mode = "self",
  onClose,
  onUserUpdate,
  onConversationUpdate,
  onAlert,
}) {
  const isSelfProfile = mode === "self";
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [about, setAbout] = useState(user?.about || "Hey there! I am using Chat App");
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [memberActionId, setMemberActionId] = useState("");
  const avatarInputRef = useRef(null);

  const groupAdminIds = useMemo(() => {
    if (!conversation) return [];
    if (Array.isArray(conversation.groupAdmins) && conversation.groupAdmins.length > 0) {
      return conversation.groupAdmins.map((admin) => admin?._id || admin).filter(Boolean).map(String);
    }
    if (conversation.groupAdmin?._id || conversation.groupAdmin) {
      return [String(conversation.groupAdmin?._id || conversation.groupAdmin)];
    }
    return [];
  }, [conversation]);

  const getInitials = (name, email) => {
    const source = name || email || "?";
    const parts = source.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Offline";
    const date = new Date(lastSeen);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return `Last seen today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    return `Last seen ${date.toLocaleDateString([], { day: "2-digit", month: "short" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const profileMeta = useMemo(() => {
    if (!user) return null;

    if (conversation?.type === "group") {
      const adminNames = Array.isArray(conversation.groupAdmins) && conversation.groupAdmins.length > 0
        ? conversation.groupAdmins.map((admin) => admin.displayName || admin.email).filter(Boolean)
        : [conversation.groupAdmin?.displayName || conversation.groupAdmin?.email || "admin"];

      return {
        title: conversation.groupName || "Group chat",
        subtitle: `${conversation.participants?.length || 0} members`,
        avatar: conversation.groupAvatar,
        initials: getInitials(conversation.groupName || "Group", ""),
        aboutText: `Admins: ${adminNames.join(", ")}`,
      };
    }

    return {
      title: user.displayName || user.email?.split("@")[0] || "Chat user",
      subtitle: user.isOnline ? "Online" : formatLastSeen(user.lastSeen),
      avatar: user.avatarUrl,
      initials: getInitials(user.displayName, user.email),
      aboutText: user.about || "No about information yet.",
    };
  }, [conversation, user]);

  const isGroupConversation = conversation?.type === "group";
  const isGroupAdmin = Boolean(
    isGroupConversation &&
    currentUser?._id &&
    groupAdminIds.includes(currentUser._id.toString())
  );

  const handleAvatarClick = () => {
    if (isSelfProfile) {
      avatarInputRef.current?.click();
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isSelfProfile) return;
    if (!file.type.startsWith("image/")) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");

      const uploadResult = await chatApiUpload("/api/chat/upload/upload", formData);

      if (uploadResult.success) {
        const profileResult = await chatApiPut("/api/chat/profile", {
          avatarUrl: uploadResult.url,
        });

        if (profileResult.success) {
          onUserUpdate(profileResult.user);
        }
      }
    } catch (err) {
      console.error("Avatar upload failed", err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    try {
      const result = await chatApiPut("/api/chat/profile", { displayName });
      if (result.success) {
        onUserUpdate(result.user);
      }
    } catch (err) {
      console.error("Update name failed", err);
    }
    setEditingName(false);
  };

  const handleSaveAbout = async () => {
    try {
      const result = await chatApiPut("/api/chat/profile", { about });
      if (result.success) {
        onUserUpdate(result.user);
      }
    } catch (err) {
      console.error("Update about failed", err);
    }
    setEditingAbout(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const result = await chatApiPut("/api/chat/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (result.success) {
        setPasswordSuccess("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordSuccess("");
        }, 2000);
      }
    } catch (err) {
      setPasswordError(err.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangeGroupAdmin = async (member) => {
    if (!conversation?._id) return;

    setMemberActionId(`admin-${member._id}`);
    try {
      const result = await chatApiPut(`/api/chat/conversations/${conversation._id}/admin`, {
        adminUserId: member._id,
        action: "add",
      });

      if (result.success) {
        onConversationUpdate?.(result.conversation);
        onAlert?.({
          type: "success",
          message: `${member.displayName || member.email} is now the group admin.`,
        });
      }
    } catch (err) {
      onAlert?.({
        type: "error",
        message: err.data?.message || "Failed to change group admin.",
      });
    } finally {
      setMemberActionId("");
    }
  };

  const handleRemoveMember = async (member) => {
    if (!conversation?._id) return;

    setMemberActionId(`remove-${member._id}`);
    try {
      const result = await chatApiDelete(`/api/chat/conversations/${conversation._id}/members/${member._id}`);

      if (result.success) {
        onConversationUpdate?.(result.conversation);
        onAlert?.({
          type: "success",
          message: `${member.displayName || member.email} was removed from the group.`,
        });
      }
    } catch (err) {
      onAlert?.({
        type: "error",
        message: err.data?.message || "Failed to remove group member.",
      });
    } finally {
      setMemberActionId("");
    }
  };

  const handleRemoveGroupAdmin = async (member) => {
    if (!conversation?._id) return;

    setMemberActionId(`remove-admin-${member._id}`);
    try {
      const result = await chatApiPut(`/api/chat/conversations/${conversation._id}/admin`, {
        adminUserId: member._id,
        action: "remove",
      });

      if (result.success) {
        onConversationUpdate?.(result.conversation);
        onAlert?.({
          type: "success",
          message: `${member.displayName || member.email} is no longer a group admin.`,
        });
      }
    } catch (err) {
      onAlert?.({
        type: "error",
        message: err.data?.message || "Failed to remove group admin.",
      });
    } finally {
      setMemberActionId("");
    }
  };

  if (!user || !profileMeta) {
    return null;
  }

  return (
    <div className="chat-drawer chat-drawer--left chat-profile-drawer open">
      <div className="drawer-header">
        <button onClick={onClose} aria-label="Close profile">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <div className="drawer-header-copy">
          <h2>{isSelfProfile ? "Your profile" : "Contact profile"}</h2>
          <p>{isSelfProfile ? "Manage your account details." : "View contact details and status."}</p>
        </div>
      </div>

      <div className="drawer-content">
        <div className="profile-section profile-section--hero profile-hero">
          <div className="profile-avatar-container">
            <div
              className={`profile-avatar-large ${isSelfProfile ? "profile-avatar-large--editable" : ""}`}
              onClick={handleAvatarClick}
            >
              {uploadingAvatar ? (
                <div className="chat-loading-spinner" style={{ width: 48, height: 48 }}></div>
              ) : profileMeta.avatar ? (
                <img src={profileMeta.avatar} alt={profileMeta.title} />
              ) : (
                <span className="profile-initials">{profileMeta.initials}</span>
              )}

              {isSelfProfile && (
                <div className="profile-avatar-overlay">
                  <svg viewBox="0 0 24 24" width="36" height="36"><path fill="white" d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z"/></svg>
                  <span>{profileMeta.avatar ? "Change photo" : "Add photo"}</span>
                </div>
              )}
            </div>
          </div>

          <div className="profile-hero-text">
            <h3>{profileMeta.title}</h3>
            <p className={`profile-status-line ${conversation?.type !== "group" && user.isOnline ? "profile-status-line--online" : ""}`}>
              {profileMeta.subtitle}
            </p>
          </div>

          {isSelfProfile && (
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarUpload}
            />
          )}
        </div>

        {isSelfProfile ? (
          <>
            <div className="profile-section profile-section--detail">
              <div className="profile-field-label">Your name</div>
              {editingName ? (
                <div className="profile-field-value">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoFocus
                    maxLength={50}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setDisplayName(user.displayName || "");
                      }
                    }}
                  />
                  <button onClick={handleSaveName} title="Save">
                    Save
                  </button>
                </div>
              ) : (
                <div className="profile-field-value">
                  <span>{user.displayName || user.email?.split("@")[0]}</span>
                  <button onClick={() => setEditingName(true)} title="Edit">
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="profile-note">
              This is not your username or pin. This name will be visible to your chat contacts.
            </div>

            <div className="profile-section profile-section--detail">
              <div className="profile-field-label">About</div>
              {editingAbout ? (
                <div className="profile-field-value">
                  <input
                    type="text"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    autoFocus
                    maxLength={140}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveAbout();
                      if (e.key === "Escape") {
                        setEditingAbout(false);
                        setAbout(user.about || "Hey there! I am using Chat App");
                      }
                    }}
                  />
                  <button onClick={handleSaveAbout} title="Save">
                    Save
                  </button>
                </div>
              ) : (
                <div className="profile-field-value">
                  <span>{user.about || "Hey there! I am using Chat App"}</span>
                  <button onClick={() => setEditingAbout(true)} title="Edit">
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="profile-section profile-section--detail">
              <div className="profile-field-label">Email</div>
              <div className="profile-field-value">
                <span>{user.email}</span>
              </div>
            </div>

            <div className="profile-section profile-section--detail">
              {!showChangePassword ? (
                <button
                  className="profile-change-password-btn"
                  onClick={() => setShowChangePassword(true)}
                >
                  Change Password
                </button>
              ) : (
                <form className="profile-password-form" onSubmit={handleChangePassword}>
                  <h3 className="profile-form-title">Change Password</h3>

                  {passwordError && <div className="chat-error">{passwordError}</div>}
                  {passwordSuccess && <div className="profile-success">{passwordSuccess}</div>}

                  <div className="chat-input-group">
                    <label>Current Password</label>
                    <input
                      className="chat-input"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="chat-input-group">
                    <label>New Password</label>
                    <input
                      className="chat-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="chat-input-group">
                    <label>Confirm New Password</label>
                    <input
                      className="chat-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="profile-form-actions">
                    <button type="submit" className="chat-btn" disabled={savingPassword}>
                      {savingPassword ? "Saving..." : "Update Password"}
                    </button>
                    <button
                      type="button"
                      className="chat-btn chat-btn-outline"
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordError("");
                        setPasswordSuccess("");
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="profile-section profile-section--detail">
              <div className="profile-field-label">About</div>
              <div className="profile-field-value profile-field-value--stack">
                <span>{profileMeta.aboutText}</span>
              </div>
            </div>

            {conversation?.type !== "group" && (
              <div className="profile-section profile-section--detail">
                <div className="profile-field-label">Email</div>
                <div className="profile-field-value profile-field-value--stack">
                  <span>{user.email}</span>
                </div>
              </div>
            )}

            {conversation?.type === "group" && Array.isArray(conversation.participants) && (
              <div className="profile-section profile-section--detail">
                <div className="profile-field-label">Members</div>
                <div className="profile-member-list">
                  {conversation.participants.map((member) => {
                    const isCurrentUser = member._id === currentUser?._id;
                    const memberIsAdmin = groupAdminIds.includes(String(member._id));
                    return (
                      <div className="profile-member-row" key={member._id}>
                        <div className="conversation-avatar">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.displayName} />
                          ) : (
                            getInitials(member.displayName, member.email)
                          )}
                        </div>
                        <div className="profile-member-copy">
                          <strong>{member.displayName || member.email}</strong>
                          <span>
                            {isCurrentUser
                              ? "You"
                              : member.isOnline
                                ? "Online"
                                : formatLastSeen(member.lastSeen)}
                          </span>
                        </div>
                        {isGroupConversation && (
                          <div className="profile-member-actions">
                            {memberIsAdmin && (
                              <span className="profile-member-badge">Admin</span>
                            )}

                            {isGroupAdmin && !isCurrentUser && !memberIsAdmin && (
                              <>
                                <button
                                  type="button"
                                  className="profile-member-action-btn"
                                  disabled={Boolean(memberActionId)}
                                  onClick={() => handleChangeGroupAdmin(member)}
                                >
                                  {memberActionId === `admin-${member._id}` ? "Saving..." : "Make admin"}
                                </button>
                                <button
                                  type="button"
                                  className="profile-member-action-btn profile-member-action-btn--danger"
                                  disabled={Boolean(memberActionId)}
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  {memberActionId === `remove-${member._id}` ? "Removing..." : "Remove"}
                                </button>
                              </>
                            )}

                            {isGroupAdmin && !isCurrentUser && memberIsAdmin && (
                              <button
                                type="button"
                                className="profile-member-action-btn"
                                disabled={Boolean(memberActionId) || groupAdminIds.length <= 1}
                                onClick={() => handleRemoveGroupAdmin(member)}
                              >
                                {memberActionId === `remove-admin-${member._id}` ? "Saving..." : "Remove admin"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ChatProfile;
