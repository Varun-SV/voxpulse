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

  // Audio Showcase Data & Interactive Player
  const SAMPLES = {
    kokoro: {
      engine: "Engine: Kokoro-82M",
      quote: '"Welcome to VoxPulse Studio. High-fidelity speech synthesized directly on your hardware in under 80 milliseconds."',
      latency: "Latency: 42ms (RTF: 0.11)",
      hw: "Hardware: CPU / 500MB RAM",
      rate: 1.0,
      pitch: 1.05
    },
    piper: {
      engine: "Engine: Piper TTS",
      quote: '"Fast, predictable, and remarkably lightweight. Optimized specifically for Raspberry Pi, local servers, and screen readers."',
      latency: "Latency: 28ms (RTF: 0.08)",
      hw: "Hardware: Edge CPU / 100MB RAM",
      rate: 1.15,
      pitch: 0.95
    },
    f5: {
      engine: "Engine: F5-TTS",
      quote: '"Non-autoregressive flow-matching brings breathtaking natural cadence, breathing pauses, and studio-grade voice cloning."',
      latency: "Latency: 280ms (RTF: 0.35)",
      hw: "Hardware: GPU Recommended (4GB VRAM)",
      rate: 0.95,
      pitch: 1.0
    },
    xtts: {
      engine: "Engine: Coqui XTTS-v2",
      quote: '"Cross-lingual zero-shot voice cloning. Deliver multilingual experiences across seventeen languages with just three seconds of audio."',
      latency: "Latency: 350ms (RTF: 0.42)",
      hw: "Hardware: GPU Recommended (4GB VRAM)",
      rate: 1.0,
      pitch: 0.98
    }
  };

  let activeSampleKey = "kokoro";
  let isPlaying = false;
  let waveAnimId = null;

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

  // Play Sample button using Web Audio Synthesis & Speech
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
    isPlaying = true;
    samplePlayIcon.style.display = "none";
    samplePauseIcon.style.display = "block";
    btnPlaySampleText.textContent = "Pause Sample";

    const data = SAMPLES[activeSampleKey];
    const textToSpeak = sampleQuote.textContent.replace(/"/g, "");

    // Browser Speech Synthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = data.rate || 1.0;
      utterance.pitch = data.pitch || 1.0;

      utterance.onend = () => {
        stopSample();
      };
      utterance.onerror = () => {
        stopSample();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Automatic stop after 4s
      setTimeout(stopSample, 4000);
    }

    startActiveWaveform();
  }

  function stopSample() {
    isPlaying = false;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (samplePlayIcon) samplePlayIcon.style.display = "block";
    if (samplePauseIcon) samplePauseIcon.style.display = "none";
    if (btnPlaySampleText) btnPlaySampleText.textContent = "Play Audio Sample";
    stopActiveWaveform();
  }

  // Waveform Visualizer
  function drawIdleWaveform() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const isDark = htmlEl.getAttribute("data-theme") === "dark";
    ctx.clearRect(0, 0, w, h);

    const barCount = 48;
    const barW = 8;
    const gap = (w - (barCount * barW)) / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barW + gap);
      const amp = Math.sin(i * 0.3) * 12 + 18;
      const y = (h - amp) / 2;

      ctx.fillStyle = isDark ? "#38342e" : "#e5dfd5";
      ctx.beginPath();
      ctx.roundRect(x, y, barW, amp, 3);
      ctx.fill();
    }
  }

  let waveTick = 0;
  function startActiveWaveform() {
    if (!ctx || !canvas) return;

    function render() {
      waveTick += 0.22;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 48;
      const barW = 8;
      const gap = (w - (barCount * barW)) / (barCount - 1);

      for (let i = 0; i < barCount; i++) {
        const x = i * (barW + gap);
        const amp = Math.abs(Math.sin(i * 0.25 + waveTick)) * 48 + 12;
        const y = (h - amp) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + amp);
        grad.addColorStop(0, "#ea580c");
        grad.addColorStop(1, "#d97706");

        ctx.fillStyle = grad;
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

  function stopActiveWaveform() {
    if (waveAnimId) cancelAnimationFrame(waveAnimId);
    drawIdleWaveform();
  }

  // Initial draw
  drawIdleWaveform();
});
