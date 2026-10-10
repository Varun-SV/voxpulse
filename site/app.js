/**
 * VoxPulse Studio — Marketing Landing Page Client Script
 */

document.addEventListener("DOMContentLoaded", () => {
  const htmlEl = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");
  const btnCopyDocker = document.getElementById("btn-copy-docker");
  
  // Theme Switcher
  const savedTheme = localStorage.getItem("voxpulse-theme") || "light";
  htmlEl.setAttribute("data-theme", savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = htmlEl.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      htmlEl.setAttribute("data-theme", next);
      localStorage.setItem("voxpulse-theme", next);
      drawIdleWaveform();
    });
  }

  // Copy Docker Command Pill
  if (btnCopyDocker) {
    btnCopyDocker.addEventListener("click", () => {
      const cmd = "docker compose up -d";
      navigator.clipboard.writeText(cmd).then(() => {
        const copyLabel = btnCopyDocker.querySelector(".copy-label");
        if (copyLabel) {
          copyLabel.textContent = "Copied!";
          setTimeout(() => {
            copyLabel.textContent = "Copy";
          }, 2000);
        }
      });
    });
  }

  // Audio Showcase Data & Interactive Player (Using actual neural model recordings)
  const SAMPLES = {
    kokoro: {
      engine: "Engine: Kokoro-82M",
      quote: '"Welcome to VoxPulse Studio. High-fidelity speech synthesized directly on your hardware in under 80 milliseconds."',
      latency: "Latency: 42ms (RTF: 0.11)",
      hw: "Hardware: CPU / 500MB RAM",
      audioUrl: "./assets/audio/kokoro-sample.mp3"
    },
    piper: {
      engine: "Engine: Piper TTS",
      quote: '"Fast, predictable, and remarkably lightweight. Optimized specifically for Raspberry Pi, local servers, and screen readers."',
      latency: "Latency: 28ms (RTF: 0.08)",
      hw: "Hardware: Edge CPU / 100MB RAM",
      audioUrl: "./assets/audio/piper-sample.mp3"
    },
    f5: {
      engine: "Engine: F5-TTS",
      quote: '"Non-autoregressive flow-matching brings breathtaking natural cadence, breathing pauses, and studio-grade voice cloning."',
      latency: "Latency: 280ms (RTF: 0.35)",
      hw: "Hardware: GPU Recommended (4GB VRAM)",
      audioUrl: "./assets/audio/f5-sample.mp3"
    },
    xtts: {
      engine: "Engine: Coqui XTTS-v2",
      quote: '"Cross-lingual zero-shot voice cloning. Deliver multilingual experiences across seventeen languages with just three seconds of audio."',
      latency: "Latency: 350ms (RTF: 0.42)",
      hw: "Hardware: GPU Recommended (4GB VRAM)",
      audioUrl: "./assets/audio/xtts-sample.mp3"
    }
  };

  let activeSampleKey = "kokoro";
  let isPlaying = false;
  let waveAnimId = null;
  const sampleAudio = new Audio();
  sampleAudio.crossOrigin = "anonymous";

  // Web Audio Context & Analyser
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let isAudioHooked = false;

  const barCount = 48;
  const barHeights = new Float32Array(barCount);
  const targetHeights = new Float32Array(barCount);

  const sampleTabs = document.querySelectorAll(".sample-tab");
  const sampleQuote = document.getElementById("sample-quote");
  const sampleEngineTag = document.getElementById("sample-engine-tag");
  const sampleLatencyTag = document.getElementById("sample-latency-tag");
  const sampleHwTag = document.getElementById("sample-hw-tag");
  const btnPlaySample = document.getElementById("btn-play-sample");
  const btnPlaySampleText = document.getElementById("btn-play-sample-text");
  const samplePlayIcon = document.getElementById("sample-play-icon");
  const samplePauseIcon = document.getElementById("sample-pause-icon");
  const canvas = document.getElementById("landing-waveform");
  const ctx = canvas ? canvas.getContext("2d") : null;

  function initWebAudio() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    if (audioCtx && !isAudioHooked && sampleAudio) {
      try {
        sourceNode = audioCtx.createMediaElementSource(sampleAudio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.72;
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        isAudioHooked = true;
      } catch (e) {
        console.warn("createMediaElementSource notice:", e);
      }
    }
  }

  sampleAudio.addEventListener("ended", () => {
    stopSample();
  });
  sampleAudio.addEventListener("pause", () => {
    if (isPlaying) stopSample();
  });

  // Sample tab clicks
  sampleTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      sampleTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeSampleKey = tab.dataset.sample;
      
      const data = SAMPLES[activeSampleKey];
      if (data) {
        sampleQuote.textContent = data.quote;
        sampleEngineTag.textContent = data.engine;
        sampleLatencyTag.textContent = data.latency;
        sampleHwTag.textContent = data.hw;
      }
      stopSample();
    });
  });

  // Play Sample button using Real Neural Model MP3 files
  if (btnPlaySample) {
    btnPlaySample.addEventListener("click", () => {
      if (isPlaying) {
        stopSample();
      } else {
        playSample();
      }
    });
  }

  function playSample() {
    const data = SAMPLES[activeSampleKey];
    if (!data || !data.audioUrl) return;

    initWebAudio();

    isPlaying = true;
    samplePlayIcon.style.display = "none";
    samplePauseIcon.style.display = "block";
    btnPlaySampleText.textContent = "Pause Sample";

    // Set source and play actual neural model audio
    if (!sampleAudio.src.endsWith(data.audioUrl.replace("./", ""))) {
      sampleAudio.src = data.audioUrl;
    }
    
    sampleAudio.play().then(() => {
      startVisualizer();
    }).catch(err => {
      console.warn("Audio playback error:", err);
      stopSample();
    });
  }

  function stopSample() {
    isPlaying = false;
    if (sampleAudio) {
      sampleAudio.pause();
      sampleAudio.currentTime = 0;
    }
    if (samplePlayIcon) samplePlayIcon.style.display = "block";
    if (samplePauseIcon) samplePauseIcon.style.display = "none";
    if (btnPlaySampleText) btnPlaySampleText.textContent = "Play Audio Sample";
    
    // Draw resting waveform
    drawIdleWaveform();
  }

  // Waveform Visualizer
  function drawIdleWaveform() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const isDark = htmlEl.getAttribute("data-theme") === "dark";
    ctx.clearRect(0, 0, w, h);

    const barW = 8;
    const gap = (w - (barCount * barW)) / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barW + gap);
      // Gentle resting curve
      const amp = Math.sin(i * 0.28) * 10 + 16;
      barHeights[i] = amp;
      const y = (h - amp) / 2;

      ctx.fillStyle = isDark ? "#38342e" : "#e5dfd5";
      ctx.beginPath();
      ctx.roundRect(x, y, barW, amp, 3);
      ctx.fill();
    }
  }

  function startVisualizer() {
    if (waveAnimId) cancelAnimationFrame(waveAnimId);

    function render() {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const isDark = htmlEl.getAttribute("data-theme") === "dark";
      ctx.clearRect(0, 0, w, h);

      const barW = 8;
      const gap = (w - (barCount * barW)) / (barCount - 1);

      if (isPlaying && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const freqData = new Uint8Array(bufferLength);
        const timeData = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        // 1. Dynamic speech RMS envelope & activity from time domain
        let sumDev = 0;
        for (let j = 0; j < bufferLength; j += 4) {
          sumDev += Math.abs(timeData[j] - 128);
        }
        const avgDev = sumDev / (bufferLength / 4);
        const speechActivity = Math.min(1.0, avgDev / 12.0); // 0 when silent, up to 1.0 during active speech

        if (speechActivity > 0.03) {
          for (let i = 0; i < barCount; i++) {
            // 1. Time-domain acoustic displacement across entire buffer width
            const tIdx = Math.min(bufferLength - 1, Math.floor(i * (bufferLength / barCount)));
            const tAmp = Math.abs((timeData[tIdx] - 128) / 128);

            // 2. Speech formant frequency bin (80Hz to 4000Hz mapped smoothly across speech bins)
            const fRatio = Math.pow(i / (barCount - 1), 1.25);
            const fIdx = Math.min(bufferLength - 1, Math.floor(fRatio * Math.min(52, bufferLength * 0.45)) + 1);
            const fAmp = (freqData[fIdx] || 0) / 255;

            // 3. Smooth formant contour across vocal spectrum
            const formantContour = Math.sin((i / (barCount - 1)) * Math.PI) * 0.35 + 0.65;

            // 4. Organic blend: 65% instantaneous time wave + 35% frequency formant
            const dynamicHeight = (tAmp * 0.65 + fAmp * 0.35) * formantContour;
            const normalized = (dynamicHeight * 1.65 + speechActivity * 0.25);

            // Dynamic height: scales between 14px (clean pill) and 88px (top peak)
            const target = Math.max(14, Math.min(h * 0.90, normalized * h * 1.15));
            targetHeights[i] = target;
          }
        } else {
          // Graceful breathing wave during pauses or between words
          const curTime = sampleAudio ? sampleAudio.currentTime : 0;
          for (let i = 0; i < barCount; i++) {
            const ambient = Math.sin(i * 0.28 + curTime * 3.5) * 6 + 15;
            targetHeights[i] = ambient;
          }
        }
      } else {
        // Idle target heights
        for (let i = 0; i < barCount; i++) {
          targetHeights[i] = Math.sin(i * 0.28) * 10 + 16;
        }
      }

      // Smooth temporal interpolation for 60fps organic fluidity
      for (let i = 0; i < barCount; i++) {
        barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.35;
        const amp = barHeights[i];
        const x = i * (barW + gap);
        const y = (h - amp) / 2;

        if (isPlaying) {
          const grad = ctx.createLinearGradient(0, y, 0, y + amp);
          grad.addColorStop(0, "#ea580c");
          grad.addColorStop(1, "#d97706");
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = isDark ? "#38342e" : "#e5dfd5";
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barW, amp, 3);
        ctx.fill();
      }

      if (isPlaying) {
        waveAnimId = requestAnimationFrame(render);
      }
    }
    render();
  }

  // Initial draw
  drawIdleWaveform();
});
