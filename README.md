# FOUNDRY // Topological Solitons & Integrable Manifolds

> **Interactive Non-Linear Wave Laboratory**: Solitons, Breathers, Rogue Waves, and Integrable Field Dynamics across KdV, Sine-Gordon, and Non-Linear Schrödinger Systems with Symplectic & Strang Split-Step Spectral Integrators.

[![GitHub Pages Deployment](https://img.shields.io/badge/deployment-GitHub%20Pages-00f0ff?style=flat-square&logo=github)](https://hapybeing.github.io/foundry-topological-solitons/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-00ff88?style=flat-square)](#)

---

## 🔬 Mathematical Physics & Governing Regimes

### 1. The Korteweg–de Vries (KdV) Equation
$$
\frac{\partial u}{\partial t} + 6u \frac{\partial u}{\partial x} + \frac{\partial^3 u}{\partial x^3} = 0
$$

The Korteweg–de Vries equation models shallow surface water waves, acoustic ion-plasma waves, and internal solitary ocean waves. It is the archetypal completely integrable Hamiltonian system possessing an infinite sequence of conserved invariants:
- **Mass / Wave Action**: $I_1 = \int_{-\infty}^{\infty} u \, dx$
- **Momentum ($L_2$ Norm)**: $I_2 = \int_{-\infty}^{\infty} u^2 \, dx$
- **Hamiltonian Energy**: $I_3 = \int_{-\infty}^{\infty} \left( 2u^3 - \left(\frac{\partial u}{\partial x}\right)^2 \right) dx$

Single-soliton analytical solution with velocity $c$:
$$
u(x, t) = \frac{c}{2} \operatorname{sech}^2\left( \frac{\sqrt{c}}{2} (x - ct - x_0) \right)
$$
During $N$-soliton collisions, the non-linear steepening ($6u u_x$) precisely cancels wave dispersion ($u_{xxx}$), allowing solitons to emerge completely undamaged with only an asymptotic phase shift $\Delta x_i$.

---

### 2. The Sine-Gordon Relativistic Field Model
$$
\frac{\partial^2 \phi}{\partial t^2} - \frac{\partial^2 \phi}{\partial x^2} + \sin(\phi) = 0
$$

A Lorentz-invariant scalar field equation central to particle physics, domain walls, fluxons in Josephson superconducting junctions, and crystal dislocations.

#### Topological Invariant & Homotopy
The vacuum manifold corresponds to $\phi = 2\pi n$ ($n \in \mathbb{Z}$). The topological charge (winding number) is strictly quantized:
$$
Q = \frac{1}{2\pi} \int_{-\infty}^{\infty} \frac{\partial \phi}{\partial x} \, dx = \frac{\phi(+\infty) - \phi(-\infty)}{2\pi} \in \mathbb{Z}
$$

- **Topological Kink ($Q = +1$)**:
  $$
  \phi(x, t) = 4 \arctan\left( \exp\left( \frac{x - vt - x_0}{\sqrt{1 - v^2}} \right) \right)
  $$
- **Antikink ($Q = -1$)**: $\phi_{\bar{K}} = -\phi_K$.
- **Breathers (Bound States, $Q = 0$)**:
  $$
  \phi_B(x, t) = 4 \arctan\left( \frac{\sqrt{1 - \omega^2}}{\omega} \frac{\cos(\omega t)}{\cosh(\sqrt{1 - \omega^2} x)} \right), \quad 0 < \omega < 1
  $$
- **Subcritical Resonance**: At velocities $v > v_c \approx 0.2598$, kink-antikink pairs pass elastically through each other. Below $v_c$, energy couples into internal vibrational modes, leading to fractal resonance windows and eventual annihilation into scalar radiation waves.

---

### 3. The Non-Linear Schrödinger Equation (NLSE)
$$
i \frac{\partial \psi}{\partial t} + \frac{1}{2} \frac{\partial^2 \psi}{\partial x^2} + g |\psi|^2 \psi = 0
$$

The universal envelope equation for non-linear optical fiber dispersion, Bose–Einstein condensates (Gross–Pitaevskii), and deep-water ocean rogue waves.

#### Focusing Regime ($g > 0$)
- **Peregrine Spatiotemporal Rogue Wave**: Localized both in space ($x$) and time ($t$), reaching a maximum amplitude three times higher than the background plane wave ($|\psi(0,0)| = 3$):
  $$
  \psi_P(x, t) = \left[ 1 - \frac{4(1 + 2it)}{1 + 4x^2 + 4t^2} \right] e^{it}
  $$
- **Akhmediev Breathers**: Space-periodic breathers describing the continuous nonlinear development of the Benjamin–Feir (modulation) instability.
- **Bright Solitons**: Traveling solitary pulses maintaining shape via self-phase modulation balance.

#### Defocusing Regime ($g < 0$)
- **Dark Solitons**: Propagating localized dips in field intensity associated with an abrupt phase shift across the zero-crossing:
  $$
  \psi_D(x, t) = \psi_0 \left( B \tanh(B(x - vt)) + iA \right) e^{-i |\psi_0|^2 t}, \quad A^2 + B^2 = 1
  $$

---

### 4. Fermi–Pasta–Ulam–Tsingou (FPUT) Lattice Recurrence
$$
\ddot{q}_n = (q_{n+1} - 2q_n + q_{n-1}) + \alpha \left[ (q_{n+1} - q_n)^2 - (q_n - q_{n-1})^2 \right]
$$

In 1953 at Los Alamos, Enrico Fermi, John Pasta, Stanislaw Ulam, and Mary Tsingou studied thermalization in weakly non-linear coupled mass lattices. Instead of equipartition of energy into higher Fourier modes, energy transferred periodically between modes 1, 2, 3, and returned almost completely to mode 1 after the FPUT recurrence time.

Norman Zabusky and Martin Kruskal (1965) took the continuum limit of the FPUT lattice and derived the KdV equation, coining the term **soliton** to describe the emergent solitary waves.

---

## ⚡ High-Performance Numerical Algorithms

1. **Cooley–Tukey Radix-2 FFT Engine (`src/core/fft.js`)**:
   - Zero-dependency implementation with precomputed bit-reversal and trigonometric twiddle factor tables.
   - Machine-precision verified roundtrip error $< 10^{-15}$.

2. **Strang Split-Step Fourier Spectral Integration**:
   - Separates linear dispersive evolution in Fourier space from non-linear spatial rotations.
   - For NLSE: exact unitary phase operator $\exp(i g |\psi|^2 \Delta t)$ guarantees conservation of the $L_2$ norm to machine precision.

3. **4th-Order Symplectic Yoshida Integrator (`src/solvers/sine_gordon.js`)**:
   - Decomposes Hamiltonian flow into four substeps with weights derived from Lie algebraic operator splitting:
     $$w_1 = \frac{1}{2 - 2^{1/3}}, \quad w_0 = -\frac{2^{1/3}}{2 - 2^{1/3}}$$
   - Conserves phase-space volume and bounds energy drift $\Delta E / E_0 < 10^{-9}$ over thousands of integration steps.

---

## 🖥️ Visual & Acoustic Architecture

- **Primary Spatial Waveform**: High-DPI canvas renderer with neon glow filters, dual-field overlay ($\phi$ and $\phi_t$, $|\psi|$ and $\operatorname{Re}(\psi)$), and interactive Gaussian perturbation injector.
- **Space-Time $(x, t)$ Waterfall Diagram**: Real-time worldsheet generation projecting soliton worldlines, collision intersections, and radiation ripples with customizable colormaps (`Cyberpunk`, `Plasma`, `Electric`, `Inferno`).
- **Fourier Spectrum & Hodograph Telemetry**: Live spectral energy distribution $|S(k)|^2$ and $(\phi, \phi_t)$ phase portrait.
- **Web Audio Sonifier (`src/audio/sonification.js`)**: Real-time sonification mapping wave curvature $\partial^2 u / \partial x^2$ and collision kinetic energy bursts to resonant bandpass filters and harmonic drone synthesizers.

---

## 🚀 Getting Started

No build step or external dependencies required. Open `index.html` in any modern web browser or serve locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .
```

Visit `http://localhost:8000` to launch the observatory.

---

## 📜 License
MIT License. Created by [hapybeing](https://github.com/hapybeing) with Gemini Spark.
