import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../apiClient";
import "./profilepage.css";

function ProfilePage({ onLogout }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [about, setAbout] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillsInput, setSkillsInput] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const data = await apiGet("/api/profile");
        if (!cancelled) {
          setEmail(data.email);
          setName(data.name || "");
          setPhone(data.phone || "");
          setRole(data.role || "");
          setAbout(data.about || "");
          const nextSkills = Array.isArray(data.skills) ? data.skills : [];
          setSkills(nextSkills);
          setSkillsInput(nextSkills.join(", "));
          setLocation(data.location || "");
          setAvatarUrl(data.avatarUrl || "");
        }
      } catch (err) {
        if (!cancelled) {
          if (err.status === 401) {
            // Token expired or invalid -- log out.
            localStorage.removeItem("token");
            if (onLogout) onLogout();
            navigate("/login");
          } else {
            setError(err.message || "Failed to load profile.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate, onLogout]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    if (onLogout) onLogout();
    navigate("/login");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setError("");
    try {
      const skillsPayload = skillsInput
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      const data = await apiPut("/api/profile", {
        name,
        phone,
        about,
        skills: skillsPayload,
      });
      setSuccessMsg("Profile updated successfully!");
      setName(data.name || "");
      setPhone(data.phone || "");
      setAbout(data.about || "");
      const savedSkills = Array.isArray(data.skills) ? data.skills : [];
      setSkills(savedSkills);
      setSkillsInput(savedSkills.join(", "));
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccessMsg("");

    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
      });

      const data = await apiPut("/api/photos/profile", { imageData });
      setAvatarUrl(data.avatarUrl || "");
      setSuccessMsg("Profile photo updated!");
    } catch (err) {
      setError(err.message || "Failed to upload profile photo.");
    } finally {
      setUploading(false);
    }
  };

  const displayName = name || "John Doe";
  const roleTitle = role || "Software Developer";
  const displaySkills = skills;
  const aboutText = about || "";
  const displayLocation = location || "San Francisco, CA";
  const contactItems = [
    {
      label: "Email",
      value: email || "john.doe@example.com",
      icon: "@",
    },
    {
      label: "Phone",
      value: phone || "",
      icon: "P",
    },
    {
      label: "Location",
      value: displayLocation,
      icon: "L",
    },
  ];
  const initials = useMemo(() => {
    const base = (displayName || email || "JD").trim();
    if (!base) return "JD";
    const parts = base.split(" ").filter(Boolean);
    const letters = parts.length
      ? parts.slice(0, 2).map((part) => part[0])
      : [base[0]];
    return letters.join("").toUpperCase();
  }, [displayName, email]);

  return (
    <section className="profile-page">
      <div className="profile-card">
        <aside className="profile-card__sidebar">
          <div className="profile-avatar" aria-hidden="true">
            <div className="profile-avatar__ring" />
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="profile-avatar__image"
              />
            ) : (
              <div className="profile-avatar__image">{initials}</div>
            )}
          </div>
          <h2 className="profile-name">{displayName}</h2>
          <p className="profile-role">{roleTitle}</p>
          <button
            type="button"
            className="profile-btn profile-btn--primary"
            onClick={() => setIsEditing((value) => !value)}
            disabled={loading}
          >
            {isEditing ? "Close Edit" : "Edit Profile"}
          </button>
          <div className="profile-actions">
            <button
              type="button"
              className="profile-btn profile-btn--ghost"
              onClick={handleLogout}
            >
              Logout
            </button>
            <button
              type="button"
              className="profile-link"
              onClick={() => navigate("/")}
            >
              {"<- Back to Dashboard"}
            </button>
          </div>
        </aside>

        <div className="profile-card__content">
          {loading && <p className="profile-status">Loading profile...</p>}
          {error && <p className="profile-status profile-status--error">{error}</p>}
          {!loading && !error && (
            <>
              <section className="profile-section">
                <h3>About Me</h3>
                <p>{aboutText}</p>
              </section>

              <section className="profile-section">
                <h3>Skills</h3>
                <div className="profile-skills">
                  {displaySkills.map((skill) => (
                    <span key={skill} className="profile-skill">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              <section className="profile-section">
                <h3>Contact Information</h3>
                <div className="profile-info">
                  {contactItems.map((item) => (
                    <div key={item.label} className="profile-info__item">
                      <span className="profile-info__icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div>
                        <span className="profile-info__label">{item.label}</span>
                        <span className="profile-info__value">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {isEditing && !loading && !error && (
        <div className="profile-modal" role="dialog" aria-modal="true">
          <div
            className="profile-modal__backdrop"
            onClick={() => setIsEditing(false)}
            aria-hidden="true"
          />
          <div className="profile-modal__panel">
            <div className="profile-modal__header">
              <h3>Edit Details</h3>
              <button
                type="button"
                className="profile-modal__close"
                onClick={() => setIsEditing(false)}
                aria-label="Close edit form"
              >
                x
              </button>
            </div>
            {successMsg && (
              <p className="profile-status profile-status--success">
                {successMsg}
              </p>
            )}
              <form onSubmit={handleSaveProfile} className="profile-form">
              <label className="profile-form__field">
                <span>Email</span>
                <input type="email" value={email} readOnly disabled />
              </label>
              <label className="profile-form__field">
                <span>Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                />
              </label>
              <label className="profile-form__field">
                <span>Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your Phone Number"
                />
              </label>
              <label className="profile-form__field">
                <span>About</span>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </label>
                <label className="profile-form__field">
                  <span>Skills (comma separated)</span>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="JavaScript, React, Node.js"
                  />
                </label>
                <label className="profile-form__field">
                  <span>Profile Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadPhoto(e.target.files?.[0])}
                    disabled={uploading}
                  />
                </label>
                <div className="profile-modal__actions">
                  <button
                    type="submit"
                    className="profile-btn profile-btn--primary"
                    disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="profile-btn profile-btn--ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProfilePage;
