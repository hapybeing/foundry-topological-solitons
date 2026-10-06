/**
 * FOUNDRY // APPLICATION CONTROLLER & REAL-TIME ORCHESTRATOR
 * Coordinates Solvers, Diagnostics, Canvas Renderers, and Web Audio Sonification.
 */

(function () {
  'use strict';

  const primaryCanvas = document.getElementById('primary-canvas');
  const primaryCtx = primaryCanvas.getContext('2d');

  const waterfallCanvas = document.getElementById('waterfall-canvas');
  const diagCanvas = document.getElementById('diag-canvas');
  const diagCtx = diagCanvas.getContext('2d');

  const activeBadge = document.getElementById('active-system-badge');
  const presetSelect = document.getElementById('preset-select');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnStep = document.getElementById('btn-step');
  const btnReset = document.getElementById('btn-reset');
  const btnAudio = document.getElementById('btn-audio');
  const btnClearWaterfall = document.getElementById('btn-clear-waterfall');
  const sliderDt = document.getElementById('slider-dt');
  const labelDt = document.getElementById('label-dt');
  const sliderSubsteps = document.getElementById('slider-substeps');
  const labelSubsteps = document.getElementById('label-substeps');
  const selectColormap = document.getElementById('select-colormap');
  const theoryContent = document.getElementById('theory-card-content');
  const diagSubLabel = document.getElementById('diag-sub-label');

  const telemTime = document.getElementById('telemetry-time');
  const telemDrift = document.getElementById('telemetry-drift');
  const telemCharge = document.getElementById('telemetry-charge');
  const telemFps = document.getElementById('telemetry-fps');

  const waterfall = new WaterfallVisualizer(waterfallCanvas, 512, 256);
  const audio = new SolitonSonifier();

  let currentSystem = 'kdv';
  let isRunning = true;
  let dt = 0.005;
  let substeps = 4;
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fps = 60.0;

  const N_GRID = 512;
  const L_BOX = 64.0;
  let kdv = new KdVSolver(N_GRID, L_BOX);
  let sg = new SineGordonSolver(N_GRID, L_BOX);
  let nlse = new NLSESolver(N_GRID, L_BOX, 1.0);
  let fput = new FPUTSolver(48, 0.25, 0.0);

  const PRESETS = {
    kdv: [
      { id: 'two-solitons', name: 'Two-Soliton Elastic Overtake' },
      { id: 'three-solitons', name: 'Three-Soliton Hierarchical Cascade' },
      { id: 'collision-chase', name: 'High-Speed Collision Chase' },
      { id: 'single-soliton', name: 'Clean Stable Single Soliton' },
      { id: 'cosine-wave', name: 'Cosine Wave Breakdown into Soliton Train' }
    ],
    'sine-gordon': [
      { id: 'kink-antikink', name: 'Relativistic Kink-Antikink Collision (v=0.45)' },
      { id: 'breather', name: 'Stationary Pulsating Breather Bound State' },
      { id: 'subcritical-resonance', name: 'Subcritical Resonance Annihilation (v=0.245)' },
      { id: 'kink-kink', name: 'Kink-Kink Repulsive Elastic Bounce' },
      { id: 'single-kink', name: 'Lorentz-Boosted Traveling Topological Kink' }
    ],
    nlse: [
      { id: 'peregrine-rogue', name: 'Peregrine Spatiotemporal Rogue Wave' },
      { id: 'akhmediev-breather', name: 'Akhmediev Modulation Breather' },
      { id: 'bright-collision', name: 'Bright Soliton Head-on Collision' },
      { id: 'dark-soliton', name: 'Dark Soliton Phase Defect (Defocusing)' },
      { id: 'modulation-instability', name: 'Benjamin-Feir Modulation Instability' }
    ],
    fput: [
      { id: 'mode-1', name: 'Normal Mode 1 Excitation & Recurrence' },
      { id: 'mode-2', name: 'Mode 2 Harmonic Coupling' },
      { id: 'two-modes', name: 'Mode 1 + Mode 3 Superposition' }
    ]
  };

  const THEORY_TEXTS = {
    kdv: `
      <strong>Korteweg-de Vries (KdV) Equation</strong>
      <div class="theory-math">u_t + 6u u_x + u_{xxx} = 0</div>
      Governs shallow water solitary waves and non-linear dispersive ion-acoustic plasma waves.
      Remarkable for possessing an infinite hierarchy of conserved integrals. Solitons emerge
      from the exact balance between non-linear steepening (6u u_x) and wave dispersion (u_{xxx}).
      When solitons collide, they pass through one another completely unaltered in amplitude and
      shape, experiencing only an asymptotic phase shift.
    `,
    'sine-gordon': `
      <strong>Sine-Gordon Relativistic Field Model</strong>
      <div class="theory-math">φ_{tt} - φ_{xx} + sin(φ) = 0</div>
      Fundamental in particle physics, dislocation dynamics, and superconducting Josephson junctions.
      Features non-trivial topological winding charge:
      <div class="theory-math">Q = [φ(+∞) - φ(-∞)] / (2π) ∈ ℤ</div>
      Kinks (Q = +1) and antikinks (Q = -1) exhibit relativistic Lorentz contraction and velocity-dependent
      resonance windows: at relativistic speeds they pass through; at subcritical speeds they annihilate into radiation.
    `,
    nlse: `
      <strong>Non-Linear Schrödinger Equation (NLSE)</strong>
      <div class="theory-math">i ψ_t + 0.5 ψ_{xx} + g |ψ|² ψ = 0</div>
      Universal envelope equation for non-linear optical fibers, Bose-Einstein condensates, and deep water rogue waves.
      In the focusing regime (g > 0), the Peregrine soliton exhibits space-time localization reaching 3× background amplitude.
      In the defocusing regime (g < 0), intensity dips propagate as topological dark solitons.
    `,
    fput: `
      <strong>Fermi-Pasta-Ulam-Tsingou (FPUT) Lattice</strong>
      <div class="theory-math">q̈ₙ = (qₙ₊₁ - 2qₙ + qₙ₋₁) + α[(qₙ₊₁-qₙ)² - (qₙ-qₙ₋₁)²]</div>
      The 1953 numerical experiment that founded modern non-linear science and computational physics.
      Expecting thermal equipartition of energy across all Fourier modes, Fermi, Pasta, Ulam, and Tsingou
      discovered near-complete energy recurrence back into the initial normal mode after a finite period.
    `
  };

  function updatePresets() {
    presetSelect.innerHTML = '';
    const list = PRESETS[currentSystem] || [];
    list.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.name;
      presetSelect.appendChild(opt);
    });
  }

  function initSystem(presetId) {
    if (currentSystem === 'kdv') {
      kdv = new KdVSolver(N_GRID, L_BOX);
      kdv.setInitialCondition(presetId || presetSelect.value);
      activeBadge.textContent = 'KdV // Korteweg-de Vries';
      diagSubLabel.textContent = 'Fourier Spectral Energy |S(k)|²';
    } else if (currentSystem === 'sine-gordon') {
      sg = new SineGordonSolver(N_GRID, L_BOX);
      sg.setInitialCondition(presetId || presetSelect.value);
      activeBadge.textContent = 'Sine-Gordon // Topological Solitons';
      diagSubLabel.textContent = 'Phase-Space Hodograph (φ, φ_t)';
    } else if (currentSystem === 'nlse') {
      nlse = new NLSESolver(N_GRID, L_BOX, 1.0);
      nlse.setInitialCondition(presetId || presetSelect.value);
      activeBadge.textContent = 'NLSE // Non-Linear Schrödinger';
      diagSubLabel.textContent = 'Wave Envelope & Phase Hodograph';
    } else if (currentSystem === 'fput') {
      fput = new FPUTSolver(48, 0.25, 0.0);
      fput.setInitialCondition(presetId || presetSelect.value);
      activeBadge.textContent = 'FPUT // Non-Linear Lattice';
      diagSubLabel.textContent = 'Normal Mode Energy Spectrum E_k';
    }

    theoryContent.innerHTML = THEORY_TEXTS[currentSystem];
    waterfall.clear();
  }

  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    [primaryCanvas, waterfallCanvas, diagCanvas].forEach(cvs => {
      const rect = cvs.parentElement.getBoundingClientRect();
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
    });
  }

  function renderPrimary() {
    const w = primaryCanvas.width;
    const h = primaryCanvas.height;
    primaryCtx.clearRect(0, 0, w, h);

    primaryCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    primaryCtx.lineWidth = 1;
    const midY = h * 0.55;

    primaryCtx.beginPath();
    primaryCtx.moveTo(0, midY);
    primaryCtx.lineTo(w, midY);
    primaryCtx.stroke();

    for (let x = 0; x < w; x += w / 8) {
      primaryCtx.beginPath();
      primaryCtx.moveTo(x, 0);
      primaryCtx.lineTo(x, h);
      primaryCtx.stroke();
    }

    if (currentSystem === 'kdv') {
      const u = kdv.u;
      const n = kdv.N;
      const scaleY = h * 0.12;

      primaryCtx.beginPath();
      primaryCtx.moveTo(0, midY - u[0] * scaleY);
      for (let i = 1; i < n; i++) {
        const cx = (i / (n - 1)) * w;
        const cy = midY - u[i] * scaleY;
        primaryCtx.lineTo(cx, cy);
      }
      primaryCtx.lineTo(w, midY);
      primaryCtx.lineTo(0, midY);
      primaryCtx.closePath();

      const grad = primaryCtx.createLinearGradient(0, midY - h * 0.4, 0, midY);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.02)');
      primaryCtx.fillStyle = grad;
      primaryCtx.fill();

      primaryCtx.beginPath();
      primaryCtx.moveTo(0, midY - u[0] * scaleY);
      for (let i = 1; i < n; i++) {
        const cx = (i / (n - 1)) * w;
        const cy = midY - u[i] * scaleY;
        primaryCtx.lineTo(cx, cy);
      }
      primaryCtx.strokeStyle = '#00f0ff';
      primaryCtx.lineWidth = 2.5;
      primaryCtx.shadowColor = '#00f0ff';
      primaryCtx.shadowBlur = 12;
      primaryCtx.stroke();
      primaryCtx.shadowBlur = 0;

    } else if (currentSystem === 'sine-gordon') {
      const phi = sg.phi;
      const p = sg.p;
      const n = sg.N;
      const scaleY = h * 0.07;

      primaryCtx.beginPath();
      primaryCtx.moveTo(0, midY - phi[0] * scaleY);
      for (let i = 1; i < n; i++) {
        const cx = (i / (n - 1)) * w;
        const cy = midY - phi[i] * scaleY;
        primaryCtx.lineTo(cx, cy);
      }
      primaryCtx.strokeStyle = '#00f0ff';
      primaryCtx.lineWidth = 2.5;
      primaryCtx.shadowColor = '#00f0ff';
      primaryCtx.shadowBlur = 10;
      primaryCtx.stroke();

      primaryCtx.beginPath();
      primaryCtx.moveTo(0, midY - p[0] * scaleY * 2.0);
      for (let i = 1; i < n; i++) {
        const cx = (i / (n - 1)) * w;
        const cy = midY - p[i] * scaleY * 2.0;
        primaryCtx.lineTo(cx, cy);
      }
      primaryCtx.strokeStyle = '#ff0055';
      primaryCtx.lineWidth = 1.8;
      primaryCtx.shadowColor = '#ff0055';
      primaryCtx.shadowBlur = 8;
      primaryCtx.stroke();
      primaryCtx.shadowBlur = 0;

    } else if (currentSystem === 'nlse') {
      const re = nlse.re;
      const im = nlse.im;
      const n = nlse.N;
      const scaleY = h * 0.14;

      primaryCtx.beginPath();
      const firstAmp = Math.sqrt(re[0] * re[0] + im[0] * im[0]);
      primaryCtx.moveTo(0, midY - firstAmp * scaleY);
      for (let i = 1; i < n; i++) {
        const amp = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        const cx = (i / (n - 1)) * w;
        const cy = midY - amp * scaleY;
        primaryCtx.lineTo(cx, cy);
      }
      primaryCtx.lineTo(w, midY);
      primaryCtx.lineTo(0, midY);
      primaryCtx.closePath();
      const grad = primaryCtx.createLinearGradient(0, midY - h * 0.45, 0, midY);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.02)');
      primaryCtx.fillStyle = grad;
      primaryCtx.fill();

      primaryCtx.beginPath();
      primaryCtx.moveTo(0, midY - re[0] * scaleY);
      for (let i = 1; i < n; i++) {
        const cx = (i / (n - 1)) * w;
        const cy = midY - re[i] * scaleY;
        primaryCtx.lineTo(cx, cy);
      }
      primaryCtx.strokeStyle = '#ff0055';
      primaryCtx.lineWidth = 1.5;
      primaryCtx.stroke();

      primaryCtx.beginPath();
      primaryCtx.moveTo(0, midY - firstAmp * scaleY);
      for (let i = 1; i < n; i++) {
        const amp = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        const cx = (i / (n - 1)) * w;
        const cy = midY - amp * scaleY;
        primaryCtx.lineTo(cx, cy);
      }
      primaryCtx.strokeStyle = '#00f0ff';
      primaryCtx.lineWidth = 2.5;
      primaryCtx.shadowColor = '#00f0ff';
      primaryCtx.shadowBlur = 12;
      primaryCtx.stroke();
      primaryCtx.shadowBlur = 0;

    } else if (currentSystem === 'fput') {
      const q = fput.q;
      const n = fput.N;
      const scaleY = h * 0.22;

      primaryCtx.beginPath();
      primaryCtx.moveTo(0, midY);
      for (let i = 1; i <= n; i++) {
        const cx = (i / (n + 1)) * w;
        const cy = midY - q[i] * scaleY;
        primaryCtx.lineTo(cx, cy);
      }
      primaryCtx.lineTo(w, midY);
      primaryCtx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      primaryCtx.lineWidth = 2;
      primaryCtx.stroke();

      for (let i = 1; i <= n; i++) {
        const cx = (i / (n + 1)) * w;
        const cy = midY - q[i] * scaleY;
        primaryCtx.beginPath();
        primaryCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        primaryCtx.fillStyle = '#00ff88';
        primaryCtx.shadowColor = '#00ff88';
        primaryCtx.shadowBlur = 8;
        primaryCtx.fill();
      }
      primaryCtx.shadowBlur = 0;
    }
  }

  function renderDiagnostics() {
    const w = diagCanvas.width;
    const h = diagCanvas.height;
    diagCtx.clearRect(0, 0, w, h);

    if (currentSystem === 'fput') {
      const modes = fput.getModeEnergies(6);
      const totalE = fput.getTotalEnergy() || 1e-6;
      const barWidth = (w - 60) / modes.length;

      diagCtx.fillStyle = '#8b949e';
      diagCtx.font = '11px sans-serif';
      diagCtx.fillText('Mode Energy Fraction E_k / E_total', 16, 20);

      modes.forEach((m, idx) => {
        const frac = Math.min(1.0, m.energy / totalE);
        const barH = frac * (h - 70);
        const x = 30 + idx * barWidth;
        const y = h - 30 - barH;

        diagCtx.fillStyle = idx === 0 ? '#00f0ff' : '#9d4edd';
        diagCtx.fillRect(x + 4, y, barWidth - 8, barH);

        diagCtx.fillStyle = '#e6edf3';
        diagCtx.fillText(`k=${m.mode}`, x + (barWidth / 2) - 8, h - 12);
        diagCtx.fillText(`${(frac * 100).toFixed(1)}%`, x + 4, y - 6);
      });
    } else if (currentSystem === 'sine-gordon') {
      const phi = sg.phi;
      const p = sg.p;
      const n = sg.N;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const scaleX = w * 0.06;
      const scaleP = h * 0.25;

      diagCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      diagCtx.beginPath();
      diagCtx.moveTo(0, cy); diagCtx.lineTo(w, cy);
      diagCtx.moveTo(cx, 0); diagCtx.lineTo(cx, h);
      diagCtx.stroke();

      diagCtx.beginPath();
      for (let i = 0; i < n; i++) {
        const px = cx + (phi[i] - Math.PI) * scaleX;
        const py = cy - p[i] * scaleP;
        if (i === 0) diagCtx.moveTo(px, py);
        else diagCtx.lineTo(px, py);
      }
      diagCtx.strokeStyle = '#00f0ff';
      diagCtx.lineWidth = 1.5;
      diagCtx.stroke();
    } else {
      const fft = kdv.fft;
      const re = new Float64Array(N_GRID);
      const im = new Float64Array(N_GRID);

      if (currentSystem === 'kdv') {
        for (let i = 0; i < N_GRID; i++) re[i] = kdv.u[i];
      } else {
        for (let i = 0; i < N_GRID; i++) {
          re[i] = nlse.re[i];
          im[i] = nlse.im[i];
        }
      }
      fft.forward(re, im);

      const numBins = 64;
      const barW = w / numBins;
      diagCtx.beginPath();
      diagCtx.moveTo(0, h);

      for (let k = 0; k < numBins; k++) {
        const power = re[k] * re[k] + im[k] * im[k];
        const logPower = Math.max(0, Math.log10(power + 1e-6) + 6) / 6.0;
        const barH = logPower * (h - 40);
        const x = k * barW;
        const y = h - barH;
        diagCtx.lineTo(x, y);
      }
      diagCtx.lineTo(w, h);
      diagCtx.closePath();

      const grad = diagCtx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(157, 78, 221, 0.5)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.05)');
      diagCtx.fillStyle = grad;
      diagCtx.fill();
    }
  }

  primaryCanvas.addEventListener('pointerdown', (e) => {
    const rect = primaryCanvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const targetIdx = Math.floor(clickX * N_GRID);

    if (currentSystem === 'kdv') {
      for (let i = 0; i < N_GRID; i++) {
        const d = (i - targetIdx) / 12.0;
        kdv.u[i] += 1.8 * Math.exp(-d * d);
      }
    } else if (currentSystem === 'nlse') {
      for (let i = 0; i < N_GRID; i++) {
        const d = (i - targetIdx) / 10.0;
        nlse.re[i] += 1.2 * Math.exp(-d * d);
      }
    } else if (currentSystem === 'sine-gordon') {
      for (let i = 0; i < N_GRID; i++) {
        const d = (i - targetIdx) / 15.0;
        sg.p[i] += 1.5 * Math.exp(-d * d);
      }
    }
  });

  function loop(currentTime) {
    const elapsed = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    frameCount++;

    if (frameCount % 20 === 0 && elapsed > 0) {
      fps = 1000.0 / elapsed;
      telemFps.textContent = fps.toFixed(1);
    }

    if (isRunning) {
      for (let s = 0; s < substeps; s++) {
        if (currentSystem === 'kdv') {
          kdv.step(dt);
        } else if (currentSystem === 'sine-gordon') {
          sg.step(dt);
        } else if (currentSystem === 'nlse') {
          nlse.step(dt);
        } else if (currentSystem === 'fput') {
          fput.step(dt * 3.0);
        }
      }

      if (currentSystem === 'kdv') {
        waterfall.pushRow(kdv.u, -0.5, 4.0);
      } else if (currentSystem === 'sine-gordon') {
        waterfall.pushRow(sg.phi, -Math.PI, 2.0 * Math.PI);
      } else if (currentSystem === 'nlse') {
        const amp = new Float64Array(N_GRID);
        for (let i = 0; i < N_GRID; i++) {
          amp[i] = Math.sqrt(nlse.re[i] * nlse.re[i] + nlse.im[i] * nlse.im[i]);
        }
        waterfall.pushRow(amp, 0.0, 3.5);
      } else if (currentSystem === 'fput') {
        waterfall.pushRow(fput.q, -1.5, 1.5);
      }

      if (currentSystem === 'kdv') {
        const inv = kdv.getInvariants();
        telemTime.textContent = kdv.t.toFixed(3);
        const drift = Math.abs(inv.mass - kdv.initialMass) / (Math.abs(kdv.initialMass) || 1);
        telemDrift.textContent = drift.toExponential(2);
        telemCharge.textContent = inv.mass.toFixed(4);

        audio.update({
          kineticEnergy: inv.momentum,
          peakAmp: Math.max(...kdv.u),
          maxCurvature: Math.max(...kdv.u) * 1.5
        });
      } else if (currentSystem === 'sine-gordon') {
        const inv = sg.getInvariants();
        telemTime.textContent = sg.t.toFixed(3);
        const drift = Math.abs(inv.energy - sg.initialEnergy) / (Math.abs(sg.initialEnergy) || 1);
        telemDrift.textContent = drift.toExponential(2);
        telemCharge.textContent = inv.topologicalCharge.toFixed(3);

        audio.update({
          kineticEnergy: inv.kinetic,
          peakAmp: Math.max(...sg.phi),
          maxCurvature: inv.gradient
        });
      } else if (currentSystem === 'nlse') {
        const inv = nlse.getInvariants();
        telemTime.textContent = nlse.t.toFixed(3);
        const drift = Math.abs(inv.norm - nlse.initialNorm) / (Math.abs(nlse.initialNorm) || 1);
        telemDrift.textContent = drift.toExponential(2);
        telemCharge.textContent = inv.norm.toFixed(3);

        audio.update({
          kineticEnergy: inv.maxDensity,
          peakAmp: Math.sqrt(inv.maxDensity),
          maxCurvature: inv.maxDensity * 2.0
        });
      } else if (currentSystem === 'fput') {
        telemTime.textContent = fput.t.toFixed(3);
        const curE = fput.getTotalEnergy();
        const drift = Math.abs(curE - fput.initialTotalEnergy) / (fput.initialTotalEnergy || 1);
        telemDrift.textContent = drift.toExponential(2);
        telemCharge.textContent = curE.toFixed(4);

        audio.update({
          kineticEnergy: curE,
          modeEnergies: fput.getModeEnergies(3)
        });
      }
    }

    renderPrimary();
    renderDiagnostics();
    waterfall.render();

    requestAnimationFrame(loop);
  }

  document.querySelectorAll('.model-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.model-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSystem = btn.dataset.system;
      updatePresets();
      initSystem();
    });
  });

  presetSelect.addEventListener('change', () => {
    initSystem(presetSelect.value);
  });

  btnPlayPause.addEventListener('click', () => {
    isRunning = !isRunning;
    btnPlayPause.textContent = isRunning ? 'Pause' : 'Play';
    btnPlayPause.className = isRunning ? 'btn btn-primary' : 'btn btn-secondary';
  });

  btnStep.addEventListener('click', () => {
    isRunning = false;
    btnPlayPause.textContent = 'Play';
    btnPlayPause.className = 'btn btn-secondary';
    if (currentSystem === 'kdv') kdv.step(dt);
    else if (currentSystem === 'sine-gordon') sg.step(dt);
    else if (currentSystem === 'nlse') nlse.step(dt);
    else if (currentSystem === 'fput') fput.step(dt * 3.0);
  });

  btnReset.addEventListener('click', () => {
    initSystem(presetSelect.value);
  });

  btnAudio.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    btnAudio.textContent = isMuted ? 'Audio: Muted' : 'Audio: Active';
    btnAudio.style.color = isMuted ? 'inherit' : '#00ff88';
  });

  btnClearWaterfall.addEventListener('click', () => {
    waterfall.clear();
  });

  sliderDt.addEventListener('input', (e) => {
    dt = parseFloat(e.target.value);
    labelDt.textContent = dt.toFixed(4);
  });

  sliderSubsteps.addEventListener('input', (e) => {
    substeps = parseInt(e.target.value, 10);
    labelSubsteps.textContent = substeps;
  });

  selectColormap.addEventListener('change', (e) => {
    waterfall.colormap = e.target.value;
  });

  window.addEventListener('resize', resizeCanvases);

  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvases();
    updatePresets();
    initSystem();
    requestAnimationFrame(loop);
  });

})();
