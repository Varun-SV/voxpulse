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
        { id: "af_heart", name: "Heart (US Female)", engine: "kokoro", gender: "female", language: "en-US", description: "Warm, natural" },
        { id: "am_adam", name: "Adam (US Male)", engine: "kokoro", gender: "male", language: "en-US", description: "Deep, resonant" },
        { id: "en_US-lessac-medium", name: "Lessac (US Female)", engine: "piper", gender: "female", language: "en-US", description: "Fast, clear" },
        { id: "en_US-ryan-high", name: "Ryan (US Male)", engine: "piper", gender: "male", language: "en-US", description: "Dynamic" },
        { id: "en-US-JennyNeural", name: "Jenny (US Female)", engine: "edge", gender: "female", language: "en-US", description: "Refined" }
      ];
      updateVoicesForEngine(engineSelect.value);
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
        analyser.fftSize = 256;
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

    const barCount = 45;
    const barWidth = 6;
    const gap = (w - (barCount * barWidth)) / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const amp = Math.sin(i * 0.3) * 15 + 20;
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
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, w, h);
    const barCount = 45;
    const barWidth = 6;
    const gap = (w - (barCount * barWidth)) / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * (bufferLength / 2));
      const val = dataArray[idx] || 0;
      const amp = Math.max(8, (val / 255) * (h * 0.85));
      const x = i * (barWidth + gap);
      const y = (h - amp) / 2;

      // Vibrant Amber Gradient
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
      t += 0.2;
      const w = waveformCanvas.width;
      const h = waveformCanvas.height;
      canvasCtx.clearRect(0, 0, w, h);
      const barCount = 45;
      const barWidth = 6;
      const gap = (w - (barCount * barWidth)) / (barCount - 1);

      for (let i = 0; i < barCount; i++) {
        const amp = Math.abs(Math.sin(i * 0.2 + t)) * 40 + 10;
        const x = i * (barWidth + gap);
        const y = (h - amp) / 2;

        canvasCtx.fillStyle = "#f97316";
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, amp, 3);
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

  // 10. Dialogue Studio
  const btnAddLine = document.getElementById("btn-add-line");
  const dialogueLines = document.getElementById("dialogue-lines");
  const btnRenderDialogue = document.getElementById("btn-render-dialogue");
  const dialogueMasterCard = document.getElementById("dialogue-master-card");
  const dialogueMasterAudio = document.getElementById("dialogue-master-audio");

  btnAddLine.addEventListener("click", () => {
    const lineCard = document.createElement("div");
    lineCard.className = "dialogue-line-card";
    lineCard.innerHTML = `
      <div class="line-meta">
        <div class="speaker-pill speaker-host">Speaker</div>
        <select class="line-voice-select">
          <option value="af_heart" selected>Kokoro: Heart (US)</option>
          <option value="am_adam">Kokoro: Adam (US)</option>
          <option value="en_US-lessac-medium">Piper: Lessac (US)</option>
          <option value="en-US-JennyNeural">Edge: Jenny (US)</option>
        </select>
      </div>
      <textarea class="line-text" placeholder="Type line script here..."></textarea>
      <button class="line-remove-btn" title="Delete Line">&times;</button>
    `;
    lineCard.querySelector(".line-remove-btn").addEventListener("click", () => lineCard.remove());
    dialogueLines.appendChild(lineCard);
  });

  document.querySelectorAll(".line-remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => e.target.closest(".dialogue-line-card").remove());
  });

  btnRenderDialogue.addEventListener("click", async () => {
    const lineCards = dialogueLines.querySelectorAll(".dialogue-line-card");
    const segments = [];

    lineCards.forEach(card => {
      const text = card.querySelector(".line-text").value.trim();
      const voice = card.querySelector(".line-voice-select").value;
      const speaker = card.querySelector(".speaker-pill").textContent;
      if (text) {
        segments.push({ speaker, text, voice, engine: "kokoro", speed: 1.0 });
      }
    });

    if (segments.length === 0) {
      alert("Please add at least one line of dialogue.");
      return;
    }

    btnRenderDialogue.disabled = true;
    btnRenderDialogue.textContent = "Assembling Podcast Track...";

    try {
      const resp = await fetch("/api/dialogue?return_json=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: document.getElementById("dialogue-title").value,
          segments: segments,
          format: "mp3",
          pause_ms: 350
        })
      });

      if (!resp.ok) throw new Error("Dialogue assembly failed");
      const data = await resp.json();

      dialogueMasterAudio.src = `data:audio/mp3;base64,${data.audio_base64}`;
      dialogueMasterCard.style.display = "block";
      dialogueMasterAudio.play();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      btnRenderDialogue.disabled = false;
      btnRenderDialogue.textContent = "Render Master Track";
    }
  });

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
