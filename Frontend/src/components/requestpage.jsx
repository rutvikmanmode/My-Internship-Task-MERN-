import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import "./requestpage.css";
const EMAIL_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requestsLoadCache = new Map();
function formatDisplayDate(value) {
  // Normalize dates for consistent table display.
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function formatEmail(email) {
  // Strip mailto/markdown wrappers before display or send.
  const markdownMailtoMatch = email.match(/^\[([^\]]+)\]\(mailto:[^)]+\)$/i);
  if (markdownMailtoMatch) {
    return markdownMailtoMatch[1];
  }
  return email.replace(/^mailto:/i, "").trim();
}
function validateEmail(email) {
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
function RequestPage({ openContactForm }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [emailSendingId, setEmailSendingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    status: "Open",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [dateFilterDays, setDateFilterDays] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const location = useLocation();
  const requestCacheKey = `${location.key}:${location.state?.refreshAt ?? "initial"}:${reloadKey}`;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + requests.length, totalItems);
  const currentPageRequests = useMemo(() => {
    // Apply date and status filters before rendering rows.
    const now = Date.now();
    const parsedDays = Number.parseInt(dateFilterDays, 10);
    const cutoff =
      Number.isFinite(parsedDays) && parsedDays > 0
        ? now - parsedDays * 24 * 60 * 60 * 1000
        : null;

    return requests
      .filter((request) => {
        if (!cutoff) return true;
        const createdAt = Date.parse(request.createdAt);
        return Number.isFinite(createdAt) && createdAt >= cutoff;
      })
      .filter((request) => {
        if (statusFilter === "all") return true;
        return (request.status || "Open") === statusFilter;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [requests, dateFilterDays, statusFilter]);
  useEffect(() => {
    let ignore = false;
    // Load paginated enquiries with a simple cache to avoid repeat fetches.
    async function loadRequests() {
      setLoading(true);
      setError("");
      try {
        const url = `/api/contact?page=${currentPage}&limit=${itemsPerPage}`;
        let cachedRequest = requestsLoadCache.get(`${requestCacheKey}|${currentPage}|${itemsPerPage}`);
        if (!cachedRequest) {
          cachedRequest = axios.get(url);
          requestsLoadCache.set(`${requestCacheKey}|${currentPage}|${itemsPerPage}`, cachedRequest);
        }
        const { data } = await cachedRequest;
        if (!ignore) {
          setRequests(Array.isArray(data.data) ? data.data : []);
          setTotalItems(Number.isFinite(data.meta?.totalItems) ? data.meta.totalItems : 0);
          setTotalPages(Math.max(1, Number.isFinite(data.meta?.totalPages) ? data.meta.totalPages : 1));
          setCurrentPage(
            Math.max(1, Number.isFinite(data.meta?.page) ? data.meta.page : currentPage)
          );
          setItemsPerPage(
            Math.max(1, Number.isFinite(data.meta?.limit) ? data.meta.limit : itemsPerPage)
          );
        }
      } catch (loadError) {
        requestsLoadCache.delete(`${requestCacheKey}|${currentPage}|${itemsPerPage}`);
        if (!ignore) {
          setError(
            loadError.response?.data?.error ||
              loadError.message ||
              "Failed to load enquiries"
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadRequests();
    return () => {
      ignore = true;
    };
  }, [currentPage, itemsPerPage, requestCacheKey]);
  useEffect(() => {
    if (selectedRequest) {
      setEditForm({
        name: selectedRequest.name,
        email: formatEmail(selectedRequest.email),
        subject: selectedRequest.subject,
        message: selectedRequest.message,
        status: selectedRequest.status || "Open",
      });
      setIsEditing(false);
      setActionError("");
    }
  }, [selectedRequest]);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const updateRequestInState = (updatedRequest) => {
    // Keep list and modal in sync after edits/resolution.
    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request._id === updatedRequest._id ? updatedRequest : request
      )
    );
    setSelectedRequest(updatedRequest);
  };
  const refreshRequests = () => {
    // Bust cache for the current page and refetch.
    requestsLoadCache.delete(`${requestCacheKey}|${currentPage}|${itemsPerPage}`);
    setReloadKey((current) => current + 1);
  };
  const displayRange =
    totalItems === 0 ? "0" : `${startIndex + 1}-${endIndex}`;
  const handleEditChange = ({ target: { name, value } }) => {
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };
  const handleEditSave = async () => {
    // Validate and persist edits for the selected enquiry.
    const trimmedEditForm = {
      ...editForm,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      subject: editForm.subject.trim(),
      message: editForm.message.trim(),
    };
    if (
      !trimmedEditForm.name ||
      !trimmedEditForm.email ||
      !trimmedEditForm.subject ||
      !trimmedEditForm.message
    ) {
      setActionError("Name, email, subject, and message are required");
      return;
    }
    const emailError = validateEmail(editForm.email);
    if (emailError) {
      setActionError(emailError);
      return;
    }
    setIsSaving(true);
    setActionError("");
    try {
      const { data } = await axios.put(
        `/api/contact/${selectedRequest._id}`,
        trimmedEditForm
      );
      updateRequestInState(data.contact);
      setIsEditing(false);
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Failed to update enquiry"
      );
    } finally {
      setIsSaving(false);
    }
  };
  const handleResolve = async () => {
    // Mark enquiry resolved and let backend send the email update.
    setIsSaving(true);
    setActionError("");
    try {
      const { data } = await axios.patch(`/api/contact/${selectedRequest._id}/resolve`);
      updateRequestInState(data.contact);
      window.alert("Resolved email has been sent.");
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Failed to resolve enquiry"
      );
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = async () => {
    // Remove enquiry and adjust pagination if needed.
    setIsSaving(true);
    setActionError("");
    try {
      await axios.delete(`/api/contact/${selectedRequest._id}`);
      setSelectedRequest(null);
      setIsEditing(false);
      if (requests.length === 1 && currentPage > 1) {
        setCurrentPage((current) => current - 1);
      } else {
        refreshRequests();
      }
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Failed to delete enquiry"
      );
    } finally {
      setIsSaving(false);
    }
  };
  const handleSendEmail = async (request) => {
    const formattedEmail = formatEmail(request.email);
    const emailError = validateEmail(formattedEmail);
    if (emailError) {
      window.alert(emailError);
      return;
    }
    setEmailSendingId(request._id);
    try {
      await axios.post(`/api/contact/${request._id}/email`);
      window.alert(`Email sent to ${formattedEmail}`);
    } catch (sendError) {
      window.alert(
        sendError.response?.data?.error ||
          sendError.message ||
          "Failed to send email"
      );
    } finally {
      setEmailSendingId(null);
    }
  };
  return (
    <section className="request-page">
      <div className="request-page__title-shell">
        <h1 className="request-page__title aurora-title aurora-title--secondary">
          <span className="title-main">Contact Enquiry</span>
          <span className="title-subtext">Request Page</span>
          <span className="aurora" aria-hidden="true">
            <span className="aurora__item" />
            <span className="aurora__item" />
            <span className="aurora__item" />
            <span className="aurora__item" />
          </span>
        </h1>
      </div>
      <div className="request-page__header">
        <div className="request-page__filter-menu">
          <button
            type="button"
            className="request-page__filter-button"
            onClick={() => setFilterMenuOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={filterMenuOpen}
          >
            Filter
          </button>
          {filterMenuOpen && (
            <div className="request-page__filter-options" role="menu">
              <label className="request-page__filter-group">
                <span>Enquiry Date</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Days (e.g. 7)"
                  value={dateFilterDays}
                  onChange={(event) => setDateFilterDays(event.target.value)}
                  aria-label="Filter requests by last N days"
                />
              </label>
              <label className="request-page__filter-group">
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter requests by status"
                >
                  <option value="all">All</option>
                  <option value="Open">Open</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </label>
              <button
                type="button"
                className="request-page__filter-apply"
                onClick={() => setFilterMenuOpen(false)}
              >
                Done
              </button>
            </div>
          )}
        </div>
        <button type="button" className="request-page__new-button" onClick={openContactForm}>
          New Request
        </button>
      </div>
      <div className="request-table-card">
        <table className="request-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Creation Date</th>
              <th>Enquiry Number</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="request-table__message">
                  Loading enquiries...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan="6" className="request-table__message request-table__message--error">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && requests.length === 0 && (
              <tr>
                <td colSpan="6" className="request-table__message">
                  No enquiries found.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              currentPageRequests.map((request) => (
                <tr key={request._id}>
                  <td>{request.name}</td>
                  <td>
                    <div className="request-table__email-cell">
                      <span>{formatEmail(request.email)}</span>
                      <button
                        type="button"
                        className="request-table__email-button"
                        onClick={() => handleSendEmail(request)}
                        aria-label={`Send email to ${formatEmail(request.email)}`}
                        disabled={emailSendingId === request._id}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="request-table__email-icon">
                          <path
                            d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 2v.2l8 5.34 8-5.34V8l-8 5.33L4 8Zm16 8V10.6l-7.45 4.97a1 1 0 0 1-1.1 0L4 10.6V16h16Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td>{formatDisplayDate(request.createdAt)}</td>
                  <td>{request.inquireNumber}</td>
                  <td>{request.status || "Open"}</td>
                  <td>
                    <button
                      type="button"
                      className="request-table__menu-button"
                      onClick={() => setSelectedRequest(request)}
                      aria-label={`View details for ${request.inquireNumber}`}
                    >
                      &#8942;
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="request-pagination">
          <span>{displayRange} of {totalItems} items</span>
          <div className="request-pagination__controls">
            <button
              type="button"
              className="request-pagination__nav"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              &#8249;
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`request-pagination__page ${
                  pageNumber === currentPage
                    ? "request-pagination__page--active"
                    : ""
                }`}
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="request-pagination__nav"
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              &#8250;
            </button>
          </div>
          <div className="request-pagination__summary">
            <label className="request-pagination__label" htmlFor="request-items-per-page">
              Items per page
            </label>
            <select
              id="request-items-per-page"
              className="request-pagination__select"
              value={itemsPerPage}
              onChange={(event) => {
                setItemsPerPage(Number(event.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
            <span>Page {currentPage}</span>
          </div>
        </div>
      </div>
      {selectedRequest && (
          <div className="request-modal-overlay" onClick={() => setSelectedRequest(null)}>
            <div className="request-modal" onClick={(event) => event.stopPropagation()}>
              <div className="request-modal__header">
                <div className="request-modal__header-copy">
                  <h2>{selectedRequest.inquireNumber}</h2>
                  <p>Contact info for this request</p>
                </div>
                <div className="request-modal__header-actions">
                  <span className="request-modal__status-badge">
                    {selectedRequest.status || "Open"}
                  </span>
                  <button
                    type="button"
                    className="request-modal__close"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="request-modal__content">
                {isEditing ? (
                <>
                  <label className="request-modal__field">
                    <span>Name:</span>
                    <input type="text" name="name" value={editForm.name} onChange={handleEditChange} />
                  </label>
                  <label className="request-modal__field">
                    <span>Email:</span>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      minLength={EMAIL_MIN_LENGTH}
                      maxLength={EMAIL_MAX_LENGTH}
                      pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                    />
                  </label>
                  <label className="request-modal__field">
                    <span>Subject:</span>
                    <input type="text" name="subject" value={editForm.subject} onChange={handleEditChange} />
                  </label>
                  <label className="request-modal__field">
                    <span>Message:</span>
                    <textarea
                      name="message"
                      value={editForm.message}
                      onChange={handleEditChange}
                      rows="4"
                    />
                  </label>
                  <label className="request-modal__field">
                    <span>Status:</span>
                    <select name="status" value={editForm.status} onChange={handleEditChange}>
                      <option value="Open">Open</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <p className="request-modal__detail"><strong>Name:</strong> {selectedRequest.name}</p>
                  <p className="request-modal__detail"><strong>Email:</strong> {formatEmail(selectedRequest.email)}</p>
                  <p className="request-modal__detail"><strong>Subject:</strong> {selectedRequest.subject}</p>
                  <p className="request-modal__detail request-modal__detail--message">
                    <strong>Message:</strong> {selectedRequest.message}
                  </p>
                </>
              )}
              <p className="request-modal__detail">
                <strong>Creation Date:</strong>{" "}
                {formatDisplayDate(selectedRequest.createdAt)}
              </p>
              {!isEditing && (
                <p className="request-modal__detail">
                  <strong>Status:</strong> {selectedRequest.status || "Open"}
                </p>
              )}
              {actionError && (
                <p className="request-modal__error">{actionError}</p>
              )}
            </div>
            <div className="request-modal__actions">
              <button
                type="button"
                className="request-modal__action-button request-modal__action-button--edit"
                onClick={() => (isEditing ? handleEditSave() : setIsEditing(true))}
                disabled={isSaving}
              >
                {isEditing ? "Save" : "Edit"}
              </button>
              <button
                type="button"
                className="request-modal__action-button request-modal__action-button--resolve"
                onClick={handleResolve}
                disabled={isSaving || selectedRequest.status === "Resolved"}
              >
                {selectedRequest.status === "Resolved" ? "Resolved" : "Resolve"}
              </button>
              <button
                type="button"
                className="request-modal__action-button request-modal__action-button--danger"
                onClick={handleDelete}
                disabled={isSaving}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
export default RequestPage;
