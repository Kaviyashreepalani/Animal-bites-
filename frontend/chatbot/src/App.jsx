import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import "./index.css";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English (en-US)" },
  { code: "hi", label: "Hindi (hi-IN)" },
  { code: "ta", label: "Tamil (ta-IN)" },
  { code: "te", label: "Telugu (te-IN)" },
];

export default function App() {
  const [messages, setMessages] = useState([]); // {sender, text, audioBlob?}
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("en");
  const [isRecordingFallback, setIsRecordingFallback] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null); // Track which message is playing

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const chatBoxRef = useRef(null);
  const currentAudioRef = useRef(null); // Track the current audio element

  // Setup speech recognition
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
        handleUserText(transcript,language);
      };

      rec.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        setListening(false);
      };

      recognitionRef.current = rec;
    } else {
      console.log("Speech recognition not supported, using fallback recording");
    }
  }, []);

  // Update recognition language when user changes language
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = mapLangToLocale(language);
      console.log(`Updated speech recognition language to: ${mapLangToLocale(language)}`);
    }
  }, [language]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Send language change to backend when language changes
  useEffect(() => {
    const setBackendLanguage = async () => {
      try {
        console.log(`Setting backend language to: ${language}`);
        const response = await fetch("/api/set_language", {
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

  function mapLangToLocale(code) {
    switch (code) {
      case "en": return "en-US";
      case "hi": return "hi-IN";
      case "ta": return "ta-IN";
      case "te": return "te-IN";
      default: return "en-US";
    }
  }

  // Handle sending user text to backend
  // Handle sending user text to backend
async function handleUserText(text, forcedLang) {
  if (!text.trim()) return;

  const effectiveLang = forcedLang || language;
  console.log(`Sending user message: "${text}" in language: ${effectiveLang}`);
  addMessage("user", text);

  try {
    const chatResp = await fetch("/api/process_message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: text // ✅ use effectiveLang
      }),
    });

    if (!chatResp.ok) throw new Error(`HTTP error! status: ${chatResp.status}`);
    
    const chatJson = await chatResp.json();
    console.log("Backend response:", chatJson);
    const reply = chatJson.reply ?? "Sorry, no reply.";

    // Generate TTS audio
    try {
      console.log(`Generating TTS for: "${reply}" in language: ${effectiveLang}`);
      const ttsResp = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply}),
      });

      if (ttsResp.ok && ttsResp.headers.get("content-type")?.includes("audio")) {
        const audioBlob = await ttsResp.blob();
        console.log("TTS audio generated successfully");
        addMessage("bot", reply, audioBlob);
      } else {
        console.error("TTS generation failed:", ttsResp.status, ttsResp.statusText);
        addMessage("bot", reply);
      }
    } catch (err) {
      console.error("Error generating TTS audio:", err);
      addMessage("bot", reply);
    }
  } catch (err) {
    console.error("Chat error:", err);
    addMessage("bot", "Error contacting chatbot.");
  }
}


  function addMessage(sender, text, audioBlob) {
    setMessages((m) => [...m, { sender, text, audioBlob }]);
  }

  // Speech recognition start/stop
  function startRecognition() {
    console.log("Starting speech recognition");
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
    console.log("Stopping speech recognition");
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

  // Fallback audio recording for STT
  async function startRecordingFallback() {
    console.log("Starting fallback recording");
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
        console.log("Recording stopped, sending to STT");
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("file", blob, "recording.webm");

        try {
          const sttResp = await fetch("/api/stt", { method: "POST", body: fd });
          const sttJson = await sttResp.json();
          console.log("STT response:", sttJson);
          if (sttJson.transcript) {
            handleUserText(sttJson.transcript,language);
          } else {
            console.error("No transcript received from STT");
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
    console.log("Stopping fallback recording");
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  // Stop any currently playing audio
  function stopCurrentAudio() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setCurrentlyPlaying(null);
  }

  // Play voice for a bot message with toggle functionality
  async function playBotVoice(index) {
    const msg = messages[index];
    if (!msg || msg.sender !== "bot") return;

    // If this message is currently playing, stop it
    if (currentlyPlaying === index) {
      stopCurrentAudio();
      return;
    }

    // Stop any other currently playing audio
    stopCurrentAudio();

    // Set this message as currently playing
    setCurrentlyPlaying(index);

    if (msg.audioBlob) {
      playAudioBlob(msg.audioBlob, index);
      return;
    }

    try {
      console.log(`Generating TTS for message: "${msg.text}" in language: ${language}`);
      const ttsResp = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.text, language }),
      });

      if (ttsResp.ok && ttsResp.headers.get("content-type")?.includes("audio")) {
        const audioBlob = await ttsResp.blob();
        playAudioBlob(audioBlob, index);
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[index] = { ...newMsgs[index], audioBlob };
          return newMsgs;
        });
      } else {
        console.error("TTS fetch failed:", ttsResp.status, ttsResp.statusText);
        setCurrentlyPlaying(null);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setCurrentlyPlaying(null);
    }
  }

  function playAudioBlob(blob, index) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudioRef.current = audio;

    audio.onended = () => {
      setCurrentlyPlaying(null);
      currentAudioRef.current = null;
      URL.revokeObjectURL(url);
    };

    audio.onerror = (err) => {
      console.error("Audio playback error:", err);
      setCurrentlyPlaying(null);
      currentAudioRef.current = null;
      URL.revokeObjectURL(url);
    };

    audio.play().catch((err) => {
      console.error("Audio play error:", err);
      setCurrentlyPlaying(null);
      currentAudioRef.current = null;
      URL.revokeObjectURL(url);
    });
  }

  function handleMicClick() {
    if (recognitionSupported) {
      listening ? stopRecognition() : startRecognition();
    } else {
      isRecordingFallback ? stopRecordingFallback() : startRecordingFallback();
    }
  }

  function handleTextSubmit(e) {
    e.preventDefault();
    const txt = e.target.elements.inputText.value;
    if (!txt.trim()) return;
    e.target.elements.inputText.value = "";
    handleUserText(txt.trim(),language);
  }

  return (
    <div className="app-root">
      <div className="app-card">
        <header className="app-header">
          <h1>Animal Bites — Voice Chat</h1>
          <div className="controls">
            <select value={language} onChange={(e) => {
              console.log(`Language changed to: ${e.target.value}`);
              setLanguage(e.target.value);
            }}>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button
              className={`mic-btn ${listening || isRecordingFallback ? "active" : ""}`}
              onClick={handleMicClick}
            >
              {recognitionSupported
                ? (listening ? "Stop Listening" : "Speak")
                : (isRecordingFallback ? "Stop Recording" : "Record")}
            </button>
          </div>
        </header>

        <main className="chat-container" ref={chatBoxRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.sender}`}>
              <div className="chat-text">
                {m.text}
              </div>
              {m.sender === "bot" && (
                <button
                  className="play-btn"
                  onClick={() => playBotVoice(i)}
                  title={currentlyPlaying === i ? "Stop voice" : "Play voice"}
                  style={{
                    background: currentlyPlaying === i 
                      ? "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" 
                      : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
                  }}
                >
                  {currentlyPlaying === i ? "⏸️" : "🔊"}
                </button>
              )}
            </div>
          ))}
        </main>

        <form className="composer" onSubmit={handleTextSubmit}>
          <input name="inputText" placeholder="Type a message or press Speak" autoComplete="off" />
          <button type="submit">Send</button>
        </form>
      </div>
      
      <div className="footer-note">
        <p>Select your preferred language and start chatting!</p>
      </div>
    </div>
  );
}