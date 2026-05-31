# 📸 Lao Niangs Photobooth

A web-based AI-powered photo booth application built with React and FastAPI. Capture photos hands-free using gesture controls, customise your shots with themed frames, and save everything to your personal archive.

---

## 🚀 Getting Started

You will need **two terminals open** — one for the frontend and one for the backend.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or above)
- [Python](https://www.python.org/) (v3.9 or above)
- [pip](https://pip.pypa.io/en/stable/)

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/btxrrr/Lao-Niangs-Photobooth.git
cd Lao-Niangs-Photobooth
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

## ▶️ Running the App

Open **two terminals** and run the following:

### Terminal 1 — Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Terminal 2 — Backend

```bash
cd backend
uvicorn app.main:app --reload
```

The backend API will be available at `http://localhost:8000`

---

## 🗂️ Project Structure

```
Lao-Niangs-Photobooth/
├── frontend/          # React application
└── backend/           # FastAPI application
    └── app/
        └── main.py
```

---

## ✨ Features

- **User Accounts** — Register, log in, log out, and reset your password
- **Photo Booth** — Live webcam preview with countdown timer
- **Gesture-Controlled Shutter** — Trigger captures hands-free using MediaPipe
- **Smart Frame Studio** — Arrange photos into strips and collages
- **Personal Archive** — All captures saved to your account

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | FastAPI, Python |
| Database | PostgreSQL |
| Auth | JWT, bcrypt |
| Computer Vision | MediaPipe, OpenCV |
| Image Processing | Pillow |

---

## 👥 Team

**Lao Niangs** — NUS Orbital AY2025/26 (Apollo 11)

| Member | Role |
|---|---|
| Jamie Lim | Frontend |
| Bernice Tan | Backend |
