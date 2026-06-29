# RJ_Rutvik_Manmode Frontend

This project is a Vite + React frontend that combines multiple UI tasks into one application. It includes a task dashboard, user card view, enquiry management flow, authentication with OTP-based account actions, a profile area, a real-time chat app, and a zombie-themed game hub with rewards, leaderboards, and playable mini-games.

The frontend is designed to work with a backend running on `http://127.0.0.1:5000` or `http://localhost:5000`. Several features depend on that backend for authentication, profile data, chat sessions, enquiries, game stats, rewards, and leaderboard data.

## Main Features

### 1. Task Dashboard

- Landing page with animated hero, theme toggle, summary cards, and featured project shortcuts.
- Task list loaded from local JSON seed data.
- Search by title, description, priority, status, or due date.
- Add new tasks from the dashboard UI.
- Status tracking for `Completed`, `In Progress`, and `Pending`.
- Due-date formatting and overdue highlighting.
- Modal view for full task details.
- Quick navigation to the other major parts of the project.

### 2. User Card

- Dedicated user card route linked from the first task.
- Uses local user data from `src/data/users.json`.
- Displays a selected user profile based on the URL parameter.

### 3. Contact / Enquiry Management

- Create a new enquiry from the contact form.
- Client-side validation for required fields and email formatting.
- Enquiry listing page with pagination.
- Filter enquiries by recent days and status.
- View enquiry details in a modal.
- Edit enquiry fields and save changes.
- Resolve enquiries through the backend.
- Delete enquiries.
- Trigger email sending for an enquiry from the table.
- Auto-refresh request list after creating a new enquiry.

### 4. Authentication System

- Login page with email and password.
- Register page with OTP-based signup flow.
- Forgot-password flow with:
  - email submission
  - OTP verification
  - password reset
- Password validation rules for stronger credentials.
- JWT token storage in `localStorage`.
- Protected profile route that redirects unauthenticated users to `/login`.
- HMAC-signed API requests for the main auth/profile API client.

### 5. Profile Page

- Loads authenticated user profile from the backend.
- Shows profile basics such as email, name, phone, about, skills, location, and avatar.
- Edit profile details in a modal form.
- Upload a profile image.
- Logout support.
- Handles expired or invalid tokens by redirecting back to login.

### 6. Real-Time Chat App

- Separate chat workspace mounted under `/chat`.
- Email/password login and signup inside the chat app.
- Google sign-in support through backend OAuth routes when configured.
- Session-based auth using `credentials: include`.
- Socket.IO-powered real-time messaging.
- Conversation list with unread count tracking.
- Active chat window with message updates.
- Presence updates for online/offline users.
- Reconnection handling and room rejoin logic.
- New chat creation flow.
- Profile side panel for current user or contact details.

### 7. Game App

The `/game` route opens a separate gamified experience with its own navigation and themed interface.

- Dedicated game landing page with animated sections and custom styling.
- Game navigation for:
  - Home
  - Dashboard
  - Tasks
  - Rewards
  - Games
  - Leaderboard
- Game-specific sign-in and sign-up flow.
- Optional Google sign-in using Firebase client config plus backend verification.
- Game profile popup with editable player details and photo upload.

#### Game Dashboard

- Loads player profile and game stats from backend.
- Shows wallet balance, coins earned, reward streak, sessions, and game performance.
- Displays favorite mode and player summary.
- Opens a daily reward popup when a reward is available.
- Supports claiming daily reward directly from the dashboard.

#### Task Hub

- Daily and weekly mission tabs.
- Reward track for login-chain rewards.
- Mission progress bars.
- Claimable mission rewards.
- Wallet and streak overview.

#### Rewards Hub

- Spin wheel reward system.
- Daily spin limit display.
- Tracks remaining spins and wheel-earned coins.
- Backend-driven reward results.

#### Leaderboard Hub

- Live leaderboard from backend player data.
- Current user rank, coins, and stats.
- Top ranked players list.
- Player profile modal from leaderboard entries.

#### Games Hub

