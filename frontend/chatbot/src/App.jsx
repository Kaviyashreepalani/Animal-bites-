import React, { useState, useRef, useEffect } from "react";
import { useAuth } from './AuthContext';
import LocationFinder from "./LocationFinder";
import './index.css';

// IMPORTANT: Change this to your actual backend URL
// For local development: "http://localhost:5000"
// For production: "https://animal-bites-backend-4.onrender.com"
const API_BASE_URL = "http://localhost:5000";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English (en-US)" },
  { code: "hi", label: "Hindi (hi-IN)" },
  { code: "ta", label: "Tamil (ta-IN)" },
  { code: "te", label: "Telugu (te-IN)" },
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("en");
  const [isRecordingFallback, setIsRecordingFallback] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [inputText, setInputText] = useState("");
  const [audioError, setAudioError] = useState(null);
  const [showLocationFinder, setShowLocationFinder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { currentUser, logout } = useAuth();
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const chatBoxRef = useRef(null);
  const currentAudioRef = useRef(null);
  const audioUrlsRef = useRef(new Set());

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setRecognitionSupported(true);
      const rec = new SR();
      rec.lang = mapLangToLocale(language);
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        console.log(`Speech recognition result: ${transcript}`);
        handleUserText(transcript, language);
      };

      rec.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        setListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      cleanupAudioUrls();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [language]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = mapLangToLocale(language);
    }
  }, [language]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const setBackendLanguage = async () => {
      try {
        console.log(`Setting backend language to: ${language}`);
        const response = await fetch(`${API_BASE_URL}/api/set_language`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language }),
        });
        const result = await response.json();
        console.log("Backend language response:", result);
      } catch (err) {
        console.error("Error setting backend language:", err);
      }
    };
    
    setBackendLanguage();
  }, [language]);

  function cleanupAudioUrls() {
    audioUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Error revoking URL:", e);
      }
    });
    audioUrlsRef.current.clear();
  }

  function mapLangToLocale(code) {
    switch (code) {
      case "en": return "en-US";
      case "hi": return "hi-IN";
      case "ta": return "ta-IN";
      case "te": return "te-IN";
      default: return "en-US";
    }
  }

  function addMessage(sender, text, audioBlob) {
    setMessages((m) => [...m, { sender, text, audioBlob, id: Date.now() + Math.random() }]);
  }

  async function handleUserText(text, forcedLang) {
    if (!text.trim()) return;

    const effectiveLang = forcedLang || language;
    console.log(`=== SENDING MESSAGE ===`);
    console.log(`User text: "${text}"`);
    console.log(`Language: ${effectiveLang}`);
    
    addMessage("user", text);
    setIsLoading(true);

    try {
      console.log(`Calling backend: ${API_BASE_URL}/api/process_message`);
      
      const chatResp = await fetch(`${API_BASE_URL}/api/process_message`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          message: text, 
          language: effectiveLang
        }),
      });

      console.log(`Response status: ${chatResp.status} ${chatResp.statusText}`);

      if (!chatResp.ok) {
        const errorText = await chatResp.text();
        console.error(`HTTP error! Response: ${errorText}`);
        throw new Error(`HTTP error! status: ${chatResp.status}`);
      }
      
      const chatJson = await chatResp.json();
      console.log("Backend response:", chatJson);
      
      const reply = chatJson.reply ?? "Sorry, no reply.";
      console.log(`Bot reply: "${reply}"`);

      // Try to get TTS audio
      try {
        console.log(`Requesting TTS for: "${reply}"`);
        const ttsResp = await fetch(`${API_BASE_URL}/api/tts`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "audio/mpeg, audio/mp3, audio/*, */*"
          },
          body: JSON.stringify({ text: reply, language: effectiveLang }),
        });

        console.log(`TTS response status: ${ttsResp.status}`);

        if (ttsResp.ok) {
          const audioBlob = await ttsResp.blob();
          console.log(`TTS audio blob size: ${audioBlob.size} bytes`);
          
          if (audioBlob.size > 0) {
            const correctedBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
            addMessage("bot", reply, correctedBlob);
          } else {
            console.warn("Empty audio blob received");
            addMessage("bot", reply);
          }
        } else {
          const errorText = await ttsResp.text();
          console.error(`TTS failed: ${errorText}`);
          addMessage("bot", reply);
        }
      } catch (err) {
        console.error("TTS error:", err);
        addMessage("bot", reply);
      }
    } catch (err) {
      console.error("=== CHAT ERROR ===");
      console.error("Error:", err);
      console.error("Stack:", err.stack);
      addMessage("bot", "Error contacting chatbot. Please check if the backend server is running.");
    } finally {
      setIsLoading(false);
    }
  }

  function startRecognition() {
    if (recognitionSupported) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        setListening(false);
      }
    } else {
      startRecordingFallback();
    }
  }

  function stopRecognition() {
    if (recognitionSupported) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Error stopping speech recognition:", err);
      }
    } else {
      stopRecordingFallback();
    }
  }

  async function startRecordingFallback() {
    setIsRecordingFallback(true);
    recordedChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("file", blob, "recording.webm");
        fd.append("language", language);

        try {
          const sttResp = await fetch(`${API_BASE_URL}/api/stt`, { method: "POST", body: fd });
          const sttJson = await sttResp.json();
          if (sttJson.transcript) {
            handleUserText(sttJson.transcript, language);
          }
        } catch (err) {
          console.error("STT error:", err);
        }

        setIsRecordingFallback(false);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
    } catch (err) {
      console.error("Mic access error:", err);
      setIsRecordingFallback(false);
    }
  }

  function stopRecordingFallback() {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function stopCurrentAudio() {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = '';
      } catch (e) {
        console.error("Error stopping audio:", e);
      }
      currentAudioRef.current = null;
    }
    setCurrentlyPlaying(null);
  }

  async function playBotVoice(index) {
    const msg = messages[index];
    if (!msg || msg.sender !== "bot") return;

    if (currentlyPlaying === index) {
      stopCurrentAudio();
      return;
    }

    stopCurrentAudio();
    setCurrentlyPlaying(index);
    setAudioError(null);

    if (msg.audioBlob) {
      playAudioBlob(msg.audioBlob, index);
      return;
    }

    try {
      const ttsResp = await fetch(`${API_BASE_URL}/api/tts`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "audio/mpeg, audio/mp3, audio/*, */*"
        },
        body: JSON.stringify({ text: msg.text, language }),
      });

      if (ttsResp.ok) {
        const audioBlob = await ttsResp.blob();
        
        if (audioBlob.size > 0) {
          const correctedBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
          playAudioBlob(correctedBlob, index);
          
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[index] = { ...newMsgs[index], audioBlob: correctedBlob };
            return newMsgs;
          });
        } else {
          setAudioError("Received empty audio data");
          playWithBrowserTTS(msg.text, index);
        }
      } else {
        setAudioError(`TTS failed`);
        playWithBrowserTTS(msg.text, index);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setAudioError(err.message);
      playWithBrowserTTS(msg.text, index);
    }
  }

  function playWithBrowserTTS(text, index) {
    if (!window.speechSynthesis) {
      setCurrentlyPlaying(null);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = mapLangToLocale(language);
      utterance.onend = () => setCurrentlyPlaying(null);
      utterance.onerror = () => {
        setCurrentlyPlaying(null);
        setAudioError("Browser TTS failed");
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setCurrentlyPlaying(null);
      setAudioError("Browser TTS unavailable");
    }
  }

  function playAudioBlob(blob, index) {
    if (blob.size === 0) {
      setAudioError("Empty audio data");
      setCurrentlyPlaying(null);
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      audioUrlsRef.current.add(url);
      
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      currentAudioRef.current = audio;

      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
        audioUrlsRef.current.delete(url);
      });

      audio.addEventListener('error', () => {
        setAudioError("Playback error");
        setCurrentlyPlaying(null);
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
        audioUrlsRef.current.delete(url);
      });

      audio.src = url;
      audio.load();

      setTimeout(() => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setAudioError(null))
            .catch((err) => {
              setAudioError(`Playback failed: ${err.message}`);
              setCurrentlyPlaying(null);
              currentAudioRef.current = null;
              URL.revokeObjectURL(url);
              audioUrlsRef.current.delete(url);
            });
        }
      }, 100);

    } catch (err) {
      setAudioError(err.message);
      setCurrentlyPlaying(null);
    }
  }

  function handleMicClick() {
    if (recognitionSupported) {
      listening ? stopRecognition() : startRecognition();
    } else {
      isRecordingFallback ? stopRecordingFallback() : startRecordingFallback();
    }
  }

  function handleTextSubmit() {
    const txt = inputText.trim();
    if (!txt) return;
    setInputText("");
    handleUserText(txt, language);
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  }

  async function handleLogout() {
    try {
      await logout();
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to log out', err);
    }
  }

  if (showLocationFinder) {
    return (
      <div>
        <div style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          zIndex: 1000
        }}>
          <button
            onClick={() => setShowLocationFinder(false)}
            style={{
              padding: "12px 20px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            ← Back to Chat
          </button>
        </div>
        <LocationFinder />
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* Backend Status Indicator */}
      <div style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        zIndex: 1000,
        padding: "8px 12px",
        background: isLoading ? "#fbbf24" : "#10b981",
        color: "white",
        borderRadius: "8px",
        fontSize: "0.85rem",
        fontWeight: "600",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
      }}>
        {isLoading ? "⏳ Processing..." : "● Connected"}
      </div>

      <div style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 1000,
        display: 'flex',
        gap: '10px'
      }}>
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 16px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.9rem'
            }}>
              {currentUser.email[0].toUpperCase()}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>
              {currentUser.email.split('@')[0]}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                background: '#fee2e2',
                border: 'none',
                borderRadius: '8px',
                color: '#dc2626',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: "12px 20px",
            borderRadius: "12px",
            border: "none",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
          }}
        >
          Home
        </button>
      </div>

      <div className="app-card">
        <header className="app-header">
          <h1>Bite Line - Voice Chat</h1>
          <div className="controls">
            <button
              onClick={() => setShowLocationFinder(true)}
              style={{
                padding: "10px 18px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "14px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                transition: "all 0.3s"
              }}
            >
              🏥 Find Clinics
            </button>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button
              onClick={handleMicClick}
              className={`mic-btn ${listening || isRecordingFallback ? 'active' : ''}`}
            >
              {recognitionSupported
                ? (listening ? "⏹ Stop" : "🎤 Speak")
                : (isRecordingFallback ? "⏹ Stop" : "🎙 Record")}
            </button>
          </div>
        </header>

        {audioError && (
          <div style={{
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            color: "#dc2626",
            padding: "12px 20px",
            textAlign: "center",
            fontSize: "14px",
            fontWeight: "500",
            borderBottom: "1px solid #fca5a5"
          }}>
            🔊 Audio Error: {audioError}
          </div>
        )}

        <main ref={chatBoxRef} className="chat-container">
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              padding: '3rem 1rem',
              fontSize: '1rem'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <p>Start a conversation by typing or speaking!</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Ask about animal bites, treatment, or prevention
              </p>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div 
              key={m.id || i} 
              style={{
                display: "flex",
                justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-start",
                gap: "12px"
              }}
            >
              {m.sender === "user" ? (
                <>
                  <div className="chat-msg user">
                    <span className="chat-text">{m.text}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="chat-msg bot">
                    <span className="chat-text">{m.text}</span>
                  </div>
                  <button
                    onClick={() => playBotVoice(i)}
                    title={currentlyPlaying === i ? "Stop voice" : "Play voice"}
                    className="play-btn"
                    style={{
                      background: currentlyPlaying === i 
                        ? "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" 
                        : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
                    }}
                  >
                    {currentlyPlaying === i ? "⏸" : "🔊"}
                  </button>
                </>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "12px",
              padding: "1rem"
            }}>
              <div className="chat-msg bot" style={{ opacity: 0.7 }}>
                <span className="chat-text">Typing...</span>
              </div>
            </div>
          )}
        </main>

        <div className="composer">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message or press Speak..." 
            autoComplete="off"
            disabled={isLoading}
          />
          <button onClick={handleTextSubmit} disabled={isLoading || !inputText.trim()}>
            Send
          </button>
        </div>
      </div>
      
      <div className="footer-note">
        <p>Select your preferred language and start chatting!</p>
        <p style={{ fontSize: "13px", opacity: 0.9, marginTop: "6px" }}>
          Or find nearby treatment centers with the 🏥 Find Clinics button
        </p>
        <p style={{ fontSize: "12px", opacity: 0.7, marginTop: "6px", color: "#dc2626" }}>
          Backend: {API_BASE_URL}
        </p>
      </div>
    </div>
  );
}