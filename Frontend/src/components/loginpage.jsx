import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../apiClient";
import "./loginpage.css";

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  // ── Login State ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // ── Forgot Password State ──
  // step: "login" | "forgot-email" | "forgot-otp" | "forgot-reset" | "forgot-done"
  const [step, setStep] = useState("login");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── General State ──
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "error" });
  const toastTimerRef = useRef(null);
  const cooldownRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast({ message: "", type });
    }, 3500);
  };

  const startCooldown = () => {
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required.";
    if (value.length < 8) return "Password must be at least 8 characters.";
    if (/\s/.test(value)) return "Password cannot contain spaces.";
    if (!/[A-Z]/.test(value)) return "Password must include at least 1 uppercase letter.";
    if (!/[a-z]/.test(value)) return "Password must include at least 1 lowercase letter.";
    if (!/[0-9]/.test(value)) return "Password must include at least 1 number.";
    if (!/[@#$%^&*]/.test(value)) {
      return "Password must include at least 1 special character (@#$%^&*).";
    }
    return "";
  };

  // ── Handlers ──

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiPost("/api/auth/login", { email, password });

      // Store JWT and notify parent.
      localStorage.setItem("token", data.token);
      if (onLogin) onLogin(data.token);
      navigate("/profile");
    } catch (err) {
      if (err.status === 401) {
        setError("Invalid email or password.");
      } else if (err.status === 403) {
        setError("Unauthorized request.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSendOtp = async (e) => {
    e?.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await apiPost("/api/auth/forgot-password/send-otp", { email: email.trim() });
      setStep("forgot-otp");
      setError("");
      startCooldown();
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiPost("/api/auth/forgot-password/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
      setResetToken(data.resetToken);
      setStep("forgot-reset");
      setError("");
      setOtp("");
    } catch (err) {
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setError("");

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiPost("/api/auth/forgot-password/reset", {
        resetToken,
        newPassword,
      });
      setSuccess(data.message || "Password reset successfully.");
      setStep("forgot-done");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setStep("login");
    setError("");
    setSuccess("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setResetToken("");
  };

  return (
    <section className="login-page">
      {toast.message && (
        <div className={`login-toast login-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
      <div className="login-page__title-shell">
        <h1 className="login-page__title aurora-title aurora-title--secondary">
          <span className="title-main">Account Access</span>
          <span className="title-subtext">Login Page</span>
          <span className="aurora" aria-hidden="true">
            <span className="aurora__item" />
            <span className="aurora__item" />
            <span className="aurora__item" />
            <span className="aurora__item" />
          </span>
        </h1>
      </div>

      <div className="login-card">
        <div className="login-card__intro">
          <span className="login-card__eyebrow">Welcome back</span>
          <h2>Sign in to your Dashboard</h2>
          <p>
            Keep track of tasks, requests, and team updates with one secure
            account. Your dashboard is waiting.
          </p>
          <div className="login-card__highlight">
            <span>Tip</span>
            <p>Use Strong passwords and update them regularly.</p>
          </div>
        </div>

        <div className="login-card__form-shell">
          
          {/* ── Login Form ── */}
          {step === "login" && (
            <>
              <h3 className="login-card__form-title">Login Details</h3>
              <form className="login-form" onSubmit={handleLoginSubmit}>
                {error && (
                  <p style={{ color: "#ff6b6b", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                    {error}
                  </p>
                )}
                <label className="login-form__field">
                  <span>Email address</span>
                  <input
                    type="email"
                    placeholder="Your Mail ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="login-form__field">
                  <span>Password</span>
                  <div className="login-form__password">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="login-form__toggle"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                <div className="login-form__row">
                  <label className="login-form__checkbox">
                    <input type="checkbox" />
                    Remember me
                  </label>
                  <button 
                    type="button" 
                    className="login-form__link"
                    onClick={() => { setStep("forgot-email"); setError(""); }}
                  >
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  className="login-form__submit"
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
                <p className="login-form__footer">
                  New here?{" "}
                  <button
                    type="button"
                    className="login-form__link login-form__link--inline"
                    onClick={() => navigate("/register")}
                  >
                    Create your account.
                  </button>
                </p>
              </form>
            </>
          )}

          {/* ── Forgot Password Step 1: Email ── */}
          {step === "forgot-email" && (
            <>
              <h3 className="login-card__form-title">Reset Password</h3>
              <form className="login-form" onSubmit={handleForgotSendOtp}>
                <p className="login-otp__hint">
                  Enter your email address to receive a password reset OTP.
                </p>
                {error && (
                  <p style={{ color: "#ff6b6b", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                    {error}
                  </p>
                )}
                <label className="login-form__field">
                  <span>Email address</span>
                  <input
                    type="email"
                    placeholder="Your Mail ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </label>
                <button
                  type="submit"
                  className="login-form__submit"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
                <div style={{ marginTop: "12px", textAlign: "center" }}>
                  <button type="button" className="login-otp__back" onClick={resetToLogin}>
                    ← Back to Login
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Forgot Password Step 2: Verify OTP ── */}
          {step === "forgot-otp" && (
            <>
              <h3 className="login-card__form-title">Verify Email</h3>
              <form className="login-form" onSubmit={handleForgotVerifyOtp}>
                <p className="login-otp__hint">
                  We sent a 6-digit code to <strong>{email}</strong>.
                </p>
                {error && (
                  <p style={{ color: "#ff6b6b", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                    {error}
                  </p>
                )}
                <label className="login-form__field">
                  <span>One-Time Password</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="login-otp__input"
                    autoFocus
                  />
                </label>
                <button
                  type="submit"
                  className="login-form__submit"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
                <div className="login-otp__actions">
                  <button
                    type="button"
                    className="login-otp__resend"
                    onClick={() => handleForgotSendOtp()}
                    disabled={resendCooldown > 0 || loading}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                  <button type="button" className="login-otp__back" onClick={resetToLogin}>
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Forgot Password Step 3: Reset Password ── */}
          {step === "forgot-reset" && (
            <>
              <h3 className="login-card__form-title">Set New Password</h3>
              <form className="login-form" onSubmit={handleForgotReset}>
                {error && (
                  <p style={{ color: "#ff6b6b", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                    {error}
                  </p>
                )}
                <label className="login-form__field">
                  <span>New Password</span>
                  <div className="login-form__password">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="login-form__toggle"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                <label className="login-form__field">
                  <span>Confirm Password</span>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="login-form__submit"
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Update Password"}
                </button>
                <div style={{ marginTop: "12px", textAlign: "center" }}>
                  <button type="button" className="login-otp__back" onClick={resetToLogin}>
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Forgot Password Step 4: Success ── */}
          {step === "forgot-done" && (
            <div className="login-otp__success">
              <div className="login-otp__check">✓</div>
              <h3 className="login-card__form-title">Password Reset!</h3>
              <p style={{ color: "#51cf66", marginBottom: "1rem", fontSize: "0.95rem" }}>
                {success}
              </p>
              <button
                type="button"
                className="login-form__submit"
                style={{ width: "100%" }}
                onClick={resetToLogin}
              >
                Return to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

export default LoginPage;
