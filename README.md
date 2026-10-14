# GitHub-Style Habit Tracker & Pomodoro Focus Backend

Production-ready REST API built with Node.js, Express, MongoDB (Mongoose), and JWT Authentication.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (or configure your MongoDB connection):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/habit_tracker_db
JWT_SECRET=super_secret_jwt_key_habit_tracker_production_ready_9921
JWT_EXPIRE=30d
```

### 3. Run the Server
```bash
# Development mode with auto-reload:
npm run dev

# Production mode:
npm start
```

---

## 📡 API Endpoints

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register user (`username`, `email`, `password`) | No |
| `POST` | `/api/auth/login` | Login user (`emailOrUsername`, `password`) | No |
| `GET` | `/api/auth/me` | Get authenticated user profile | Yes (Bearer) |
| `PUT` | `/api/auth/profile` | Update profile (`displayName`, `avatarUrl`) | Yes (Bearer) |

### 🎯 Habits (`/api/habits`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/habits` | Create habit (`title`, `type`, `targetValue`, `unit`, `color`, `frequency`) | Yes |
| `GET` | `/api/habits` | Get all active habits with today's status attached | Yes |
| `GET` | `/api/habits/:id` | Get single habit with 30-day recent logs | Yes |
| `PUT` | `/api/habits/:id` | Update habit details | Yes |
| `PATCH` | `/api/habits/:id/archive` | Toggle archive status | Yes |
| `DELETE` | `/api/habits/:id` | Delete habit & associated logs | Yes |

### 📝 Habit Logs & Streaks (`/api/logs`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/logs` | Log or update progress for a date | Yes |
| `POST` | `/api/logs/toggle-today` | 1-tap quick toggle completion for today | Yes |
| `POST` | `/api/logs/increment` | 1-tap increment for measurable/pomodoro habit (`amount`) | Yes |
| `GET` | `/api/logs` | Query logs by habit or date range | Yes |

### ⏱️ Pomodoro Sessions (`/api/pomodoro`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/pomodoro/sessions` | Record focus session (auto-increments linked habit & recalculates streaks) | Yes |
| `GET` | `/api/pomodoro/sessions` | Fetch session history | Yes |
| `GET` | `/api/pomodoro/stats` | Aggregate focus statistics (total minutes, sessions today, weekly) | Yes |

### 🟩 Contribution Heatmap (`/api/heatmap`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/heatmap` | 365-day continuous contribution grid with intensity levels 0-4 | Yes |
| `GET` | `/api/heatmap?habitId=XYZ`| Heatmap for a specific individual habit | Yes |
| `GET` | `/api/heatmap?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Custom date range | Yes |

---

## 🎨 GitHub Dark Theme Intensity Levels
- **Level 0 (0%):** `#161b22` (Empty card background)
- **Level 1 (1 - 25%):** `#0e4429` (Low green)
- **Level 2 (26 - 50%):** `#006d32` (Medium-low green)
- **Level 3 (51 - 75%):** `#26a641` (Medium-high green)
- **Level 4 (76 - 100%):** `#39d353` (GitHub Neon Green)
