# 📸 Lao Niangs Photobooth

Lao Niangs Photobooth is an AI-powered web photobooth built for **NUS Orbital AY2025/26 (Apollo 11)**. The application provides a hands-free photography experience using computer vision and gesture recognition, allowing users to capture photos and GIFs without touching the keyboard or mouse.

Built with **React**, **FastAPI**, **PostgreSQL**, and **MediaPipe**, the application supports secure user authentication, gesture-controlled capture, photo strip generation, GIF recording, and a personal gallery for managing captured memories.

---

# ✨ Features

## 👤 User Authentication
- User registration and login
- JWT-based authentication
- Password reset functionality
- Protected routes for authenticated users
- Session timeout based on user inactivity

---

## 📷 Photo Booth

- Live webcam preview
- Gesture-controlled photo capture using MediaPipe hand tracking
- Countdown before capture
- Multiple photo capture workflow
- Automatic upload to the backend
- Photo strip and collage generation
- Frame selection

---

## 🎞 GIF Booth

- Record four individual GIF clips
- Open-palm gesture starts recording
- Hold-progress indicator
- Manual recording fallback
- Drag-and-drop clip reordering
- Individual clip re-recording
- GIF export workflow

---

## 🖼 Gallery

- View previously captured photos
- View generated GIFs
- Download captured media
- User-specific archive

---

## 🧠 Smart Camera Features

MediaPipe continuously analyses the webcam feed and provides:

- Hand gesture recognition
- Hold-to-trigger detection
- Hand distance validation
- Lighting detection
- Camera freeze detection
- Gesture cooldown between captures

---

# 🛠 Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React, Vite |
| Backend | FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Authentication | JWT, bcrypt |
| Computer Vision | MediaPipe |
| Image Processing | Pillow, OpenCV |
| Recording | MediaRecorder API |

---

# 📂 Project Structure

```
Lao-Niangs-Photobooth
│
├── backend
│   ├── app
│   │   ├── routes
│   │   ├── auth.py
│   │   ├── dependencies.py
│   │   ├── database.py
│   │   └── main.py
│   │
│   └── requirements.txt
│
├── frontend-themed 5
│   ├── src
│   │   ├── api
│   │   ├── components
│   │   ├── context
│   │   ├── pages
│   │   └── assets
│   │
│   └── package.json
│
└── README.md
```

---

# 🚀 Installation

## Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL
- pip

Clone the repository

```bash
git clone https://github.com/btxrrr/Lao-Niangs-Photobooth.git
cd Lao-Niangs-Photobooth
```

---

## Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

---

## Frontend

```bash
cd "frontend-themed 5"

npm install
```

---

# ▶ Running the Project

Run both frontend and backend.

## Backend

```bash
cd backend
uvicorn app.main:app --reload
```

---

## Frontend

```bash
cd "frontend-themed 5"

npm run dev
```

Frontend:

```
http://localhost:5173
```

---

# 🔐 Authentication

The application uses JWT authentication.

Protected endpoints require a valid bearer token.

Authentication features include:

- Register
- Login
- Logout
- Password Reset
- Session Refresh
- Inactivity Timeout

---

# 📸 Photo Booth Workflow

1. Login
2. Choose Photo Booth
3. Select a frame
4. Show an open palm
5. Hold until the gesture indicator completes
6. Countdown begins
7. Photo is captured automatically
8. Repeat until all captures are completed
9. Review and save

---

# 🎞 GIF Booth Workflow

1. Open GIF Booth
2. Show an open palm
3. Hold until the gesture indicator completes
4. Recording starts after countdown
5. Record four clips
6. Re-record or reorder clips
7. Export GIF
8. Download the final GIF

---

# 👥 Team

**Lao Niangs**  
NUS Orbital 2026 (Apollo 11)

| Member | Role |
|----------|------|
| Jamie Lim | Frontend |
| Bernice Tan | Backend |
