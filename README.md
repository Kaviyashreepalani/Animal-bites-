# 🐾 Animal-Bite Assistance System

An **AI-powered, multilingual animal-bite assistance platform** that provides instant guidance, voice-based interaction, and nearby treatment center recommendations.

Built using **Flask (backend)**, **React + Vite (frontend)**, **Firebase Authentication**, and **AI/NLP services**.

---

## ✨ Features

### 🗣️ AI Chatbot
- Ask questions about **animal bites, first aid, prevention, and risks**
- Supports **text and voice input**
- Provides **voice replies (Text-to-Speech)**

### 🌍 Multilingual Support
- English (`en`)
- Tamil (`ta`)
- Telugu (`te`)
- Hindi (`hi`)
- Automatic translation between languages

### 🏥 Nearby Treatment Finder
- Locate nearby **hospitals and clinics**
- Shows distance and map links

### 👨‍⚕️ Doctor Interaction System
- Unanswered questions are saved
- Doctors can later answer them
- AI reuses verified doctor responses

### 🔐 Secure Authentication
- Firebase-based **Login & Signup**
- Secure user sessions

---

## 🏗️ Project Structure

ANIMAL-BITE/
├── backend/
│ ├── app.py
│ ├── forward.py
│ ├── auth.py
│ ├── translation.py
│ ├── location_service.py
│ ├── requirements.txt
│ └── (secret files ignored)
│
├── frontend/
│ └── chatbot/
│ ├── src/
│ │ ├── App.jsx
│ │ ├── AuthContext.jsx
│ │ ├── Login.jsx
│ │ ├── Signup.jsx
│ │ ├── LandingPage.jsx
│ │ └── ConversationHistory.jsx
│ ├── public/
│ ├── package.json
│ └── tailwind.config.js
│
├── .gitignore
└── README.md


---

## 🔐 Security Notes

The following files are **NOT committed to GitHub**:

- `backend/firebase_key.json`
- `frontend/chatbot/src/firebase.js`
- `.env`

Create local copies or example files instead.

---

## ⚙️ Backend Setup (Flask)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py

## Backend runs on:

http://localhost:5000

## 💻 Frontend Setup (React + Vite)
cd frontend/chatbot
npm install
npm run dev


## Frontend runs on:

http://localhost:5173

🔗 API Endpoints
Endpoint	Method	Description
/api/process_message	POST	Process chat messages
/api/tts	POST	Text to Speech
/api/stt	POST	Speech to Text
/api/set_language	POST	Change language
/api/location/search-facilities	POST	Find nearby hospitals
/api/dashboard/*	GET/POST	Doctor dashboard APIs
🧠 Tech Stack

Frontend: React, Vite, Tailwind CSS

Backend: Flask, Python

AI/NLP: Google Gemini, OpenAI

Speech: Google Speech-to-Text, Text-to-Speech

Database: MongoDB, Firebase

Authentication: Firebase Auth

🚀 Future Enhancements

Mobile-first UI

Doctor verification system

Admin analytics dashboard

Live GPS tracking

Improved medical AI reasoning

👩‍💻 Author

Kaviya Shree P
ECE | Data Science | AI & ML

Building technology that helps people in real life.
