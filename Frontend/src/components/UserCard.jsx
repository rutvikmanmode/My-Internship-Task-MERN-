import React, { useState } from "react";
import "./UserCard.css";
import usersData from "../data/users.json";

function UserCard() {
  const [users, setUsers] = useState(usersData);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    role: "",
    location: "",
    image: "",
  });

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim().toLowerCase());
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setNewUser((currentUser) => ({
      ...currentUser,
      [name]: value,
    }));
  };

  const handleAddUser = (event) => {
    event.preventDefault();

    if (
      !newUser.name.trim() ||
      !newUser.role.trim() ||
      !newUser.location.trim()
    ) {
      return;
    }

    setUsers((currentUsers) => [
      ...currentUsers,
      {
        id: Date.now(),
        ...newUser,
        image: newUser.image.trim() || "https://via.placeholder.com/150",
      },
    ]);

    setNewUser({
      name: "",
      role: "",
      location: "",
      image: "",
    });
    setShowAddForm(false);
  };

  const filteredUsers = users.filter((currentUser) => {
    if (!searchTerm) {
      return true;
    }

    return (
      currentUser.name.toLowerCase().includes(searchTerm) ||
      currentUser.role.toLowerCase().includes(searchTerm) ||
      currentUser.location.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <section className="user-page">
      <div className="user-title-shell">
        <h1 className="user-title aurora-title aurora-title--secondary">
          <span className="title-main">User</span>
          <span className="title-subtext">Cards</span>
          <span className="aurora" aria-hidden="true">
            <span className="aurora__item" />
            <span className="aurora__item" />
            <span className="aurora__item" />
            <span className="aurora__item" />
          </span>
        </h1>
      </div>

      <form onSubmit={handleSearch} className="user-toolbar">
        <input
          type="text"
          placeholder="Search users"
          value={searchInput}
          onChange={(event) => {
            const value = event.target.value;
            setSearchInput(value);

            if (!value.trim()) {
              setSearchTerm("");
            }
          }}
          className="user-input user-search-input"
        />
        <button type="submit" className="user-btn user-toolbar-btn">
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm((currentValue) => !currentValue)}
          className="user-btn user-toolbar-btn"
        >
          {showAddForm ? "Close Form" : "Add User"}
        </button>
      </form>

      {showAddForm && (
        <form onSubmit={handleAddUser} className="user-form">
          <input
            type="text"
            name="name"
            placeholder="User Name"
            value={newUser.name}
            onChange={handleChange}
            className="user-input"
          />
          <input
            type="text"
            name="role"
            placeholder="Role"
            value={newUser.role}
            onChange={handleChange}
            className="user-input"
          />
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={newUser.location}
            onChange={handleChange}
            className="user-input"
          />
          <input
            type="text"
            name="image"
            placeholder="Image URL"
            value={newUser.image}
            onChange={handleChange}
            className="user-input"
          />
          <button type="submit" className="user-btn user-save-btn">
            Save User
          </button>
        </form>
      )}

      <div className="card-grid">
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            className="card"
            onClick={() => setSelectedUser(u)}
          >
            <img src={u.image} alt={u.name} className="avatar" />
            <h2>{u.name}</h2>
            <p className="role">{u.role}</p>
            <p className="location">{u.location}</p>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <p className="user-empty-state">No users found.</p>
      )}

      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          className="user-modal-overlay"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="user-modal"
          >
            <div className="user-modal__header">
              <div className="user-modal__header-copy">
                <h2 className="user-modal__title">{selectedUser.name}</h2>
                <p className="user-modal__subtitle">User profile details</p>
              </div>
              <button
                type="button"
                className="user-modal__close"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>

            <div className="user-modal__content">
            <img
              src={selectedUser.image}
              alt={selectedUser.name}
              className="avatar user-modal__avatar"
            />
            <p className="user-modal__detail">
              <strong>Role:</strong> {selectedUser.role}
            </p>
            <p className="user-modal__detail">
              <strong>Location:</strong> {selectedUser.location}
            </p>
            <p className="user-modal__detail">
              <strong>User ID:</strong> {selectedUser.id}
            </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default UserCard;
