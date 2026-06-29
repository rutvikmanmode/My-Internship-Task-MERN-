import { useRef, useState } from "react";
import axios from "axios";
import "./Contactform.css";

const initialFormData = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const EMAIL_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  // Basic email validation shared with backend rules.
  if (!email) {
    return "Email is required";
  }

  if (/\s/.test(email)) {
    return "Email must not contain spaces";
  }

  if (email.length < EMAIL_MIN_LENGTH || email.length > EMAIL_MAX_LENGTH) {
    return `Email must be ${EMAIL_MIN_LENGTH}-${EMAIL_MAX_LENGTH} characters long`;
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Enter a valid email address";
  }

  return "";
}

function Contatform({ onInquiryCreated }) {
  const [formData, setFormData] = useState(initialFormData);
  const [submitState, setSubmitState] = useState({
    loading: false,
    error: "",
    success: "",
  });
  const isSubmittingRef = useRef(false);

  const handleChange = ({ target: { name, value } }) => {
    // Update form fields in a controlled way.
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    // Validate inputs and submit to the API.
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const trimmedFormData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    };

    if (
      !trimmedFormData.name ||
      !trimmedFormData.email ||
      !trimmedFormData.subject ||
      !trimmedFormData.message
    ) {
      setSubmitState({
        loading: false,
        error: "Name, email, subject, and message are required",
        success: "",
      });
      return;
    }

    const emailError = validateEmail(formData.email);

    if (emailError) {
      setSubmitState({
        loading: false,
        error: emailError,
        success: "",
      });
      return;
    }

    setSubmitState({
      loading: true,
      error: "",
      success: "",
    });
    isSubmittingRef.current = true;

    try {
      const { data } = await axios.post(
        import.meta.env.VITE_CONTACT_API_URL || "/api/contact",
        trimmedFormData
      );

      setFormData(initialFormData);
      setSubmitState({
        loading: false,
        error: "",
        success: data.message || "Inquiry created successfully",
      });

      if (onInquiryCreated) {
        onInquiryCreated();
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to send message";

      setSubmitState({
        loading: false,
        error: errorMessage,
        success: "",
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <section className="contact-page">
      <div className="contact-card">
        <div className="contact-card__info">
          <div className="contact-title-shell">
            <h1 className="contact-title aurora-title aurora-title--contact">
              <span className="title-main">Let's Chat</span>
              <span className="title-subtext">We are here to help</span>
              <span className="aurora" aria-hidden="true">
                <span className="aurora__item" />
                <span className="aurora__item" />
                <span className="aurora__item" />
                <span className="aurora__item" />
              </span>
            </h1>
          </div>
          <p className="contact-card__lead">
            Whether you have a question, want to start a project or simply want
            to connect.
          </p>
          <p>
            Feel free to send me a message in the contact form.
          </p>
        </div>

        <div className="contact-card__form-shell">
          <h2 className="contact-form-shell__title">Contact</h2>
          <form className="contact-form" onSubmit={handleSubmit}>
            <label className="contact-form__field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </label>

            <label className="contact-form__field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                minLength={EMAIL_MIN_LENGTH}
                maxLength={EMAIL_MAX_LENGTH}
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
              />
            </label>

            <label className="contact-form__field">
              <span>Subject</span>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </label>

            <label className="contact-form__field">
              <span>Message</span>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </label>

            {submitState.error && (
              <p className="contact-form__status contact-form__status--error">
                {submitState.error}
              </p>
            )}

            {submitState.success && (
              <p className="contact-form__status contact-form__status--success">
                {submitState.success}
              </p>
            )}

            <button
              type="submit"
              className="contact-form__submit"
              disabled={submitState.loading}
            >
              {submitState.loading ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Contatform;
