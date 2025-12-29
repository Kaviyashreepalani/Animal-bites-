# 🐾 Animal-Bite Assistance System

> An AI-powered, multilingual animal-bite assistance platform that provides instant guidance, voice-based interaction, and nearby treatment center recommendations.

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![React](https://img.shields.io/badge/react-18+-61DAFB.svg)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Technology Stack](#-technology-stack)
- [Security](#-security)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [Author](#-author)
- [License](#-license)

---

## ✨ Features

### 🗣️ AI-Powered Chatbot
- **Dual Input Modes**: Text and voice input support
- **Smart Classification**: 
  - Casual greetings and general conversation
  - Animal-bite related questions and first aid
  - Non-related question filtering
- **Voice Features**:
  - Speech-to-Text (STT) for voice queries
  - Text-to-Speech (TTS) for audio responses
  - Natural conversation flow

### 🌍 Multilingual Support
Seamless communication in multiple languages:

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Available |
| Tamil | `ta` | ✅ Available |
| Telugu | `te` | ✅ Available |
| Hindi | `hi` | ✅ Available |

- Automatic translation between languages
- Context-aware responses
- Native speaker quality translations

### 🏥 Treatment Center Finder
- **Location-Based Search**: Find nearby hospitals and clinics
- **Distance Calculation**: Sorted by proximity
- **Map Integration**: Direct map links for navigation
- **Facility Information**: Contact details and addresses

### 👨‍⚕️ Doctor Interaction System
- **Question Forwarding**: Unanswered queries routed to doctors
- **Doctor Dashboard**: Medical professionals can respond to questions
- **Answer Reuse**: AI learns from verified doctor responses
- **Knowledge Base**: Builds a repository of expert answers

### 🔐 Authentication & Security
- Firebase Authentication integration
- Secure user login and signup
- Session management
- Protected API endpoints

---

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   React     │ ◄─────► │    Flask     │ ◄─────► │  Firebase   │
│  Frontend   │         │   Backend    │         │  Database   │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               ├─────► Google Gemini AI
                               ├─────► OpenAI GPT
                               ├─────► Google Speech APIs
                               └─────► MongoDB

```

---

## 📁 Project Structure

```
ANIMAL-BITE/
├── backend/
│   ├── app.py                    # Main Flask application
│   ├── forward.py                # Doctor Q&A handling
│   ├── auth.py                   # Authentication helpers
│   ├── translation.py            # Translation utilities
│   ├── location_service.py       # Hospital search service
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment variables template
│   └── firebase_key.example.json # Firebase config template
│
├── frontend/
│   └── chatbot/
│       ├── src/
│       │   ├── App.jsx                  # Main app component
│       │   ├── AuthContext.jsx          # Auth state management
│       │   ├── Login.jsx                # Login page
│       │   ├── Signup.jsx               # Signup page
│       │   ├── LandingPage.jsx          # Home page
│       │   ├── ConversationHistory.jsx  # Chat history
│       │   └── firebase.example.js      # Firebase config template
│       ├── public/
│       ├── package.json
│       ├── tailwind.config.js
│       └── vite.config.js
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Python** 3.8 or higher
- **Node.js** 16 or higher
- **npm** or **yarn**
- **Git**

You'll also need accounts and API keys for:
- Google Cloud Platform (Gemini AI, Speech APIs)
- OpenAI API
- MongoDB Atlas
- Firebase

---

## 📥 Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/animal-bite-assistance.git
cd animal-bite-assistance
```

### 2️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3️⃣ Frontend Setup

```bash
# Navigate to frontend directory
cd frontend/chatbot

# Install dependencies
npm install
```

---

## ⚙️ Configuration

### Backend Configuration

#### 1. Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=path/to/firebase_key.json
GOOGLE_CLOUD_PROJECT=your-project-id
GEMINI_API_KEY=your-gemini-api-key

# OpenAI
OPENAI_KEY=your-openai-api-key

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Flask
FLASK_ENV=development
SECRET_KEY=your-secret-key
```

#### 2. Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `firebase_key.json` in the `backend/` directory

### Frontend Configuration

Create `firebase.js` in `frontend/chatbot/src/`:

```bash
cp src/firebase.example.js src/firebase.js
```

Edit `firebase.js` with your Firebase config:

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

---

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
python app.py
```

Backend will run at: **http://localhost:5000**

### Start Frontend Development Server

```bash
cd frontend/chatbot
npm run dev
```

Frontend will run at: **http://localhost:5173**

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Chat & Messaging

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/process_message` | POST | Process chat message and get AI response | `{ "message": "string", "language": "en" }` | `{ "response": "string", "audio_url": "string" }` |
| `/api/set_language` | POST | Change user's preferred language | `{ "language": "en" }` | `{ "success": true, "language": "en" }` |

#### Speech Services

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/tts` | POST | Convert text to speech | `{ "text": "string", "language": "en" }` | Audio file (base64) |
| `/api/stt` | POST | Convert speech to text | Audio file (multipart/form-data) | `{ "text": "string" }` |

#### Location Services

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/location/search-facilities` | POST | Find nearby treatment centers | `{ "latitude": 0.0, "longitude": 0.0, "radius": 5000 }` | `{ "facilities": [...] }` |

#### Doctor Dashboard

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/dashboard/questions` | GET | Get pending questions | - | `{ "questions": [...] }` |
| `/api/dashboard/answer` | POST | Submit answer to question | `{ "question_id": "string", "answer": "string" }` | `{ "success": true }` |
| `/api/dashboard/stats` | GET | Get dashboard statistics | - | `{ "total_questions": 0, "answered": 0 }` |

#### Authentication

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/auth/login` | POST | User login | `{ "email": "string", "password": "string" }` | `{ "token": "string", "user": {...} }` |
| `/api/auth/signup` | POST | User registration | `{ "email": "string", "password": "string", "name": "string" }` | `{ "token": "string", "user": {...} }` |
| `/api/auth/logout` | POST | User logout | - | `{ "success": true }` |

### Example Request

```bash
curl -X POST http://localhost:5000/api/process_message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should I do if a dog bites me?",
    "language": "en"
  }'
```

### Example Response

```json
{
  "response": "If you've been bitten by a dog, follow these steps immediately:\n1. Wash the wound thoroughly with soap and water\n2. Apply antibiotic cream\n3. Cover with a sterile bandage\n4. Seek immediate medical attention\n5. Report the incident to local authorities",
  "audio_url": "data:audio/mp3;base64,//uQx...",
  "classification": "animal_bite_query",
  "confidence": 0.95
}
```

---

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18+ | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| Firebase Auth | Authentication |
| Axios | HTTP client |

### Backend

| Technology | Purpose |
|------------|---------|
| Flask | Web framework |
| Python 3.8+ | Programming language |
| MongoDB | Database (vector search) |
| Firebase | Real-time database & auth |

### AI & ML Services

| Service | Purpose |
|---------|---------|
| Google Gemini | AI chatbot & reasoning |
| OpenAI GPT | Embeddings & chat completion |
| Google Speech-to-Text | Voice input processing |
| Google Text-to-Speech | Voice output generation |
| Google Translate API | Multilingual support |

### Other Services

| Service | Purpose |
|---------|---------|
| OpenStreetMap | Location & mapping |
| Nominatim | Geocoding service |

---

## 🔒 Security

### Important Security Notes

⚠️ **DO NOT commit sensitive files to Git:**

- `backend/firebase_key.json`
- `backend/.env`
- `frontend/chatbot/src/firebase.js`
- Any files containing API keys or credentials

### Recommended Practices

1. **Use Example Files**
   - Provide `.example` versions of config files
   - Document required fields in README

2. **Environment Variables**
   - Store all secrets in `.env` files
   - Never hardcode credentials in source code

3. **Firebase Security Rules**
   - Implement proper read/write rules
   - Validate user authentication

4. **API Rate Limiting**
   - Implement rate limiting on endpoints
   - Monitor API usage

5. **Input Validation**
   - Sanitize all user inputs
   - Validate file uploads

---

## 🚀 Future Enhancements

### Planned Features

- [ ] 📱 Progressive Web App (PWA) support
- [ ] 🌙 Dark mode theme
- [ ] 📊 Admin analytics dashboard
- [ ] 🧑‍⚕️ Verified doctor account system
- [ ] 📍 Real-time GPS tracking for emergencies
- [ ] 🏥 Hospital availability status
- [ ] 📧 Email notifications for critical cases
- [ ] 📱 Mobile app (React Native)
- [ ] 🧠 Enhanced medical reasoning models
- [ ] 🗂️ Medical history tracking
- [ ] 🔔 Push notifications
- [ ] 📈 User engagement analytics
- [ ] 🌐 Additional language support (10+ languages)
- [ ] 🎯 Offline mode capabilities

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 👩‍💻 Author

**Kaviya Shree P**

- 🎓 Electronics & Communication Engineering
- 💡 Specialization: Data Science, AI & ML
- 🌟 Mission: *"Building technology that actually helps people"*

### Connect

- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Google Cloud Platform for AI services
- OpenAI for GPT models
- Firebase team for authentication infrastructure
- MongoDB for vector search capabilities
- Open-source community for invaluable tools and libraries

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/animal-bite-assistance/issues) page
2. Create a new issue with detailed information
3. Contact the author directly

---

<div align="center">

**Made with ❤️ for public health and safety**

⭐ Star this repo if you find it helpful!

</div>