- Launch entry points for two playable games:
  - `Zombie Rush`
  - `Zombie Run`
- Pulls the signed-in player's best scores from backend profile data.
- Prevents launch until the user is signed in.
- Opens games from the public `public/` folder in a new tab.

### 8. Included Mini-Games

The repo contains two browser games in the `public` directory:

- `public/zombie-game` for Zombie Rush
- `public/zombie-run` for Zombie Run

These games are integrated into the game hub experience and can send or use backend-connected game data when launched from the app.

## Tech Stack

- React 19
- Vite 7
- React Router DOM 7
- Axios
- Socket.IO Client
- Motion
- Lucide React
- Tailwind CSS 4
- Vanilla CSS modules/files for custom component styling

## Project Structure

```text
src/
  App.jsx                     Main application routing
  apiClient.js                HMAC-signed API client for auth/profile APIs
  chatApiClient.js            Chat API client using cookie-based sessions
  lib/chatSocket.js           Socket.IO connection helper
  data/
    task.json                 Seed task data
    users.json                Seed user data
  components/
    TaskList.jsx              Main task dashboard
    UserCard.jsx              User card view
    requestpage.jsx           Enquiry listing and actions
    Contatform.jsx            Contact/enquiry creation form
    loginpage.jsx             Login + forgot-password flow
    register.jsx              Register + OTP verification flow
    ProfilePage.jsx           Protected profile page
    GameApp.jsx               Wrapper for game app routes and sections
    chat/
      ChatApp.jsx             Real-time chat workspace
      ChatAuth.jsx            Chat auth UI
      ChatSidebar.jsx         Conversation list
      ChatWindow.jsx          Active chat view
      ChatProfile.jsx         Chat profile panel
      NewChat.jsx             New conversation creation
    game app/
      src/app/components/     Game hub UI, dashboard, rewards, leaderboard, navbar

public/
  zombie-game/                Zombie Rush assets and runtime
  zombie-run/                 Zombie Run assets and runtime
```

## Routes

- `/` - task dashboard
- `/usercard/:userId` - user card page
- `/requests` - enquiry list
- `/requests/new` - new enquiry form
- `/login` - login page
- `/register` - registration page
- `/profile` - protected profile page
- `/chat/*` - real-time chat app
- `/game/*` - game hub and dashboard

## Environment Variables

Create a `.env` file in the frontend root if it is not already present.

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
VITE_CONTACT_API_URL=/api/contact
VITE_APP_KEY=your_app_key
VITE_APP_HMAC_SECRET=your_hmac_secret
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### What They Are Used For

- `VITE_API_BASE_URL`: main backend base URL for auth, profile, chat, and game APIs.
- `VITE_CONTACT_API_URL`: contact form submission endpoint.
- `VITE_APP_KEY`: app key used by the HMAC-based main API client.
- `VITE_APP_HMAC_SECRET`: secret used to sign authenticated requests.
- `VITE_FIREBASE_*`: required for Google sign-in inside the game app frontend.

## Backend Dependency

This frontend is not fully standalone. The backend must be running for these features:

- login and registration
- OTP verification
- forgot password
- profile load and update
- profile photo upload
- enquiry CRUD and email actions
- chat authentication and real-time messaging
- game authentication
- daily rewards, missions, and spin wheel
- leaderboard and game stats

If the backend is missing or misconfigured, only the local/static portions of the UI will work correctly.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the frontend

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview the production build

```bash
npm run preview
```

## Notes

- The main API client uses HMAC headers plus JWT token handling.
- The chat app uses cookie/session-based auth and Socket.IO.
- The game app uses its own auth flow and also supports Google sign-in when Firebase and backend configuration are complete.
- Some UI text and file naming are intentionally preserved from the existing project structure, including names like `Contatform.jsx`.
- The two mini-games are served from the `public` folder and launched through the game hub.

## Summary

This frontend is a multi-module React project that combines task management, enquiry handling, authentication, profile management, live chat, and a game-based reward system in one interface. It is best understood as a single frontend workspace containing several assignment-style modules plus a larger gamified experience connected to the same backend ecosystem.
