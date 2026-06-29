import React, { useEffect, useState } from "react";
import { chatApiPost } from "../../chatApiClient";
import authPreviewImage from "../../assets/download.jpg";
import "./ChatApp.css";

function ChatAuth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");

    if (authError === "google_not_configured") {
      setError("Google sign-in is not configured on the backend yet. Add real Google OAuth credentials in the backend .env.");
    } else if (authError === "google_failed") {
      setError("Google sign-in failed. Check the Google OAuth client settings and callback URL.");
    }

    if (authError) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/chat/auth/login" : "/api/chat/auth/signup";
      const payload = isLogin ? { email, password } : { email, password, displayName: name };
      
      const data = await chatApiPost(endpoint, payload);
      
      if (data.success && data.user) {
        onAuthSuccess(data.user);
      } else {
        setError(data.message || "Authentication failed");
      }
    } catch (err) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Redirect to backend Google OAuth route
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000"}/api/chat/auth/google`;
  };

  return (
    <div className="chat-auth-container">
      <div className="chat-auth-background"></div>
      
      <div className="chat-auth-card chat-auth-card--split">
        <div className="chat-auth-visual">
          <img src={authPreviewImage} alt="Chat app preview" className="chat-auth-visual-image" />
          <div className="chat-auth-visual-overlay"></div>
          <div className="chat-auth-visual-badge">Chat App</div>
          <div className="chat-auth-visual-copy">
            <span className="chat-auth-kicker">Connected Conversations</span>
            <h2>Stay close to your people with one clean workspace.</h2>
            <p>Fast messaging, thoughtful design, and the same theme as the rest of your app.</p>
          </div>
        </div>

        <div className="chat-auth-content">
          <div className="chat-auth-header">
            <span className="chat-auth-kicker">Chat App</span>
            <h1>{isLogin ? "Welcome back" : "Create an account"}</h1>
            <p>{isLogin ? "Sign in to access your chats" : "Sign up to start chatting"}</p>
          </div>

          {error && <div className="chat-error">{error}</div>}

          <form className="chat-auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="chat-input-group">
                <label>Display Name</label>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Your display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="chat-input-group">
              <label>Email Address</label>
              <input
                type="email"
                className="chat-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="chat-input-group">
              <label>Password</label>
              <div className="chat-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  className="chat-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="chat-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="chat-btn" disabled={loading}>
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Sign Up")}
            </button>
          </form>

          <div className="chat-auth-divider">or continue with</div>

          <button 
            onClick={handleGoogleAuth} 
            className="chat-btn chat-btn-outline chat-auth-google-btn" 
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
              <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
              <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
              <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          <div className="chat-auth-switch">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>

          <p className="chat-auth-footnote">
            Secure sign-in for your themed chat workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatAuth;
