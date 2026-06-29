import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../apiClient";
import "./register.css";

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "error" });
  const toastTimerRef = useRef(null);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
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

  const validateEmail = (value) => {
    const raw = value || "";
    const trimmed = raw.trim();
    if (!trimmed) return "Email is required.";
    if (trimmed.length < 6) return "Email must be at least 6 characters.";
    if (trimmed.length > 254) return "Email must be 254 characters or less.";
    if (/\s/.test(raw)) return "Email cannot contain spaces.";

    const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
    if (!emailPattern.test(trimmed)) {
      return "Enter a valid email address (e.g., user@company.com).";
    }
    return "";
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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiPost("/api/auth/register/send-otp", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setOtpSent(true);
      setError("");
      showToast("OTP sent to your email!", "success");
      startCooldown();
    } catch (err) {
      const message = err?.message || "";
      if (err?.status === 409 || /already\s+registered|already\s+exists|already\s+taken/i.test(message)) {
        showToast("Email already registered.");
        setError("Email already registered.");
      } else if (err.status === 403) {
        setError("Unauthorized request.");
      } else {
        setError(err.message || "Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiPost("/api/auth/register/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
      setOtpVerified(true);
      setSuccess(data.message || "Account verified and registered successfully!");
      showToast("Account created successfully!", "success");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setOtp("");
    } catch (err) {
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      await apiPost("/api/auth/register/send-otp", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      showToast("OTP resent to your email.", "success");
      startCooldown();
    } catch (err) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="register-page">
      {toast.message && (
        <div className={`register-toast register-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
      <div className="register-page__title-shell">
        <h1 className="register-page__title aurora-title aurora-title--secondary">
          <span className="title-main">Create Account</span>
          <span className="title-subtext">Register</span>
          <span className="aurora" aria-hidden="true">
            <span className="aurora__item" />
            <span className="aurora__item" />
            <span className="aurora__item" />
            <span className="aurora__item" />
          </span>
        </h1>
      </div>

      <div className="register-card">
        <div className="register-card__intro">
          <span className="register-card__eyebrow">Get started</span>
          <h2>Set up your workspace profile</h2>
          <p>
            Create your account to manage projects, track requests, and
            collaborate with your team.
          </p>
          <div className="register-card__highlight">
            <span>Secure</span>
            <p>Your details stay private and encrypted.</p>
          </div>
        </div>

        <div className="register-card__form-shell">
          {otpVerified ? (
            <div className="register-otp__success">
              <div className="register-otp__check">✓</div>
              <h3 className="register-card__form-title">Account Created!</h3>
              <p style={{ color: "#51cf66", marginBottom: "1rem", fontSize: "0.95rem" }}>
                {success}
              </p>
              <button
                type="button"
                className="register-form__submit"
                onClick={() => navigate("/login")}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <h3 className="register-card__form-title">Register Details</h3>
              <form className="register-form" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
                {error && (
                  <p style={{ color: "#ff6b6b", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                    {error}
                  </p>
                )}
                <label className="register-form__field">
                  <span>Full name</span>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={otpSent}
                  />
                </label>
                <label className="register-form__field">
                  <span>Work email</span>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={otpSent}
                  />
                </label>
                <label className="register-form__field">
                  <span>Password</span>
                  <div className="register-form__password">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={otpSent}
                    />
                    <button
                      type="button"
                      className="register-form__toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={otpSent}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                <label className="register-form__field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={otpSent}
                  />
                </label>

                {/* ── OTP Verification Section ── */}
                {otpSent && (
                  <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="register-otp__hint" style={{ marginBottom: "12px", textAlign: "center" }}>
                      OTP sent to <strong>{email}</strong>
                    </p>
                    <label className="register-form__field" style={{ marginBottom: "8px" }}>
                      <span>Enter OTP</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className="register-otp__input"
                        autoFocus
                      />
                    </label>
                    <div className="register-otp__actions" style={{ marginTop: "8px" }}>
                      <button
                        type="button"
                        className="register-otp__resend"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || loading}
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                      </button>
                      <button
                        type="button"
                        className="register-otp__back"
                        onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}
                      >
                        Change Email
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="register-form__submit"
                  disabled={loading}
                  style={{ marginTop: "1rem" }}
                >
                  {loading ? "Processing..." : (otpSent ? "Verify OTP & Create Account" : "Send OTP to Email")}
                </button>
                <p className="register-form__footer">
                  Already have an account?{" "}
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#74c0fc",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: "inherit",
                      padding: 0,
                    }}
                    onClick={() => navigate("/login")}
                  >
                    Head back to login.
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default RegisterPage;
