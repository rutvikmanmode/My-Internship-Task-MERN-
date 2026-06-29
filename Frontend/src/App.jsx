import { useEffect, useState } from "react";
import "./App.css";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import TaskList from "./components/TaskList";
import UserCard from "./components/UserCard";
import RequestPage from "./components/requestpage";
import Contatform from "./components/Contatform";
import LoginPage from "./components/loginpage";
import RegisterPage from "./components/register";
import ProfilePage from "./components/ProfilePage";
import ChatApp from "./components/chat/ChatApp";
import GameApp from "./components/GameApp";
import users from "./data/users.json";

function UserCardRoute() {
  const { userId } = useParams();
  // Resolve the user from the URL or fall back to the first user.
  const selectedUser = users.find((user) => String(user.id) === userId) || users[0];

  return <UserCard user={selectedUser} />;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Persist theme choice between sessions.
    return window.localStorage.getItem("theme") === "dark";
  });
  const [token, setToken] = useState(() => {
    return window.localStorage.getItem("token") || null;
  });
  const rainbows = Array.from({ length: 25 }, (_, index) => index);

  useEffect(() => {
    // Sync theme attribute + storage for CSS variables.
    const theme = isDarkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [isDarkMode]);

  const openUserCard = (taskId) => {
    // Navigate to a user's card based on task selection.
    const selectedUser = users.find((user) => user.id === taskId) || users[0];
    navigate(`/usercard/${selectedUser.id}`);
  };

  const openRequestPage = () => {
    // Go to the inquiry list page.
    navigate("/requests");
  };

  const openContactForm = () => {
    // Go to the inquiry creation page.
    navigate("/requests/new");
  };

  const openLoginPage = () => {
    // Go to the login page.
    navigate("/login");
  };

  const openChatApp = () => {
    // Go to the chat app.
    navigate("/chat");
  };

  const openGameApp = () => {
    // Go to the game app.
    navigate("/game");
  };

  const handleInquiryCreated = () => {
    // After creating an inquiry, return to the list and trigger a refresh.
    navigate("/requests", {
      state: { refreshAt: Date.now() },
    });
  };

  const toggleTheme = () => {
    // Toggle between light and dark themes.
    setIsDarkMode((current) => !current);
  };

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    window.localStorage.removeItem("token");
  };

  const isFullBleedRoute = location.pathname.startsWith("/game");

  return (
    <div className="app-shell" data-theme={isDarkMode ? "dark" : "light"}>
      <div className="background-layer" aria-hidden="true">
        {rainbows.map((index) => (
          <span
            key={index}
            className="rainbow"
            style={{
              animationDuration: `${45 - index * 0.8}s`,
              animationDelay: `${-(index / 25) * 45}s`,
            }}
          />
        ))}
        <span className="h" />
        <span className="v" />
      </div>

      <div className={`page-shell ${isFullBleedRoute ? "page-shell--full" : ""}`}>
        <Routes>
          <Route
            path="/"
            element={
              <TaskList
                openUserCard={openUserCard}
                openRequestPage={openRequestPage}
                openLoginPage={openLoginPage}
                openChatApp={openChatApp}
                openGameApp={openGameApp}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
              />
            }
          />
          <Route
            path="/usercard/:userId"
            element={
              <div className="user-container">
                <UserCardRoute />
              </div>
            }
          />
          <Route
            path="/requests"
            element={<RequestPage openContactForm={openContactForm} />}
          />
          <Route
            path="/requests/new"
            element={<Contatform onInquiryCreated={handleInquiryCreated} />}
          />
          <Route
            path="/login"
            element={<LoginPage onLogin={handleLogin} />}
          />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/profile"
            element={
              token ? (
                <ProfilePage onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/chat/*" element={<ChatApp />} />
          <Route path="/game/*" element={<GameApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
