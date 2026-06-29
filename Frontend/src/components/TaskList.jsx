import React, { useEffect, useRef, useState } from "react";
import "./TaskList.css";
import taskData from "../data/task.json";

const STATUS_LABELS = ["Completed", "In Progress", "Pending"];

function TaskList({
  openUserCard,
  openRequestPage,
  openLoginPage,
  openChatApp,
  openGameApp,
  isDarkMode,
  toggleTheme,
}) {
  const [tasks, setTasks] = useState(taskData);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium",
    status: "Pending",
    dueDate: "",
  });
  const [animatedStats, setAnimatedStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  });
  const pageRef = useRef(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setNewTask((currentTask) => ({
      ...currentTask,
      [name]: value,
    }));
  };

  const handleAddTask = (event) => {
    event.preventDefault();

    if (
      !newTask.title.trim() ||
      !newTask.description.trim() ||
      !newTask.dueDate.trim()
    ) {
      return;
    }

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id: Date.now(),
        ...newTask,
      },
    ]);

    setNewTask({
      title: "",
      description: "",
      priority: "Medium",
      status: "Pending",
      dueDate: "",
    });
    setShowAddForm(false);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim().toLowerCase());
  };

  const filteredTasks = tasks.filter((task) => {
    if (!searchTerm) {
      return true;
    }

    return (
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm) ||
      task.priority.toLowerCase().includes(searchTerm) ||
      task.status.toLowerCase().includes(searchTerm) ||
      task.dueDate.toLowerCase().includes(searchTerm)
    );
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === "Completed").length,
    inProgress: tasks.filter((task) => task.status === "In Progress").length,
    pending: tasks.filter((task) => task.status === "Pending").length,
  };

  useEffect(() => {
    const targets = {
      total: stats.total,
      completed: stats.completed,
      inProgress: stats.inProgress,
      pending: stats.pending,
    };

    const timer = window.setInterval(() => {
      let isComplete = true;

      setAnimatedStats((currentStats) => {
        const nextStats = { ...currentStats };

        Object.keys(targets).forEach((key) => {
          if (currentStats[key] !== targets[key]) {
            isComplete = false;
            const difference = targets[key] - currentStats[key];
            nextStats[key] = currentStats[key] + Math.sign(difference);
          }
        });

        return nextStats;
      });

      if (isComplete) {
        window.clearInterval(timer);
      }
    }, 70);

    return () => window.clearInterval(timer);
  }, [stats.completed, stats.inProgress, stats.pending, stats.total]);

  useEffect(() => {
    const pageElement = pageRef.current;

    if (!pageElement) {
      return undefined;
    }

    const revealElements = pageElement.querySelectorAll(".reveal-on-scroll");

    if (!revealElements.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [filteredTasks.length, showAddForm]);

  const formatDate = (dueDate) => {
    const parsedDate = new Date(`${dueDate}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return dueDate;
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(parsedDate);
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.status === "Completed") {
      return false;
    }

    const today = new Date();
    const dueDate = new Date(`${task.dueDate}T00:00:00`);
    today.setHours(0, 0, 0, 0);

    return dueDate < today;
  };

  const getPriorityClassName = (priority) =>
    `priority-${priority.toLowerCase()}`;

  const getStatusClassName = (status) =>
    `status-${status.toLowerCase().replace(/\s+/g, "-")}`;

  const statCards = [
    {
      label: "Total Tasks",
      value: animatedStats.total,
      accent: "total",
      hint: `${filteredTasks.length} showing now`,
    },
    {
      label: "Completed",
      value: animatedStats.completed,
      accent: "completed",
      hint: "Wrapped and ready",
    },
    {
      label: "In Progress",
      value: animatedStats.inProgress,
      accent: "in-progress",
      hint: "Active focus items",
    },
    {
      label: "Pending",
      value: animatedStats.pending,
      accent: "pending",
      hint: "Queued up next",
    },
  ];

  const completionRate = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;
  const remainingTasks = stats.total - stats.completed;
  const featuredActions = [
    {
      id: "usercard",
      eyebrow: "Project 1",
      title: "Open User Card",
      description: "Jump into the profile experience linked from the first task card.",
      onClick: () => openUserCard(1),
    },
    {
      id: "requests",
      eyebrow: "Project 2",
      title: "Open Requests",
      description: "Review the request page from the same landing workspace.",
      onClick: openRequestPage,
    },
    {
      id: "login",
      eyebrow: "Project 3",
      title: "Open Login",
      description: "Navigate to the authentication flow directly from the landing hero.",
      onClick: openLoginPage,
    },
    {
      id: "chat",
      eyebrow: "Project 4",
      title: "Open Chat App",
      description: "Launch the real-time Chat App with a polished messaging interface.",
      onClick: openChatApp,
    },
    {
      id: "game",
      eyebrow: "Project 5",
      title: "Open Game App",
      description: "Explore the gamified productivity landing page with rewards and leaderboards.",
      onClick: openGameApp,
    },
  ];

  return (
    <div
      className="container mx-auto antialiased selection:bg-orange-300/60 selection:text-neutral-900"
      ref={pageRef}
    >
      <div className="task-theme-toggle">
        <label className="switch">
          <input
            id="input"
            type="checkbox"
            checked={isDarkMode}
            onChange={toggleTheme}
            aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
          />
          <div className="slider round">
            <div className="sun-moon">
              <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>

              <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
              <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" />
              </svg>
            </div>
            <div className="stars">
              <svg id="star-1" className="star" viewBox="0 0 20 20">
                <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
              </svg>
              <svg id="star-2" className="star" viewBox="0 0 20 20">
                <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
              </svg>
              <svg id="star-3" className="star" viewBox="0 0 20 20">
                <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
              </svg>
              <svg id="star-4" className="star" viewBox="0 0 20 20">
                <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
              </svg>
            </div>
          </div>
        </label>
      </div>

      <section className="task-hero reveal-on-scroll is-visible relative isolate">
        <div className="task-hero-particles" aria-hidden="true">
          <span className="task-float-dot task-float-dot--1" />
          <span className="task-float-dot task-float-dot--2" />
          <span className="task-float-dot task-float-dot--3" />
          <span className="task-float-dot task-float-dot--4" />
          <span className="task-float-icon task-float-icon--1">✦</span>
          <span className="task-float-icon task-float-icon--2">⌚</span>
          <span className="task-float-icon task-float-icon--3">☑</span>
          <span className="task-float-icon task-float-icon--4">⚡</span>
          <span className="task-float-icon task-float-icon--5">✧</span>
          <span className="task-float-icon task-float-icon--6">⚑</span>
        </div>
        <div className="task-hero-grid">
          <div className="task-hero-copy-shell">
            <div className="task-hero-greeting task-glass-chip">
              <span className="task-hero-greeting-icon">🌅</span>
              <span>Good Morning, Rutvik</span>
              <span className="task-hero-greeting-mark">⌁</span>
            </div>

            <div className="task-hero-orbit">
              <span className="task-hero-ring task-hero-ring--outer" />
              <span className="task-hero-ring task-hero-ring--mid" />
              <span className="task-hero-ring task-hero-ring--inner" />

              <div className="title-shell">
                <h1 className="title aurora-title task-landing-title">
                  <span className="title-main">Daily</span>
                  <span className="title-main title-main--accent">Task</span>
                  <span className="title-subtext task-landing-subtext">
                    Rutvik Manmode
                  </span>
                  <span className="aurora" aria-hidden="true">
                    <span className="aurora__item" />
                    <span className="aurora__item" />
                    <span className="aurora__item" />
                    <span className="aurora__item" />
                  </span>
                </h1>
              </div>

              <div className="task-hero-copy">
                <p className="task-hero-description task-landing-description">
                  {remainingTasks} task{remainingTasks === 1 ? "" : "s"} remaining today
                </p>
              </div>

              <div className="task-hero-actions task-hero-actions--center">
                <button
                  type="button"
                  className="view-btn task-hero-primary-btn"
                  onClick={() => {
                    const listSection = pageRef.current?.querySelector(".task-list-shell");
                    listSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Explore Tasks
                </button>
                <button
                  type="button"
                  className="task-secondary-btn"
                  onClick={() => setShowAddForm(true)}
                >
                  Create New Task
                </button>
              </div>

            </div>
          </div>

          <aside className="task-hero-spotlight shadow-2xl">
            <p className="task-hero-spotlight-label">Today&apos;s pulse</p>
            <div className="task-hero-progress-row">
              <strong>{completionRate}%</strong>
              <span>completion rate</span>
            </div>
            <div className="task-hero-progress-track" aria-hidden="true">
              <span
                className="task-hero-progress-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="task-hero-spotlight-grid">
              <div className="task-hero-mini-card">
                <span>Due focus</span>
                <strong>{filteredTasks.length}</strong>
              </div>
              <div className="task-hero-mini-card">
                <span>Finished</span>
                <strong>{stats.completed}</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        className="task-stats-grid reveal-on-scroll"
        aria-label="Task statistics"
      >
        {statCards.map((card) => (
          <article
            key={card.label}
            className={`task-stat-card task-stat-card--${card.accent}`}
            style={{ transitionDelay: `${statCards.indexOf(card) * 70}ms` }}
          >
            <p className="task-stat-label">{card.label}</p>
            <strong className="task-stat-value">{card.value}</strong>
            <p className="task-stat-hint">{card.hint}</p>
          </article>
        ))}
      </section>

      <section className="task-feature-grid reveal-on-scroll" aria-label="Featured actions">
        {featuredActions.map((action, index) => (
          <article
            key={action.id}
            className="task-feature-card"
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <p className="task-feature-eyebrow">{action.eyebrow}</p>
            <h2 className="task-feature-title">{action.title}</h2>
            <p className="task-feature-description">{action.description}</p>
            <button type="button" className="view-btn" onClick={action.onClick}>
              Launch
            </button>
          </article>
        ))}
      </section>

      <section className="task-panel reveal-on-scroll backdrop-blur-xl">
        <form onSubmit={handleSearch} className="task-toolbar">
          <div className="task-search-shell">
            <span className="task-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                <path
                  d="M10.5 4a6.5 6.5 0 1 0 4.094 11.55l4.428 4.428 1.414-1.414-4.428-4.428A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search title, description, priority, status, or date"
              value={searchInput}
              onChange={(event) => {
                const value = event.target.value;
                setSearchInput(value);

                if (!value.trim()) {
                  setSearchTerm("");
                }
              }}
              className="task-input task-search-input"
            />
          </div>
          <button type="submit" className="view-btn task-toolbar-btn">
            Search
          </button>
          <button
            type="button"
            className="view-btn task-toolbar-btn"
            onClick={() => setShowAddForm((currentValue) => !currentValue)}
          >
            {showAddForm ? "Close Form" : "Add Task"}
          </button>
        </form>

        {showAddForm && (
          <form onSubmit={handleAddTask} className="task-form">
            <div className="task-form-header">
              <div>
                <p className="task-form-eyebrow">Create a fresh task</p>
                <h2 className="task-form-title">Add something important</h2>
              </div>
              <p className="task-form-note">
                Capture the title, task details, and delivery target in one
                clean step.
              </p>
            </div>

            <div className="task-form-layout">
              <label className="task-field">
                <span className="task-field-label">Task title</span>
                <input
                  type="text"
                  name="title"
                  placeholder="Ship the onboarding refresh"
                  value={newTask.title}
                  onChange={handleChange}
                  className="task-input"
                />
              </label>

              <label className="task-field task-field--full">
                <span className="task-field-label">Description</span>
                <textarea
                  name="description"
                  placeholder="Add a concise summary of the outcome, details, or handoff notes"
                  value={newTask.description}
                  onChange={handleChange}
                  rows="3"
                  className="task-input task-textarea"
                />
              </label>

              <label className="task-field">
                <span className="task-field-label">Priority</span>
                <select
                  name="priority"
                  value={newTask.priority}
                  onChange={handleChange}
                  className="task-input"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>

              <label className="task-field">
                <span className="task-field-label">Status</span>
                <select
                  name="status"
                  value={newTask.status}
                  onChange={handleChange}
                  className="task-input"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>

              <label className="task-field">
                <span className="task-field-label">Due date</span>
                <input
                  type="date"
                  name="dueDate"
                  value={newTask.dueDate}
                  onChange={handleChange}
                  className="task-input"
                />
              </label>
            </div>

            <div className="task-form-actions">
              <button type="submit" className="view-btn task-save-btn">
                Save Task
              </button>
            </div>
          </form>
        )}
      </section>

      <section
        className="task-list-shell reveal-on-scroll"
        aria-label="Task list"
      >
        <div className="task-list-header">
          <div>
            <p className="task-list-kicker">Today&apos;s board</p>
            <h2 className="task-list-title">
              {filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"}{" "}
              in view
            </h2>
          </div>
          <div className="task-status-filter-hint">
            {STATUS_LABELS.map((label) => (
              <span
                key={label}
                className={`task-inline-badge ${getStatusClassName(label)}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="task-empty-state">
            <div className="task-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 64 64" role="presentation">
                <path
                  d="M18 14h28a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6Zm4 10h20v4H22Zm0 10h14v4H22Z"
                  fill="currentColor"
                />
                <circle cx="45" cy="43" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
              </svg>
            </div>
            <h3>No tasks found</h3>
            <p>
              Try a different search term or add a new task to keep your daily
              board moving.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const overdue = isOverdue(task);

            return (
              <article
                key={task.id}
                className={`task-card reveal-on-scroll overflow-hidden ${getPriorityClassName(
                  task.priority
                )}`}
                style={{ transitionDelay: `${Math.min(task.id, 8) * 55}ms` }}
                onClick={() => setSelectedTask(task)}
              >
                <div className="task-card-glow" aria-hidden="true" />

                <div className="task-card-main">
                  <div className="task-card-topline">
                    <div className="task-card-heading">
                      <div className="task-card-badges">
                        <span
                          className={`task-inline-badge ${getPriorityClassName(
                            task.priority
                          )}`}
                        >
                          {task.priority} Priority
                        </span>
                        <span
                          className={`task-inline-badge ${getStatusClassName(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <h3>{task.title}</h3>
                    </div>

                    <button
                      type="button"
                      className="view-btn task-card-view-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (task.id === 1) {
                          openUserCard(task.id);
                        }
                        if (task.id === 2) {
                          openRequestPage();
                        }
                        if (task.id === 3) {
                          openLoginPage();
                        }
                        if (task.id === 4) {
                          openChatApp();
                        }
                        if (task.id === 5) {
                          openGameApp();
                        }
                      }}
                    >
                      View
                    </button>
                  </div>

                  <p className="task-description">{task.description}</p>

                  <div className="task-meta">
                    <div className="task-meta-item">
                      <span className="task-meta-label">Due date</span>
                      <span className={`task-meta-value ${overdue ? "is-overdue" : ""}`}>
                        {formatDate(task.dueDate)}
                        {overdue ? " - Overdue" : ""}
                      </span>
                    </div>
                    <div className="task-meta-item">
                      <span className="task-meta-label">Task ID</span>
                      <span className="task-meta-value">#{task.id}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {selectedTask && (
        <div onClick={() => setSelectedTask(null)} className="task-modal-overlay">
          <div
            onClick={(event) => event.stopPropagation()}
            className="task-modal shadow-2xl"
          >
            <div className="task-modal-header">
              <div className="task-modal-header-copy">
                <p className="task-modal-eyebrow">Task spotlight</p>
                <h2 className="task-modal-title">{selectedTask.title}</h2>
                <p className="task-modal-subtitle">
                  Complete task details and current delivery status.
                </p>
              </div>
              <div className="task-modal-header-actions">
                <span
                  className={`task-inline-badge ${getPriorityClassName(
                    selectedTask.priority
                  )}`}
                >
                  {selectedTask.priority} Priority
                </span>
                <span
                  className={`task-inline-badge ${getStatusClassName(
                    selectedTask.status
                  )}`}
                >
                  {selectedTask.status}
                </span>
                <button
                  type="button"
                  className="view-btn"
                  onClick={() => setSelectedTask(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="task-modal-content">
              <div className="task-modal-detail task-modal-detail--message">
                <span className="task-modal-detail-label">Description</span>
                <p>{selectedTask.description}</p>
              </div>
              <div className="task-modal-grid">
                <div className="task-modal-detail">
                  <span className="task-modal-detail-label">Priority</span>
                  <p>{selectedTask.priority}</p>
                </div>
                <div className="task-modal-detail">
                  <span className="task-modal-detail-label">Status</span>
                  <p>{selectedTask.status}</p>
                </div>
                <div className="task-modal-detail">
                  <span className="task-modal-detail-label">Due Date</span>
                  <p className={isOverdue(selectedTask) ? "is-overdue" : ""}>
                    {formatDate(selectedTask.dueDate)}
                    {isOverdue(selectedTask) ? " - Overdue" : ""}
                  </p>
                </div>
                <div className="task-modal-detail">
                  <span className="task-modal-detail-label">Task ID</span>
                  <p>#{selectedTask.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskList;
