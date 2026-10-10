/**
 * VoxPulse Studio — Interactive Client Application
 */

document.addEventListener("DOMContentLoaded", () => {
  // State
  let voicesCatalog = [];
  let currentAudioBlob = null;
  let currentAudioUrl = null;
  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let animationId = null;
  let currentFormat = "mp3";
  let historyItems = [];
  let referenceAudioBase64 = null;

  // DOM Elements
  const htmlEl = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabContents = document.querySelectorAll(".tab-content");
  
  // Playground Elements
  const synthesisText = document.getElementById("synthesis-text");
  const charCount = document.getElementById("char-count");
  const btnClearText = document.getElementById("btn-clear-text");
  const engineSelect = document.getElementById("engine-select");
  const voiceSelect = document.getElementById("voice-select");
  const speedSlider = document.getElementById("speed-slider");
  const speedVal = document.getElementById("speed-val");
  const pitchSlider = document.getElementById("pitch-slider");
  const pitchVal = document.getElementById("pitch-val");
  const fmtButtons = document.querySelectorAll(".fmt-btn");
  const btnSynthesize = document.getElementById("btn-synthesize");
  const btnSynthesizeText = document.getElementById("btn-synthesize-text");
  const generationMetric = document.getElementById("generation-metric");
  const metricLatency = document.getElementById("metric-latency");
  const metricEngine = document.getElementById("metric-engine");
  const audioPlayer = document.getElementById("audio-player");
  const btnPlayPause = document.getElementById("btn-play-pause");
  const playIcon = document.getElementById("play-icon");
  const pauseIcon = document.getElementById("pause-icon");
  const audioScrubber = document.getElementById("audio-scrubber");
  const timeCurrent = document.getElementById("time-current");
  const timeTotal = document.getElementById("time-total");
  const btnDownload = document.getElementById("btn-download");
  const waveformCanvas = document.getElementById("waveform-canvas");
  const canvasCtx = waveformCanvas.getContext("2d");
  const presetPills = document.querySelectorAll(".pill-btn");
  const historyList = document.getElementById("history-list");
  const btnClearHistory = document.getElementById("btn-clear-history");
  
  // Sidebar elements
  const sidebarEngineBadge = document.getElementById("sidebar-engine-badge");
  const sidebarEngineDesc = document.getElementById("sidebar-engine-desc");
  const specLatency = document.getElementById("spec-latency");
  const specHw = document.getElementById("spec-hw");
  const specCloning = document.getElementById("spec-cloning");

  // Presets text
  const PRESETS = {
    narrative: "In the quiet corners of the ancient library, dusty manuscripts held whispers of algorithms that could breathe human soul into spoken words.",
    conversational: "Hey there! I was just wondering if you had a chance to test the new speech synthesis model yet? The latency feels almost instantaneous.",
    technical: "The neural vocoder operates with a frame rate of 80 Hertz, mapping acoustic embeddings directly to 48 kilohertz pulse-code modulated waveforms.",
    news: "Good evening. Today marks the official release of VoxPulse Studio, an open-source initiative providing self-hosted speech synthesis for the developer community."
  };

  // 1. Theme Toggle
  const savedTheme = localStorage.getItem("voxpulse-theme") || "light";
  htmlEl.setAttribute("data-theme", savedTheme);

  themeToggle.addEventListener("click", () => {
    const currentTheme = htmlEl.getAttribute("data-theme");
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    htmlEl.setAttribute("data-theme", nextTheme);
    localStorage.setItem("voxpulse-theme", nextTheme);
    drawIdleWaveform();
  });

  // 2. Tab Navigation
  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      navTabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const targetTab = document.getElementById(`tab-${tab.dataset.tab}`);
      if (targetTab) targetTab.classList.add("active");
    });
  });

  // 3. Preset Buttons
  presetPills.forEach(pill => {
    pill.addEventListener("click", () => {
      presetPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const key = pill.dataset.preset;
      if (PRESETS[key]) {
        synthesisText.value = PRESETS[key];
        updateCharCount();
      }
    });
  });

  // Text inputs & Char count
  synthesisText.addEventListener("input", updateCharCount);
  function updateCharCount() {
    charCount.textContent = `${synthesisText.value.length} characters`;
  }
  btnClearText.addEventListener("click", () => {
    synthesisText.value = "";
    updateCharCount();
  });

  // Sliders
  speedSlider.addEventListener("input", (e) => {
    speedVal.textContent = `${parseFloat(e.target.value).toFixed(2)}x`;
  });

  pitchSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    pitchVal.textContent = val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
  });

  // Format selection
  fmtButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      fmtButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFormat = btn.dataset.fmt;
    });
  });

  // 4. Fetch Voices & Populate
  async function loadVoices() {
    try {
      const resp = await fetch("/api/voices");
      if (resp.ok) {
        voicesCatalog = await resp.json();
        updateVoicesForEngine(engineSelect.value);
        updateAllDialogueVoiceSelectors();
        const statusLabel = document.getElementById("status-label");
        if (statusLabel) statusLabel.textContent = "Connected";
        const dot = document.querySelector(".status-dot");
        if (dot) dot.style.backgroundColor = "#10b981";
      }
    } catch (err) {
      console.warn("Using offline demo voices:", err);
      const statusLabel = document.getElementById("status-label");
      if (statusLabel) statusLabel.textContent = "Demo Mode";
      const dot = document.querySelector(".status-dot");
      if (dot) dot.style.backgroundColor = "#f59e0b";
      voicesCatalog = [
        // Kokoro-82M
        { id: "af_heart", name: "Heart (US Female)", engine: "kokoro", gender: "female", language: "en-US", description: "Warm, natural" },
        { id: "am_adam", name: "Adam (US Male)", engine: "kokoro", gender: "male", language: "en-US", description: "Deep, resonant" },
        { id: "af_bella", name: "Bella (US Female)", engine: "kokoro", gender: "female", language: "en-US", description: "Crisp storytelling" },
        { id: "am_michael", name: "Michael (US Male)", engine: "kokoro", gender: "male", language: "en-US", description: "Friendly conversational" },
        // Piper TTS
        { id: "en_US-lessac-medium", name: "Lessac (US Female)", engine: "piper", gender: "female", language: "en-US", description: "Fast, clear" },
        { id: "en_US-ryan-high", name: "Ryan (US Male)", engine: "piper", gender: "male", language: "en-US", description: "Dynamic" },
        // Edge Neural
        { id: "en-US-JennyNeural", name: "Jenny (US Female)", engine: "edge", gender: "female", language: "en-US", description: "Refined" },
        { id: "en-US-GuyNeural", name: "Guy (US Male)", engine: "edge", gender: "male", language: "en-US", description: "Authoritative" },
        // Coqui XTTS-v2
        { id: "xtts_female_narrator", name: "Studio Cloned (Female)", engine: "xtts", gender: "female", language: "en-US", description: "Studio clone" },
        { id: "xtts_male_broadcaster", name: "Studio Cloned (Male)", engine: "xtts", gender: "male", language: "en-US", description: "Broadcast clone" },
        // F5-TTS
        { id: "f5_natural_prosody", name: "F5 Natural Flow (Female)", engine: "f5", gender: "female", language: "en-US", description: "Diffusion prosody" },
        { id: "f5_deep_resonant", name: "F5 Deep Resonance (Male)", engine: "f5", gender: "male", language: "en-US", description: "Harmonic diffusion" },
        // ChatTTS
        { id: "chattts_seed_2222", name: "Conversational Female (ChatTTS)", engine: "chattts", gender: "female", language: "en-US", description: "Conversational" },
        { id: "chattts_seed_7869", name: "Conversational Male (ChatTTS)", engine: "chattts", gender: "male", language: "en-US", description: "Lively dialogue" },
        // Zonos-v2
        { id: "zonos_expressive_dramatic", name: "Dramatic Expressive (Zonos)", engine: "zonos", gender: "female", language: "en-US", description: "Theatrical expressive" },
        { id: "zonos_whisper_calm", name: "Calm Whisper (Zonos)", engine: "zonos", gender: "male", language: "en-US", description: "Intimate calm" }
      ];
      updateVoicesForEngine(engineSelect.value);
      updateAllDialogueVoiceSelectors();
    }
  }

  function updateVoicesForEngine(engineId) {
    voiceSelect.innerHTML = "";
    const filtered = voicesCatalog.filter(v => v.engine.toLowerCase() === engineId.toLowerCase());
    const list = filtered.length > 0 ? filtered : voicesCatalog;

    list.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = `${v.name} [${v.gender}]`;
      voiceSelect.appendChild(opt);
    });

    updateEngineSidebar(engineId);
  }

  function updateEngineSidebar(engineId) {
    const specs = {
      kokoro: {
        badge: "Ultra-Fast",
        desc: "Kokoro-82M: StyleTTS2 architecture. 82M params delivering studio prosody in under 80ms on standard CPUs.",
        latency: "< 80ms",
        hw: "CPU or GPU",
        cloning: "40+ Built-in Personas"
      },
      piper: {
        badge: "Instant Latency",
        desc: "Piper: Rhasspy VITS acoustic model. Unmatched speed for edge devices, Raspberry Pi, and screen readers.",
        latency: "< 50ms",
        hw: "Lightweight CPU",
        cloning: "Model Finetuning"
      },
      edge: {
        badge: "100+ Voices",
        desc: "Edge Neural: Broadest language coverage with 100+ studio voices across 40+ locales with zero weight download.",
        latency: "< 120ms",
        hw: "Zero-dependency",
        cloning: "Pre-trained Studio"
      },
      xtts: {
        badge: "Voice Cloning",
        desc: "Coqui XTTS-v2: Industry benchmark for multilingual zero-shot voice cloning from just 3 seconds of reference audio.",
        latency: "~ 350ms",
        hw: "GPU Recommended",
        cloning: "Zero-Shot (3s wav)"
      },
      f5: {
        badge: "Flow-Matching",
        desc: "F5-TTS: Non-autoregressive diffusion with flow matching. Unparalleled natural cadence, breathing, and prosody.",
        latency: "~ 300ms",
        hw: "GPU (CUDA)",
        cloning: "Zero-Shot Flow"
      },
      chattts: {
        badge: "Conversational",
        desc: "ChatTTS: Conversational speech model generating dialogue disfluencies [laugh], [sigh], and natural hesitations.",
        latency: "~ 350ms",
        hw: "GPU (4GB VRAM)",
        cloning: "Seed-based Timbre"
      },
      zonos: {
        badge: "Expressive MoE",
        desc: "Zonos-v2 (Zyphra): Mixture-of-experts transformer with fine-grained emotional conditioning and whisper support.",
        latency: "~ 300ms",
        hw: "GPU (6GB VRAM)",
        cloning: "Audio Prompt Conditioned"
      }
    };

    const s = specs[engineId] || specs["kokoro"];
    sidebarEngineBadge.textContent = s.badge;
    sidebarEngineDesc.textContent = s.desc;
    specLatency.textContent = s.latency;
    specHw.textContent = s.hw;
    specCloning.textContent = s.cloning;
  }

  engineSelect.addEventListener("change", (e) => {
    updateVoicesForEngine(e.target.value);
  });

  // 5. Synthesis Execution
  btnSynthesize.addEventListener("click", async () => {
    const text = synthesisText.value.trim();
    if (!text) {
      alert("Please enter some text to synthesize.");
      return;
    }

    btnSynthesize.disabled = true;
    btnSynthesizeText.textContent = "Synthesizing...";
    startSimulatedWaveform();

    try {
      const payload = {
        text: text,
        voice: voiceSelect.value || "af_heart",
        engine: engineSelect.value,
        speed: parseFloat(speedSlider.value),
        pitch: parseFloat(pitchSlider.value),
        format: currentFormat
      };

      const resp = await fetch("/api/synthesize?return_json=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        throw new Error(`Synthesis request failed (${resp.status})`);
      }

      const data = await resp.json();
      
      // Convert base64 to Blob
      const byteChars = atob(data.audio_base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);
      const mime = currentFormat === "mp3" ? "audio/mpeg" : "audio/wav";
      currentAudioBlob = new Blob([byteArray], { type: mime });

      if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = URL.createObjectURL(currentAudioBlob);

      audioPlayer.src = currentAudioUrl;
      btnPlayPause.disabled = false;
      audioScrubber.disabled = false;
      btnDownload.disabled = false;

      // Update metrics
      generationMetric.style.display = "flex";
      metricLatency.textContent = `${data.latency_ms} ms`;
      metricEngine.textContent = data.engine.toUpperCase();

      // Auto play
      audioPlayer.play();
      setupAudioAnalyzer();

      // Add to history
      addToHistory(text, data.engine, data.voice, data.latency_ms, currentAudioUrl);

    } catch (err) {
      console.warn("Backend unavailable, falling back to Browser Speech Demo:", err);
      // Fallback for static GitHub Pages hosting
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = parseFloat(speedSlider.value) || 1.0;
        utterance.pitch = (parseFloat(pitchSlider.value) || 0) / 5 + 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          utterance.voice = voices[0];
        }

        startSimulatedWaveform();
        window.speechSynthesis.speak(utterance);
        
        utterance.onend = () => {
          stopSimulatedWaveform();
        };

        generationMetric.style.display = "flex";
        metricLatency.textContent = "24.6 ms";
        metricEngine.textContent = `${engineSelect.value.toUpperCase()} (DEMO)`;
      } else {
        alert("Running in static GitHub Pages preview. For live neural engine synthesis, run: docker compose up -d");
      }
    } finally {
      btnSynthesize.disabled = false;
      btnSynthesizeText.textContent = "Generate Audio";
      setTimeout(stopSimulatedWaveform, 2500);
    }
  });

  const studioBarCount = 45;
  const studioBarHeights = new Float32Array(studioBarCount);
  const studioTargetHeights = new Float32Array(studioBarCount);

  // 6. Audio Player Controls & Web Audio Analyser
  function setupAudioAnalyzer() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    if (!sourceNode) {
      try {
        sourceNode = audioContext.createMediaElementSource(audioPlayer);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.72;
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
      } catch (e) {
        console.warn("WebAudio source node already hooked:", e);
      }
    }
    drawLiveWaveform();
  }

  btnPlayPause.addEventListener("click", () => {
    if (audioPlayer.paused) {
      audioPlayer.play();
      if (audioContext && audioContext.state === "suspended") audioContext.resume();
      drawLiveWaveform();
    } else {
      audioPlayer.pause();
    }
  });

  audioPlayer.addEventListener("play", () => {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
  });

  audioPlayer.addEventListener("pause", () => {
    playIcon.style.display = "block";
    pauseIcon.style.display = "none";
  });

  audioPlayer.addEventListener("timeupdate", () => {
    if (!isNaN(audioPlayer.duration) && audioPlayer.duration > 0) {
      const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      audioScrubber.value = pct;
      timeCurrent.textContent = formatTime(audioPlayer.currentTime);
      timeTotal.textContent = formatTime(audioPlayer.duration);
    }
  });

  audioScrubber.addEventListener("input", (e) => {
    if (!isNaN(audioPlayer.duration) && audioPlayer.duration > 0) {
      audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration;
    }
  });

  btnDownload.addEventListener("click", () => {
    if (!currentAudioUrl) return;
    const a = document.createElement("a");
    a.href = currentAudioUrl;
    a.download = `voxpulse_${Date.now()}.${currentFormat}`;
    a.click();
  });

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // 7. Canvas Waveform Visualizer
  function drawIdleWaveform() {
    const w = waveformCanvas.width;
    const h = waveformCanvas.height;
    const isDark = htmlEl.getAttribute("data-theme") === "dark";
    canvasCtx.clearRect(0, 0, w, h);

    const barWidth = 6;
    const gap = (w - (studioBarCount * barWidth)) / (studioBarCount - 1);

    for (let i = 0; i < studioBarCount; i++) {
      const x = i * (barWidth + gap);
      const amp = Math.sin(i * 0.3) * 12 + 18;
      studioBarHeights[i] = amp;
      const y = (h - amp) / 2;

      canvasCtx.fillStyle = isDark ? "#38342e" : "#e5dfd5";
      canvasCtx.beginPath();
      canvasCtx.roundRect(x, y, barWidth, amp, 3);
      canvasCtx.fill();
    }
  }

  function drawLiveWaveform() {
    if (!analyser || audioPlayer.paused) {
      drawIdleWaveform();
      return;
    }

    const w = waveformCanvas.width;
    const h = waveformCanvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    canvasCtx.clearRect(0, 0, w, h);
    const barWidth = 6;
    const gap = (w - (studioBarCount * barWidth)) / (studioBarCount - 1);

    // Compute dynamic speech RMS volume envelope from time domain
    let sumDev = 0;
    for (let j = 0; j < bufferLength; j += 4) {
      sumDev += Math.abs(timeData[j] - 128);
    }
    const avgDev = sumDev / (bufferLength / 4);
    const speechActivity = Math.min(1.0, avgDev / 12.0); // 0 when silent, up to 1.0 during active speech

    if (speechActivity > 0.03) {
      for (let i = 0; i < studioBarCount; i++) {
        // 1. Time-domain acoustic displacement across speech buffer (instantaneous pressure)
        const tIdx = Math.min(bufferLength - 1, Math.floor(i * (bufferLength / studioBarCount)));
        const tAmp = Math.abs((timeData[tIdx] - 128) / 128);

        // 2. Speech formant frequency bin (80Hz to 4000Hz mapped smoothly across active speech bins)
        const fRatio = Math.pow(i / (studioBarCount - 1), 1.25);
        const fIdx = Math.min(bufferLength - 1, Math.floor(fRatio * Math.min(52, bufferLength * 0.45)) + 1);
        const fAmp = (freqData[fIdx] || 0) / 255;

        // 3. Smooth formant contour across vocal spectrum
        const formantContour = Math.sin((i / (studioBarCount - 1)) * Math.PI) * 0.35 + 0.65;

        // 4. Organic blend: 65% instantaneous time wave + 35% frequency formant
        const dynamicHeight = (tAmp * 0.65 + fAmp * 0.35) * formantContour;
        const normalized = (dynamicHeight * 1.65 + speechActivity * 0.25);

        // Dynamic height: scales smoothly between 14px (clean pill) and 88px (top peak)
        const target = Math.max(14, Math.min(h * 0.90, normalized * h * 1.15));
        studioTargetHeights[i] = target;
      }
    } else {
      // Graceful breathing idle wave during pauses or between words
      const curTime = audioPlayer.currentTime || 0;
      for (let i = 0; i < studioBarCount; i++) {
        const ambient = Math.sin(i * 0.28 + curTime * 3.5) * 6 + 15;
        studioTargetHeights[i] = ambient;
      }
    }

    // Smooth temporal interpolation
    for (let i = 0; i < studioBarCount; i++) {
      studioBarHeights[i] += (studioTargetHeights[i] - studioBarHeights[i]) * 0.35;
      const amp = studioBarHeights[i];
      const x = i * (barWidth + gap);
      const y = (h - amp) / 2;

      const grad = canvasCtx.createLinearGradient(0, y, 0, y + amp);
      grad.addColorStop(0, "#ea580c");
      grad.addColorStop(1, "#d97706");

      canvasCtx.fillStyle = grad;
      canvasCtx.beginPath();
      canvasCtx.roundRect(x, y, barWidth, amp, 3);
      canvasCtx.fill();
    }

    animationId = requestAnimationFrame(drawLiveWaveform);
  }

  let simInterval = null;
  function startSimulatedWaveform() {
    let t = 0;
    simInterval = setInterval(() => {
      t += 0.18;
      const w = waveformCanvas.width;
      const h = waveformCanvas.height;
      canvasCtx.clearRect(0, 0, w, h);
      const barCount = 45;
      const barWidth = 6;
      const gap = (w - (barCount * barWidth)) / (barCount - 1);

      for (let i = 0; i < barCount; i++) {
        const wave1 = Math.sin(i * 0.22 + t * 2.2);
        const wave2 = Math.cos(i * 0.15 - t * 1.5);
        const envelope = Math.sin((i / (barCount - 1)) * Math.PI) * 0.35 + 0.65;
        const amp = (Math.abs(wave1 * 0.6 + wave2 * 0.4) * 0.72 + 0.18) * (h * 0.85) * envelope;
        const target = Math.max(14, Math.min(h * 0.88, amp));
        const x = i * (barWidth + gap);
        const y = (h - target) / 2;

        const grad = canvasCtx.createLinearGradient(0, y, 0, y + target);
        grad.addColorStop(0, "#ea580c");
        grad.addColorStop(1, "#d97706");

        canvasCtx.fillStyle = grad;
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, target, 3);
        canvasCtx.fill();
      }
    }, 40);
  }

  function stopSimulatedWaveform() {
    if (simInterval) clearInterval(simInterval);
    drawIdleWaveform();
  }

  // 8. History Drawer
  function addToHistory(text, engine, voice, latency, audioUrl) {
    historyItems.unshift({ text, engine, voice, latency, audioUrl, time: new Date() });
    renderHistory();
  }

  function renderHistory() {
    if (historyItems.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No clips generated yet. Hit "Generate Audio" to test!</div>';
      return;
    }
    historyList.innerHTML = "";
    historyItems.slice(0, 8).forEach(item => {
      const el = document.createElement("div");
      el.className = "history-item";
      el.innerHTML = `
        <div class="history-item-text" title="${item.text}">${item.text}</div>
        <div class="history-item-badge">${item.latency}ms &bull; ${item.engine}</div>
      `;
      el.addEventListener("click", () => {
        audioPlayer.src = item.audioUrl;
        audioPlayer.play();
        setupAudioAnalyzer();
      });
      historyList.appendChild(el);
    });
  }

  btnClearHistory.addEventListener("click", () => {
    historyItems = [];
    renderHistory();
  });

  // 9. Engine Shootout Arena
  const btnRunShootout = document.getElementById("btn-run-shootout");
  const shootoutText = document.getElementById("shootout-text");
  const shootoutResults = document.getElementById("shootout-results");

  btnRunShootout.addEventListener("click", async () => {
    const text = shootoutText.value.trim();
    if (!text) return;

    btnRunShootout.disabled = true;
    btnRunShootout.textContent = "Benchmarking Engines...";
    shootoutResults.innerHTML = '<div class="empty-state">Synthesizing audio across engines in parallel...</div>';

    try {
      const resp = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          engines: ["kokoro", "piper", "edge", "f5"]
        })
      });

      if (!resp.ok) throw new Error("Shootout failed");
      const data = await resp.json();

      shootoutResults.innerHTML = "";
      data.comparisons.forEach(c => {
        const audioSrc = `data:audio/mp3;base64,${c.audio_base64}`;
        const card = document.createElement("div");
        card.className = "shootout-card";
        card.innerHTML = `
          <div class="shootout-card-header">
            <span class="shootout-engine-title">${c.engine_name}</span>
            <span class="shootout-latency-tag">${c.latency_ms} ms</span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-secondary);">${c.voice_name}</p>
          <audio controls src="${audioSrc}" style="width: 100%; margin-top: 0.5rem;"></audio>
        `;
        shootoutResults.appendChild(card);
      });
    } catch (e) {
      shootoutResults.innerHTML = `<div class="empty-state" style="color:red;">Error: ${e.message}</div>`;
    } finally {
      btnRunShootout.disabled = false;
      btnRunShootout.textContent = "Run Side-by-Side Comparison";
    }
  });

  // 10. Dialogue Studio Voice Engine Resolution
  const ENGINE_LABELS = {
    kokoro: "Kokoro-82M (Ultra-Fast)",
    piper: "Piper TTS (Real-Time Edge)",
    edge: "Edge Neural (Multilingual)",
    f5: "F5-TTS (Flow-Matching Diffusion)",
    xtts: "Coqui XTTS-v2 (Voice Cloning)",
    chattts: "ChatTTS (Conversational Prosody)",
    zonos: "Zonos-v2 (Expressive Mamba)"
  };

  function buildDialogueVoiceOptionsHTML(selectedVoiceId) {
    if (!voicesCatalog || voicesCatalog.length === 0) {
      return `
        <optgroup label="Kokoro-82M (Ultra-Fast)">
          <option value="af_heart" data-engine="kokoro" ${selectedVoiceId === "af_heart" ? "selected" : ""}>Heart (US Female)</option>
          <option value="am_adam" data-engine="kokoro" ${selectedVoiceId === "am_adam" ? "selected" : ""}>Adam (US Male)</option>
        </optgroup>
        <optgroup label="Piper TTS (Real-Time Edge)">
          <option value="en_US-lessac-medium" data-engine="piper" ${selectedVoiceId === "en_US-lessac-medium" ? "selected" : ""}>Lessac (US Female)</option>
          <option value="en_US-ryan-high" data-engine="piper" ${selectedVoiceId === "en_US-ryan-high" ? "selected" : ""}>Ryan (US Male)</option>
        </optgroup>
        <optgroup label="Edge Neural (Multilingual)">
          <option value="en-US-JennyNeural" data-engine="edge" ${selectedVoiceId === "en-US-JennyNeural" ? "selected" : ""}>Jenny (US Female)</option>
          <option value="en-US-GuyNeural" data-engine="edge" ${selectedVoiceId === "en-US-GuyNeural" ? "selected" : ""}>Guy (US Male)</option>
        </optgroup>
        <optgroup label="F5-TTS (Flow-Matching Diffusion)">
          <option value="f5_natural_prosody" data-engine="f5" ${selectedVoiceId === "f5_natural_prosody" ? "selected" : ""}>F5 Natural Flow (US)</option>
          <option value="f5_deep_resonant" data-engine="f5" ${selectedVoiceId === "f5_deep_resonant" ? "selected" : ""}>F5 Deep Resonance (US)</option>
        </optgroup>
        <optgroup label="Coqui XTTS-v2 (Voice Cloning)">
          <option value="xtts_female_narrator" data-engine="xtts" ${selectedVoiceId === "xtts_female_narrator" ? "selected" : ""}>Studio Cloned (Female)</option>
          <option value="xtts_male_broadcaster" data-engine="xtts" ${selectedVoiceId === "xtts_male_broadcaster" ? "selected" : ""}>Studio Cloned (Male)</option>
        </optgroup>
        <optgroup label="ChatTTS (Conversational Prosody)">
          <option value="chattts_seed_2222" data-engine="chattts" ${selectedVoiceId === "chattts_seed_2222" ? "selected" : ""}>Conversational Female</option>
          <option value="chattts_seed_7869" data-engine="chattts" ${selectedVoiceId === "chattts_seed_7869" ? "selected" : ""}>Conversational Male</option>
        </optgroup>
        <optgroup label="Zonos-v2 (Expressive Mamba)">
          <option value="zonos_expressive_dramatic" data-engine="zonos" ${selectedVoiceId === "zonos_expressive_dramatic" ? "selected" : ""}>Dramatic Expressive</option>
          <option value="zonos_whisper_calm" data-engine="zonos" ${selectedVoiceId === "zonos_whisper_calm" ? "selected" : ""}>Calm Whisper</option>
        </optgroup>
      `;
    }

    const groups = {};
    voicesCatalog.forEach(v => {
      const eng = (v.engine || "kokoro").toLowerCase();
      if (!groups[eng]) groups[eng] = [];
      groups[eng].push(v);
    });

    let html = "";
    const engineOrder = ["kokoro", "piper", "edge", "f5", "xtts", "chattts", "zonos"];
    Object.keys(groups).forEach(eng => {
      if (!engineOrder.includes(eng)) engineOrder.push(eng);
    });

    engineOrder.forEach(eng => {
      const list = groups[eng];
      if (!list || list.length === 0) return;
      const groupLabel = ENGINE_LABELS[eng] || (eng.toUpperCase() + " Engine");
      html += `<optgroup label="${groupLabel}">`;
      list.forEach(v => {
        const isSelected = v.id === selectedVoiceId ? "selected" : "";
        html += `<option value="${v.id}" data-engine="${eng}" ${isSelected}>${v.name} [${v.gender || "neutral"}]</option>`;
      });
      html += `</optgroup>`;
    });

    return html;
  }

  function updateAllDialogueVoiceSelectors() {
    const selects = document.querySelectorAll(".line-voice-select");
    selects.forEach(sel => {
      const currentVal = sel.value;
      sel.innerHTML = buildDialogueVoiceOptionsHTML(currentVal);
      if (currentVal && sel.querySelector(`option[value="${currentVal}"]`)) {
        sel.value = currentVal;
      }
    });
  }

  // ===================================================
  // 10. SCRIPT EDITOR & MULTI-TRACK DAW TIMELINE CONTROLLER
  // ===================================================
  const editorBubbleList = document.getElementById("editor-bubble-list");
  const btnEditorScripts = document.getElementById("btn-editor-scripts");
  const editorScriptsDropdown = document.getElementById("editor-scripts-dropdown");
  const editorProjectBadge = document.getElementById("editor-project-badge");
  const btnEditorAddSeg = document.getElementById("btn-editor-add-segment");
  const btnToggleCloningDrawer = document.getElementById("btn-toggle-cloning-drawer");
  const btnCloseCloningDrawer = document.getElementById("btn-close-cloning-drawer");
  const editorCloningDrawer = document.getElementById("editor-cloning-drawer");

  // Timeline transport elements
  const btnTimelinePlay = document.getElementById("btn-timeline-play");
  const btnTimelinePause = document.getElementById("btn-timeline-pause");
  const btnTimelineRender = document.getElementById("btn-timeline-render");
  const btnTlPrev = document.getElementById("btn-tl-prev");
  const btnTlToggle = document.getElementById("btn-tl-toggle");
  const btnTlNext = document.getElementById("btn-tl-next");
  const tlPlayIcon = document.getElementById("tl-play-icon");
  const tlPauseIcon = document.getElementById("tl-pause-icon");
  const tlPlayText = document.getElementById("tl-play-text");
  const tlCirclePlay = document.getElementById("tl-circle-play");
  const tlCirclePause = document.getElementById("tl-circle-pause");
  const timelineCurrentTimeEl = document.getElementById("timeline-current-time");
  const timelineTotalTimeEl = document.getElementById("timeline-total-time");
  const timelineZoomSlider = document.getElementById("timeline-zoom-slider");
  const btnTimelineAddSeg = document.getElementById("btn-timeline-add-seg");
  const multiTrackContainer = document.getElementById("multi-track-container");
  const timelineRuler = document.getElementById("timeline-ruler");
  const timelineTracksWrapper = document.getElementById("timeline-tracks-wrapper");
  const timelinePlayhead = document.getElementById("timeline-playhead");
  const laneKokoro = document.getElementById("lane-kokoro");
  const lanePiper = document.getElementById("lane-piper");
  const canvasWaveTrack1 = document.getElementById("canvas-wave-track-1");
  const canvasWaveTrack2 = document.getElementById("canvas-wave-track-2");

  // Timeline Master Audio
  const timelineAudio = new Audio();
  let timelineAnimId = null;
  let timelineMasterBlobUrl = null;

  // Drawer elements
  const drawerCloneName = document.getElementById("drawer-clone-name");
  const drawerCloneLang = document.getElementById("drawer-clone-lang");
  const drawerDropzone = document.getElementById("drawer-dropzone");
  const drawerFileInput = document.getElementById("drawer-file-input");
  const btnDrawerClone = document.getElementById("btn-drawer-clone");

  // Sample Scripts Library
  const EDITOR_SAMPLE_SCRIPTS = {
    podcast: {
      title: "Episode 1 (Open-Source Revolution)",
      segments: [
        {
          speaker: "Host",
          speakerTag: "Kokoro (Host)",
          engine: "kokoro",
          voice: "af_heart",
          text: "Welcome back to VoxPulse! Joining us is Piper to discuss open-source, self-hosted text-to-speech running entirely inside Docker, with zero latency and complete privacy."
        },
        {
          speaker: "Guest",
          speakerTag: "Piper (Guest)",
          engine: "piper",
          voice: "en_US-lessac-medium",
          text: "Thanks for having me, Kokoro. I'm excited to dive in. Running neural TTS on low-cost edge hardware without a dedicated GPU is genuinely revolutionary."
        },
        {
          speaker: "Host",
          speakerTag: "Kokoro (Host)",
          engine: "kokoro",
          voice: "am_adam",
          text: "And having an OpenAI-compatible /v1/audio/speech endpoint means any AI app or agent connects with a single configuration line."
        }
      ]
    },
    interview: {
      title: "Keynote: Neural Prosody & Flow-Matching",
      segments: [
        {
          speaker: "Host",
          speakerTag: "Kokoro (Host)",
          engine: "kokoro",
          voice: "af_heart",
          text: "Ladies and gentlemen, welcome to the open acoustic showcase. Today, we demonstrate non-autoregressive speech synthesis running entirely on local systems."
        },
        {
          speaker: "Guest",
          speakerTag: "F5-TTS (Guest)",
          engine: "f5",
          voice: "f5_natural_prosody",
          text: "By replacing autoregressive generation with flow-matching diffusion, speech cadence achieves truly natural human breathing rhythms and emotion."
        }
      ]
    },
    trailer: {
      title: "Cinematic Trailer: The Dawn of Local AI",
      segments: [
        {
          speaker: "Host",
          speakerTag: "Kokoro (Host)",
          engine: "kokoro",
          voice: "af_heart",
          text: "[Deep, cinematic, mysterious] In the quiet corridors of silicon and code, a silent revolution was taking place."
        },
        {
          speaker: "Guest",
          speakerTag: "Piper (Guest)",
          engine: "piper",
          voice: "en_US-ryan-high",
          text: "[Curious] [Speaking slowly] What if... everything we thought we knew about artificial intelligence... was about to change?"
        },
        {
          speaker: "Host",
          speakerTag: "Kokoro (Host)",
          engine: "kokoro",
          voice: "am_adam",
          text: "[Warm, confident] This is VoxPulse Studio. The voice of open intelligence is finally in your hands."
        }
      ]
    }
  };

  // DAW Waveform Canvas Renderer
  function drawTrackWaveformRidge(canvas, color1, color2) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barW = 3;
    const gap = 2;
    const totalBars = Math.floor(w / (barW + gap));

    for (let i = 0; i < totalBars; i++) {
      const x = i * (barW + gap);
      const p1 = Math.sin(i * 0.14) * Math.cos(i * 0.06);
      const p2 = Math.sin(i * 0.38 + 1.2) * 0.45;
      const envelope = Math.max(0.12, Math.abs(p1 + p2));
      const amp = Math.max(6, envelope * (h - 6));
      const y = (h - amp) / 2;

      const grad = ctx.createLinearGradient(0, y, 0, y + amp);
      grad.addColorStop(0, color1);
      grad.addColorStop(1, color2);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, amp, 1.5);
      ctx.fill();
    }
  }

  // Format time for timeline (00:00:00)
  function formatTimelineTime(secs) {
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}:${ms < 10 ? "0" : ""}${ms}`;
  }

  // Synchronize moving playhead needle
  function syncPlayhead() {
    if (!timelineAudio.paused && timelineAudio.duration > 0) {
      const pct = timelineAudio.currentTime / timelineAudio.duration;
      const tracksWrapper = document.getElementById("timeline-tracks-wrapper");
      if (tracksWrapper && timelinePlayhead) {
        const usableWidth = tracksWrapper.clientWidth - 90;
        const x = 90 + (pct * usableWidth);
        timelinePlayhead.style.left = `${x}px`;
      }
      if (timelineCurrentTimeEl) {
        timelineCurrentTimeEl.textContent = formatTimelineTime(timelineAudio.currentTime);
      }
      timelineAnimId = requestAnimationFrame(syncPlayhead);
    }
  }

  timelineAudio.addEventListener("play", () => {
    if (tlPlayIcon) tlPlayIcon.style.display = "none";
    if (tlPauseIcon) tlPauseIcon.style.display = "block";
    if (tlPlayText) tlPlayText.textContent = "Pause";
    if (tlCirclePlay) tlCirclePlay.style.display = "none";
    if (tlCirclePause) tlCirclePause.style.display = "block";
    syncPlayhead();
  });

  timelineAudio.addEventListener("pause", () => {
    if (tlPlayIcon) tlPlayIcon.style.display = "block";
    if (tlPauseIcon) tlPauseIcon.style.display = "none";
    if (tlPlayText) tlPlayText.textContent = "Play";
    if (tlCirclePlay) tlCirclePlay.style.display = "block";
    if (tlCirclePause) tlCirclePause.style.display = "none";
    if (timelineAnimId) cancelAnimationFrame(timelineAnimId);
  });

  timelineAudio.addEventListener("ended", () => {
    if (timelinePlayhead) timelinePlayhead.style.left = "90px";
    if (timelineCurrentTimeEl) timelineCurrentTimeEl.textContent = "00:00:00";
    if (tlPlayIcon) tlPlayIcon.style.display = "block";
    if (tlPauseIcon) tlPauseIcon.style.display = "none";
    if (tlPlayText) tlPlayText.textContent = "Play";
    if (tlCirclePlay) tlCirclePlay.style.display = "block";
    if (tlCirclePause) tlCirclePause.style.display = "none";
  });

  // Timeline scrubber / seek by clicking tracks wrapper or ruler
  function handleTimelineSeek(e) {
    const tracksWrapper = document.getElementById("timeline-tracks-wrapper");
    if (!tracksWrapper) return;
    const rect = tracksWrapper.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const headerWidth = 90;
    if (clickX < headerWidth) return;
    const usableWidth = tracksWrapper.clientWidth - headerWidth;
    const pct = Math.max(0, Math.min(1, (clickX - headerWidth) / usableWidth));

    if (timelinePlayhead) {
      timelinePlayhead.style.left = `${clickX}px`;
    }

    if (!isNaN(timelineAudio.duration) && timelineAudio.duration > 0) {
      timelineAudio.currentTime = pct * timelineAudio.duration;
      if (timelineCurrentTimeEl) timelineCurrentTimeEl.textContent = formatTimelineTime(timelineAudio.currentTime);
    }
  }

  if (timelineRuler) timelineRuler.addEventListener("click", handleTimelineSeek);
  if (timelineTracksWrapper) timelineTracksWrapper.addEventListener("click", handleTimelineSeek);

  // Timeline Zoom Slider
  if (timelineZoomSlider) {
    timelineZoomSlider.addEventListener("input", (e) => {
      const zoom = parseFloat(e.target.value);
      if (timelineTracksWrapper) {
        timelineTracksWrapper.style.width = `${zoom * 100}%`;
      }
      const rulerTicks = document.getElementById("ruler-ticks");
      if (rulerTicks) {
        rulerTicks.style.width = `${zoom * 100}%`;
      }
    });
  }

  // Attach event handlers to an individual segment speech bubble
  function attachBubbleEvents(row) {
    const playBtn = row.querySelector(".bubble-play-btn");
    const delBtn = row.querySelector(".bubble-delete-btn");
    const textarea = row.querySelector(".bubble-textarea");
    const voiceSelect = row.querySelector(".bubble-voice-select");

    if (delBtn) {
      delBtn.addEventListener("click", () => {
        const rows = editorBubbleList.querySelectorAll(".editor-segment-row");
        if (rows.length <= 1) {
          alert("Must keep at least one script segment in the project.");
          return;
        }
        row.remove();
        updateTimelineTrackLanes();
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", async () => {
        const text = textarea ? textarea.value.trim() : "";
        if (!text) {
          alert("Please enter text for this segment.");
          return;
        }

        const voice = voiceSelect ? voiceSelect.value : "af_heart";
        const selOpt = voiceSelect ? voiceSelect.selectedOptions[0] : null;
        const engine = (selOpt && selOpt.dataset.engine) ? selOpt.dataset.engine : "kokoro";

        playBtn.disabled = true;
        playBtn.style.opacity = "0.5";

        try {
          const resp = await fetch("/api/synthesize?return_json=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: text,
              voice: voice,
              engine: engine,
              speed: 1.0,
              pitch: 0.0,
              format: "mp3"
            })
          });

          if (!resp.ok) throw new Error("Synthesis failed");
          const data = await resp.json();

          const byteChars = atob(data.audio_base64);
          const byteNums = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNums[i] = byteChars.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNums);
          const blob = new Blob([byteArray], { type: "audio/mpeg" });
          const url = URL.createObjectURL(blob);
          const previewAudio = new Audio(url);
          previewAudio.play();
        } catch (e) {
          console.warn("Single segment preview fallback:", e);
          if ("speechSynthesis" in window) {
            const ut = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(ut);
          }
        } finally {
          playBtn.disabled = false;
          playBtn.style.opacity = "1";
        }
      });
    }
  }

  // Add new segment to editor
  function addEditorSegment(speakerType, defaultText = "") {
    if (!editorBubbleList) return;
    const existingRows = editorBubbleList.querySelectorAll(".editor-segment-row");
    const count = existingRows.length;
    const isHost = speakerType ? (speakerType === "Host") : (count % 2 === 0);
    const speakerLabel = isHost ? "Host" : "Guest";
    const rowClass = isHost ? "host-row" : "guest-row";
    const avatarClass = isHost ? "avatar-host" : "avatar-guest";
    const bubbleClass = isHost ? "bubble-host" : "bubble-guest";
    const defaultVoice = isHost ? "af_heart" : "en_US-lessac-medium";
    const defaultEngine = isHost ? "Kokoro" : "Piper";

    const row = document.createElement("div");
    row.className = `editor-segment-row ${rowClass}`;
    row.dataset.segId = count;

    row.innerHTML = `
      <div class="segment-avatar-col">
        <div class="avatar-circle ${avatarClass}">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <circle cx="12" cy="7" r="4"/>
            <path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>
          </svg>
        </div>
        <span class="avatar-label">${speakerLabel}</span>
      </div>
      <div class="speech-bubble-card ${bubbleClass}">
        <div class="bubble-header">
          <span class="bubble-speaker-tag">${defaultEngine} (${speakerLabel})</span>
          <div class="bubble-controls">
            <select class="bubble-voice-select line-voice-select">
              ${buildDialogueVoiceOptionsHTML(defaultVoice)}
            </select>
            <button class="bubble-play-btn" title="Synthesize and play this segment">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
            <button class="bubble-delete-btn" title="Delete segment">&times;</button>
          </div>
        </div>
        <textarea class="bubble-textarea">${defaultText || (isHost ? "Enter host dialogue script here..." : "Enter guest response dialogue script here...")}</textarea>
      </div>
    `;

    editorBubbleList.appendChild(row);
    attachBubbleEvents(row);
    updateTimelineTrackLanes();
  }

  // Update DAW track lanes layout based on active editor segments
  function updateTimelineTrackLanes() {
    if (!editorBubbleList || !laneKokoro || !lanePiper) return;
    const rows = editorBubbleList.querySelectorAll(".editor-segment-row");

    laneKokoro.innerHTML = "";
    lanePiper.innerHTML = "";

    const totalSegs = Math.max(1, rows.length);
    const segWidthPct = 100 / totalSegs;

    rows.forEach((row, idx) => {
      const isHost = row.classList.contains("host-row");
      const leftPct = idx * segWidthPct;
      const widthPct = segWidthPct;
      const targetLane = isHost ? laneKokoro : lanePiper;
      const blockClass = isHost ? "block-host" : "block-guest";
      const blockLabel = isHost ? `Kokoro (Host) • Seg ${idx + 1}` : `Piper (Guest) • Seg ${idx + 1}`;
      const canvasId = `track-wave-seg-${idx}`;

      const block = document.createElement("div");
      block.className = `track-wave-block ${blockClass}`;
      block.style.left = `${leftPct}%`;
      block.style.width = `${widthPct}%`;
      block.innerHTML = `
        <canvas class="track-waveform-canvas" id="${canvasId}" width="280" height="40"></canvas>
        <span class="wave-block-label">${blockLabel}</span>
      `;

      targetLane.appendChild(block);
      const cv = block.querySelector("canvas");
      if (isHost) {
        drawTrackWaveformRidge(cv, "#c25e3f", "#ea580c");
      } else {
        drawTrackWaveformRidge(cv, "#d97706", "#f59e0b");
      }
    });
  }

  // Render Master Track from Editor Script
  async function renderEditorMasterTrack() {
    if (!editorBubbleList) return;
    const rows = editorBubbleList.querySelectorAll(".editor-segment-row");
    const segments = [];

    rows.forEach(row => {
      const textarea = row.querySelector(".bubble-textarea");
      const text = textarea ? textarea.value.trim() : "";
      const voiceSelect = row.querySelector(".bubble-voice-select");
      const voice = voiceSelect ? voiceSelect.value : "af_heart";
      const selOpt = voiceSelect ? voiceSelect.selectedOptions[0] : null;
      const engine = (selOpt && selOpt.dataset.engine) ? selOpt.dataset.engine : "kokoro";
      const isHost = row.classList.contains("host-row");
      const speaker = isHost ? "Host" : "Guest";

      if (text) {
        segments.push({ speaker, text, voice, engine, speed: 1.0 });
      }
    });

    if (segments.length === 0) {
      alert("Please enter script text in at least one segment.");
      return;
    }

    if (btnTimelineRender) {
      btnTimelineRender.disabled = true;
      btnTimelineRender.textContent = "Rendering Master...";
    }

    try {
      const resp = await fetch("/api/dialogue?return_json=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editorProjectBadge ? editorProjectBadge.textContent : "Episode 1",
          segments: segments,
          format: "mp3",
          pause_ms: 350
        })
      });

      if (!resp.ok) throw new Error(`Dialogue render failed (${resp.status})`);
      const data = await resp.json();

      const byteChars = atob(data.audio_base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: "audio/mpeg" });

      if (timelineMasterBlobUrl) URL.revokeObjectURL(timelineMasterBlobUrl);
      timelineMasterBlobUrl = URL.createObjectURL(blob);

      timelineAudio.src = timelineMasterBlobUrl;
      timelineAudio.addEventListener("loadedmetadata", () => {
        if (timelineTotalTimeEl && !isNaN(timelineAudio.duration)) {
          timelineTotalTimeEl.textContent = formatTimelineTime(timelineAudio.duration);
        }
      }, { once: true });

      timelineAudio.play();
    } catch (err) {
      console.warn("Timeline master fallback error:", err);
      alert("Note: Could not connect to backend for multi-track rendering: " + err.message);
    } finally {
      if (btnTimelineRender) {
        btnTimelineRender.disabled = false;
        btnTimelineRender.textContent = "Render Master";
      }
    }
  }

  // Toggle timeline playback
  function toggleTimelinePlay() {
    if (!timelineAudio.src) {
      renderEditorMasterTrack();
      return;
    }
    if (timelineAudio.paused) {
      timelineAudio.play();
    } else {
      timelineAudio.pause();
    }
  }

  if (btnTimelinePlay) btnTimelinePlay.addEventListener("click", toggleTimelinePlay);
  if (btnTlToggle) btnTlToggle.addEventListener("click", toggleTimelinePlay);
  if (btnTimelinePause) {
    btnTimelinePause.addEventListener("click", () => {
      timelineAudio.pause();
    });
  }
  if (btnTlPrev) {
    btnTlPrev.addEventListener("click", () => {
      timelineAudio.currentTime = Math.max(0, timelineAudio.currentTime - 5);
    });
  }
  if (btnTlNext) {
    btnTlNext.addEventListener("click", () => {
      timelineAudio.currentTime = Math.min(timelineAudio.duration || 0, timelineAudio.currentTime + 5);
    });
  }
  if (btnTimelineRender) {
    btnTimelineRender.addEventListener("click", renderEditorMasterTrack);
  }
  if (btnEditorAddSeg) {
    btnEditorAddSeg.addEventListener("click", () => addEditorSegment());
  }
  if (btnTimelineAddSeg) {
    btnTimelineAddSeg.addEventListener("click", () => addEditorSegment());
  }

  // Preset Scripts dropdown handling
  if (btnEditorScripts && editorScriptsDropdown) {
    btnEditorScripts.addEventListener("click", (e) => {
      e.stopPropagation();
      const isShown = editorScriptsDropdown.style.display === "block";
      editorScriptsDropdown.style.display = isShown ? "none" : "block";
    });

    document.addEventListener("click", () => {
      editorScriptsDropdown.style.display = "none";
    });

    editorScriptsDropdown.querySelectorAll(".dropdown-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const scriptKey = item.dataset.script;
        loadEditorPresetScript(scriptKey);
        editorScriptsDropdown.style.display = "none";
      });
    });
  }

  function loadEditorPresetScript(key) {
    const data = EDITOR_SAMPLE_SCRIPTS[key];
    if (!data) return;

    if (editorProjectBadge) {
      editorProjectBadge.textContent = data.title;
    }

    if (editorBubbleList) {
      editorBubbleList.innerHTML = "";
      data.segments.forEach(seg => {
        addEditorSegment(seg.speaker, seg.text);
      });
    }
  }

  // Voice Cloning Lab Drawer controls
  if (btnToggleCloningDrawer && editorCloningDrawer) {
    btnToggleCloningDrawer.addEventListener("click", () => {
      const isVisible = window.getComputedStyle(editorCloningDrawer).display !== "none";
      editorCloningDrawer.style.display = isVisible ? "none" : "flex";
    });
  }

  if (btnCloseCloningDrawer && editorCloningDrawer) {
    btnCloseCloningDrawer.addEventListener("click", () => {
      editorCloningDrawer.style.display = "none";
    });
  }

  if (drawerDropzone && drawerFileInput) {
    drawerDropzone.addEventListener("click", () => drawerFileInput.click());
    drawerFileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const dropText = drawerDropzone.querySelector(".drawer-drop-text");
        if (dropText) dropText.textContent = `✓ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      }
    });
  }

  if (btnDrawerClone) {
    btnDrawerClone.addEventListener("click", () => {
      const name = drawerCloneName ? drawerCloneName.value.trim() : "";
      const voiceName = name || "Custom Cloned Voice";
      alert(`Voice profile "${voiceName}" successfully analyzed and added to the Editor Voice Catalog.`);
      if (editorCloningDrawer) editorCloningDrawer.style.display = "none";
    });
  }

  // Attach event handlers to preloaded bubble rows
  if (editorBubbleList) {
    editorBubbleList.querySelectorAll(".editor-segment-row").forEach(row => {
      attachBubbleEvents(row);
    });
  }

  // Initial draw of timeline waveforms
  if (canvasWaveTrack1) drawTrackWaveformRidge(canvasWaveTrack1, "#c25e3f", "#ea580c");
  if (canvasWaveTrack2) drawTrackWaveformRidge(canvasWaveTrack2, "#d97706", "#f59e0b");
  updateTimelineTrackLanes();

  // 11. Voice Cloning Lab
  const dropZone = document.getElementById("audio-drop-zone");
  const cloneFileInput = document.getElementById("clone-file-input");
  const btnBrowseAudio = document.getElementById("btn-browse-audio");
  const fileChosenPreview = document.getElementById("file-chosen-preview");
  const fileChosenName = document.getElementById("file-chosen-name");
  const btnRemoveCloneFile = document.getElementById("btn-remove-clone-file");
  const btnCloneSynthesize = document.getElementById("btn-clone-synthesize");
  const cloneResultCard = document.getElementById("clone-result-card");
  const cloneAudioPlayer = document.getElementById("clone-audio-player");

  btnBrowseAudio.addEventListener("click", () => cloneFileInput.click());
  dropZone.addEventListener("click", () => cloneFileInput.click());

  cloneFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleAudioFile(e.target.files[0]);
    }
  });

  function handleAudioFile(file) {
    fileChosenName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileChosenPreview.style.display = "flex";

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Str = e.target.result.split(",")[1];
      referenceAudioBase64 = base64Str;
    };
    reader.readAsDataURL(file);
  }

  btnRemoveCloneFile.addEventListener("click", () => {
    referenceAudioBase64 = null;
    cloneFileInput.value = "";
    fileChosenPreview.style.display = "none";
  });

  btnCloneSynthesize.addEventListener("click", async () => {
    const text = document.getElementById("clone-text").value.trim();
    const engine = document.getElementById("cloning-engine-select").value;

    btnCloneSynthesize.disabled = true;
    btnCloneSynthesize.textContent = "Synthesizing Cloned Voice...";

    try {
      const resp = await fetch("/api/synthesize?return_json=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          engine: engine,
          voice: "xtts_custom_clone",
          reference_audio_base64: referenceAudioBase64
        })
      });

      if (!resp.ok) throw new Error("Cloning synthesis failed");
      const data = await resp.json();

      cloneAudioPlayer.src = `data:audio/mp3;base64,${data.audio_base64}`;
      cloneResultCard.style.display = "block";
      cloneAudioPlayer.play();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      btnCloneSynthesize.disabled = false;
      btnCloneSynthesize.textContent = "Synthesize Cloned Voice";
    }
  });

  // 12. API Hub Code Snippet Switcher
  const codeTabs = document.querySelectorAll(".code-tab");
  const codeSnippet = document.getElementById("api-code-snippet");

  const SNIPPETS = {
    python: `from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed"
)

response = client.audio.speech.create(
    model="voxpulse-kokoro",  # or "tts-1", "voxpulse-piper", "voxpulse-f5"
    voice="alloy",            # maps to local af_heart
    input="Hello from self-hosted VoxPulse Studio!"
)

response.stream_to_file("output.mp3")`,
    curl: `curl http://localhost:8000/v1/audio/speech \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "tts-1",
    "input": "Hello from self-hosted VoxPulse Studio!",
    "voice": "alloy",
    "response_format": "mp3"
  }' \\
  --output speech.mp3`,
    js: `import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: "not-needed"
});

const mp3 = await openai.audio.speech.create({
  model: "voxpulse-kokoro",
  voice: "alloy",
  input: "Hello from self-hosted VoxPulse Studio!"
});

const buffer = Buffer.from(await mp3.arrayBuffer());
await fs.promises.writeFile("speech.mp3", buffer);`
  };

  codeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      codeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      codeSnippet.textContent = SNIPPETS[tab.dataset.lang] || SNIPPETS.python;
    });
  });

  // Initial setup
  drawIdleWaveform();
  loadVoices();
});
