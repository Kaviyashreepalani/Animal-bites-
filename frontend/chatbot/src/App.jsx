import React, { useState, useRef, useEffect } from "react";
import LocationFinder from "./LocationFinder"; // Import the new component

const API_BASE_URL = "https://animal-bites-backend-4.onrender.com";

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
  const [showLocationFinder, setShowLocationFinder] = useState(false); // NEW STATE

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const chatBoxRef = useRef(null);
  const currentAudioRef = useRef(null);
  const audioUrlsRef = useRef(new Set());

  // ... (all your existing useEffect hooks remain the same)
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
    } else {
      console.log("Speech recognition not supported, using fallback recording");
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
      console.log(`Updated speech recognition language to: ${mapLangToLocale(language)}`);
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

  // ... (all your existing functions remain the same)
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

  async function handleUserText(text, forcedLang) {
    if (!text.trim()) return;

    const effectiveLang = forcedLang || language;
    console.log(`Sending user message: "${text}" in language: ${effectiveLang}`);
    addMessage("user", text);

    try {
      const chatResp = await fetch(`${API_BASE_URL}/api/process_message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text, 
          language: effectiveLang
        }),
      });

      if (!chatResp.ok) throw new Error(`HTTP error! status: ${chatResp.status}`);
      
      const chatJson = await chatResp.json();
      console.log("Backend response:", chatJson);
      const reply = chatJson.reply ?? "Sorry, no reply.";

      try {
        console.log(`Generating TTS for: "${reply}" in language: ${effectiveLang}`);
        const ttsResp = await fetch(`${API_BASE_URL}/api/tts`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "audio/mpeg, audio/mp3, audio/*, */*"
          },
          body: JSON.stringify({ text: reply, language: effectiveLang }),
        });

        if (ttsResp.ok) {
          const contentType = ttsResp.headers.get("content-type");
          console.log("TTS response content-type:", contentType);
          
          const audioBlob = await ttsResp.blob();
          console.log("TTS audio blob received - size:", audioBlob.size, "type:", audioBlob.type);
          
          if (audioBlob.size > 0) {
            const correctedBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
            addMessage("bot", reply, correctedBlob);
          } else {
            console.error("Audio blob is empty");
            addMessage("bot", reply);
          }
        } else {
          const errorText = await ttsResp.text();
          console.error("TTS generation failed:", ttsResp.status, ttsResp.statusText, errorText);
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
    setMessages((m) => [...m, { sender, text, audioBlob, id: Date.now() + Math.random() }]);
  }

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
        fd.append("language", language);

        try {
          const sttResp = await fetch(`${API_BASE_URL}/api/stt`, { method: "POST", body: fd });
          const sttJson = await sttResp.json();
          console.log("STT response:", sttJson);
          if (sttJson.transcript) {
            handleUserText(sttJson.transcript, language);
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

  function stopCurrentAudio() {
    if (currentAudioRef.current) {
      console.log("Stopping current audio");
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

    console.log(`Play button clicked for message ${index}`);

    if (currentlyPlaying === index) {
      console.log("Stopping currently playing audio");
      stopCurrentAudio();
      return;
    }

    stopCurrentAudio();
    setCurrentlyPlaying(index);
    setAudioError(null);

    if (msg.audioBlob) {
      console.log("Playing existing audio blob, size:", msg.audioBlob.size, "type:", msg.audioBlob.type);
      playAudioBlob(msg.audioBlob, index);
      return;
    }

    try {
      console.log(`Fetching TTS for message: "${msg.text}" in language: ${language}`);
      const ttsResp = await fetch(`${API_BASE_URL}/api/tts`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "audio/mpeg, audio/mp3, audio/*, */*"
        },
        body: JSON.stringify({ text: msg.text, language }),
      });

      if (ttsResp.ok) {
        const contentType = ttsResp.headers.get("content-type");
        console.log("TTS response content-type:", contentType);
        
        const audioBlob = await ttsResp.blob();
        console.log("TTS audio fetched successfully, size:", audioBlob.size, "type:", audioBlob.type);
        
        if (audioBlob.size > 0) {
          const correctedBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
          playAudioBlob(correctedBlob, index);
          
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[index] = { ...newMsgs[index], audioBlob: correctedBlob };
            return newMsgs;
          });
        } else {
          console.error("Audio blob is empty");
          setAudioError("Received empty audio data");
          playWithBrowserTTS(msg.text, index);
        }
      } else {
        const errorText = await ttsResp.text();
        console.error("TTS fetch failed:", ttsResp.status, ttsResp.statusText, errorText);
        setAudioError(`TTS failed: ${ttsResp.status}`);
        playWithBrowserTTS(msg.text, index);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setAudioError(err.message);
      playWithBrowserTTS(msg.text, index);
    }
  }

  function playWithBrowserTTS(text, index) {
    console.log("Using browser TTS fallback");
    
    if (!window.speechSynthesis) {
      console.error("Browser TTS not supported");
      setCurrentlyPlaying(null);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = mapLangToLocale(language);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log("Browser TTS started");
      };

      utterance.onend = () => {
        console.log("Browser TTS ended");
        setCurrentlyPlaying(null);
      };

      utterance.onerror = (e) => {
        console.error("Browser TTS error:", e);
        setCurrentlyPlaying(null);
        setAudioError("Browser TTS failed");
      };

      window.speechSynthesis.speak(utterance);
      console.log("Browser TTS initiated");
    } catch (err) {
      console.error("Browser TTS error:", err);
      setCurrentlyPlaying(null);
      setAudioError("Browser TTS unavailable");
    }
  }

  function playAudioBlob(blob, index) {
    console.log("=== AUDIO PLAYBACK START ===");
    console.log("Blob size:", blob.size, "bytes");
    console.log("Blob type:", blob.type);
    
    if (blob.size === 0) {
      console.error("Cannot play empty audio blob");
      setAudioError("Empty audio data");
      setCurrentlyPlaying(null);
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      console.log("Created object URL:", url);
      audioUrlsRef.current.add(url);
      
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      currentAudioRef.current = audio;

      audio.addEventListener('loadstart', () => {
        console.log("✓ Audio load started");
      });

      audio.addEventListener('loadedmetadata', () => {
        console.log("✓ Audio metadata loaded");
        console.log("  Duration:", audio.duration, "seconds");
        console.log("  Ready state:", audio.readyState);
      });

      audio.addEventListener('canplay', () => {
        console.log("✓ Audio can play (enough data loaded)");
      });

      audio.addEventListener('canplaythrough', () => {
        console.log("✓ Audio can play through (fully buffered)");
      });

      audio.addEventListener('playing', () => {
        console.log("✓ Audio is now playing");
      });

      audio.addEventListener('ended', () => {
        console.log("✓ Audio playback ended normally");
        setCurrentlyPlaying(null);
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
        audioUrlsRef.current.delete(url);
      });

      audio.addEventListener('error', (e) => {
        console.error("✗ Audio playback error event fired");
        if (audio.error) {
          console.error("  Error code:", audio.error.code);
          console.error("  Error message:", audio.error.message);
          const errorMessages = {
            1: "MEDIA_ERR_ABORTED - Playback aborted",
            2: "MEDIA_ERR_NETWORK - Network error",
            3: "MEDIA_ERR_DECODE - Decoding error",
            4: "MEDIA_ERR_SRC_NOT_SUPPORTED - Format not supported"
          };
          console.error("  Error description:", errorMessages[audio.error.code] || "Unknown error");
          setAudioError(errorMessages[audio.error.code] || "Playback error");
        }
        setCurrentlyPlaying(null);
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
        audioUrlsRef.current.delete(url);
      });

      console.log("Setting audio source...");
      audio.src = url;
      
      console.log("Calling audio.load()...");
      audio.load();

      setTimeout(() => {
        console.log("Attempting to play audio...");
        console.log("Audio ready state:", audio.readyState);
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("✓✓✓ Audio playback started successfully! ✓✓✓");
              setAudioError(null);
            })
            .catch((err) => {
              console.error("✗✗✗ Audio play() promise rejected ✗✗✗");
              console.error("Error name:", err.name);
              console.error("Error message:", err.message);
              console.error("Full error:", err);
              setAudioError(`Playback failed: ${err.message}`);
              setCurrentlyPlaying(null);
              currentAudioRef.current = null;
              URL.revokeObjectURL(url);
              audioUrlsRef.current.delete(url);
            });
        }
      }, 100);

    } catch (err) {
      console.error("✗ Error in playAudioBlob:", err);
      setAudioError(err.message);
      setCurrentlyPlaying(null);
    }
    
    console.log("=== AUDIO PLAYBACK SETUP COMPLETE ===");
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

  // NEW: Render location finder if toggled
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
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        background: "white",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        width: "100%",
        maxWidth: "800px",
        overflow: "hidden"
      }}>
        <header style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>
            Bite Line - Voice Chat
          </h1>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* NEW: Location finder button */}
            <button
              onClick={() => setShowLocationFinder(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "white",
                color: "#667eea",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "14px",
                transition: "all 0.3s"
              }}
            >
              🏥 Find Clinics
            </button>
            <select 
              value={language} 
              onChange={(e) => {
                console.log(`Language changed to: ${e.target.value}`);
                setLanguage(e.target.value);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "14px",
                cursor: "pointer"
              }}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button
              onClick={handleMicClick}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: listening || isRecordingFallback 
                  ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                  : "white",
                color: listening || isRecordingFallback ? "white" : "#667eea",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "14px",
                transition: "all 0.3s"
              }}
            >
              {recognitionSupported
                ? (listening ? "⏹ Stop" : "🎤 Speak")
                : (isRecordingFallback ? "⏹ Stop" : "🎙 Record")}
            </button>
          </div>
        </header>

        {audioError && (
          <div style={{
            background: "#fee",
            color: "#c00",
            padding: "10px",
            textAlign: "center",
            fontSize: "14px"
          }}>
            Audio Error: {audioError}
          </div>
        )}

        <main 
          ref={chatBoxRef}
          style={{
            height: "500px",
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "15px"
          }}
        >
          {messages.map((m, i) => (
            <div 
              key={m.id || i} 
              style={{
                display: "flex",
                justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-start",
                gap: "10px"
              }}
            >
              <div style={{
                maxWidth: "70%",
                background: m.sender === "user" 
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "#f3f4f6",
                color: m.sender === "user" ? "white" : "#1f2937",
                padding: "12px 16px",
                borderRadius: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                {m.text}
              </div>
              {m.sender === "bot" && (
                <button
                  onClick={() => playBotVoice(i)}
                  title={currentlyPlaying === i ? "Stop voice" : "Play voice"}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "none",
                    background: currentlyPlaying === i 
                      ? "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" 
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    transition: "all 0.3s"
                  }}
                >
                  {currentlyPlaying === i ? "⏸" : "🔊"}
                </button>
              )}
            </div>
          ))}
        </main>

        <div
          style={{
            padding: "20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: "10px"
          }}
        >
          <input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message or press Speak" 
            autoComplete="off"
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "12px",
              border: "2px solid #e5e7eb",
              fontSize: "14px",
              outline: "none",
              transition: "border 0.3s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#667eea"}
            onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
          />
          <button 
            onClick={handleTextSubmit}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
              transition: "transform 0.2s"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Send
          </button>
        </div>
      </div>
      
      <div style={{
        marginTop: "20px",
        color: "white",
        textAlign: "center",
        fontSize: "14px"
      }}>
        <p>Select your preferred language and start chatting!</p>
        <p style={{ fontSize: "12px", opacity: 0.8 }}>
          Or find nearby treatment centers with the 🏥 Find Clinics button
        </p>
      </div>
    </div>
  );
}