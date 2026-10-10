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

        // 1. Compute dynamic speech RMS volume envelope from time-domain
        let sumSq = 0;
        for (let j = 0; j < bufferLength; j++) {
          const norm = (timeData[j] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / bufferLength); // speech envelope: ~0.02 (silence) to 0.35 (strong vowels)
        const speechEnvelope = Math.min(1.0, rms * 4.2);

        // Check overall frequency energy
        let totalEnergy = 0;
        for (let j = 0; j < 64; j++) totalEnergy += freqData[j];

        if (totalEnergy > 10) {
          // Real-time audio frequency stream is active
          const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
          const binHz = sampleRate / analyser.fftSize;

          // Perceptual logarithmic mapping across the human speech spectrum (80 Hz to ~7,500 Hz)
          const minFreq = 85;
          const maxFreq = 7200;

          for (let i = 0; i < barCount; i++) {
            const ratio = i / (barCount - 1);
            const centerFreq = minFreq * Math.pow(maxFreq / minFreq, ratio);
            const centerBin = Math.round(centerFreq / binHz);

            // Cluster average around center bin to capture formants & consonants smoothly
            const windowSpan = Math.max(1, Math.round(centerBin * 0.12));
            let bandSum = 0;
            let bandBins = 0;
            const startBin = Math.max(0, centerBin - windowSpan);
            const endBin = Math.min(bufferLength - 1, centerBin + windowSpan);
            for (let b = startBin; b <= endBin; b++) {
              bandSum += freqData[b];
              bandBins++;
            }
            const rawMag = bandBins > 0 ? (bandSum / bandBins) / 255 : 0;

            // Formant tilt compensation: natural speech rolls off ~-6dB/octave.
            // Boost upper formants and fricatives so bars pulse across the entire width.
            const tiltBoost = 1.0 + Math.pow(ratio, 1.15) * 2.4;

            // Blend frequency magnitude with overall voice presence
            const combined = (rawMag * 0.72 + speechEnvelope * 0.28) * tiltBoost;
            const target = Math.max(8, Math.min(h * 0.88, combined * h * 0.95));
            targetHeights[i] = target;
          }
        } else {
          // Playback-synchronized procedural fallback if MediaElementAudioSource is blocked
          const curTime = sampleAudio ? sampleAudio.currentTime : 0;
          const speechPulse = Math.sin(curTime * 5.2) * 0.4 + 0.6;
          for (let i = 0; i < barCount; i++) {
            const wave1 = Math.sin(i * 0.24 + curTime * 8.0);
            const wave2 = Math.cos(i * 0.16 - curTime * 5.1);
            const target = Math.max(8, (Math.abs(wave1 * 0.6 + wave2 * 0.4) * speechPulse * 0.75 + 0.15) * h * 0.82);
            targetHeights[i] = target;
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
