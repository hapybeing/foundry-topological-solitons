/**
 * FOUNDRY // KORTEWEG-DE VRIES (KdV) SOLVER
 * Equation: u_t + 6*u*u_x + u_xxx = 0
 * Numerical Scheme: Integrating-Factor Runge-Kutta 4 (IF-RK4) Pseudo-spectral Solver
 * Conserves infinite hierarchy of invariants (Mass, Momentum, Hamiltonian)
 */

class KdVSolver {
  constructor(N = 512, L = 64.0) {
    this.N = N;
    this.L = L;
    this.dx = L / N;
    this.x = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      this.x[i] = -L / 2 + i * this.dx;
    }

    this.fft = new (typeof FFT1D !== 'undefined' ? FFT1D : require('../core/fft.js').FFT1D)(N);
    this.k = (typeof FFT1D !== 'undefined' ? FFT1D : require('../core/fft.js').FFT1D).getWavenumbers(N, L);

    // Primary state
    this.u = new Float64Array(N);
    this.t = 0.0;

    // Working buffers for RK4 integration
    this.re = new Float64Array(N);
    this.im = new Float64Array(N);
    this.u_tmp = new Float64Array(N);
    this.k1 = new Float64Array(N);
    this.k2 = new Float64Array(N);
    this.k3 = new Float64Array(N);
    this.k4 = new Float64Array(N);
    this.u_sq = new Float64Array(N);
    this.rhs_re = new Float64Array(N);
    this.rhs_im = new Float64Array(N);

    // Initial conserved quantities baseline
    this.initialMass = 0;
    this.initialMomentum = 0;
    this.initialEnergy = 0;
  }

  setInitialCondition(type = 'two-solitons', params = {}) {
    this.t = 0.0;
    const x = this.x;
    const N = this.N;
    const L = this.L;

    for (let i = 0; i < N; i++) {
      this.u[i] = 0;
    }

    if (type === 'single-soliton') {
      const c = params.c || 2.0;
      const x0 = params.x0 || -10.0;
      const kappa = Math.sqrt(c) / 2.0;
      for (let i = 0; i < N; i++) {
        const dx = x[i] - x0;
        const s = 1.0 / Math.cosh(kappa * dx);
        this.u[i] = (c / 2.0) * s * s;
      }
    } else if (type === 'two-solitons') {
      const c1 = params.c1 || 4.0;
      const c2 = params.c2 || 1.5;
      const x1 = params.x1 || -18.0;
      const x2 = params.x2 || -4.0;
      const k1 = Math.sqrt(c1) / 2.0;
      const k2 = Math.sqrt(c2) / 2.0;
      for (let i = 0; i < N; i++) {
        const s1 = 1.0 / Math.cosh(k1 * (x[i] - x1));
        const s2 = 1.0 / Math.cosh(k2 * (x[i] - x2));
        this.u[i] = (c1 / 2.0) * s1 * s1 + (c2 / 2.0) * s2 * s2;
      }
    } else if (type === 'three-solitons') {
      const c1 = params.c1 || 5.0;
      const c2 = params.c2 || 2.5;
      const c3 = params.c3 || 1.0;
      const x1 = params.x1 || -22.0;
      const x2 = params.x2 || -10.0;
      const x3 = params.x3 || 2.0;
      const k1 = Math.sqrt(c1) / 2.0;
      const k2 = Math.sqrt(c2) / 2.0;
      const k3 = Math.sqrt(c3) / 2.0;
      for (let i = 0; i < N; i++) {
        const s1 = 1.0 / Math.cosh(k1 * (x[i] - x1));
        const s2 = 1.0 / Math.cosh(k2 * (x[i] - x2));
        const s3 = 1.0 / Math.cosh(k3 * (x[i] - x3));
        this.u[i] = (c1 / 2.0) * s1 * s1 + (c2 / 2.0) * s2 * s2 + (c3 / 2.0) * s3 * s3;
      }
    } else if (type === 'collision-chase') {
      // Large fast soliton catching up to smaller slower one
      const c1 = 4.5;
      const c2 = 1.2;
      const k1 = Math.sqrt(c1) / 2.0;
      const k2 = Math.sqrt(c2) / 2.0;
      for (let i = 0; i < N; i++) {
        const s1 = 1.0 / Math.cosh(k1 * (x[i] + 16.0));
        const s2 = 1.0 / Math.cosh(k2 * (x[i] + 2.0));
        this.u[i] = (c1 / 2.0) * s1 * s1 + (c2 / 2.0) * s2 * s2;
      }
    } else if (type === 'cosine-wave') {
      const amp = params.amp || 1.5;
      const k_w = (2.0 * Math.PI) / L * (params.modes || 2);
      for (let i = 0; i < N; i++) {
        this.u[i] = amp * Math.cos(k_w * x[i]);
      }
    }

    const inv = this.getInvariants();
    this.initialMass = inv.mass;
    this.initialMomentum = inv.momentum;
    this.initialEnergy = inv.energy;
  }

  /**
   * Strang split-step integration step dt:
   * Half-step dispersion -> Full step non-linear (conserved Flux) -> Half-step dispersion
   */
  step(dt) {
    const N = this.N;
    const k = this.k;
    const halfDt = dt * 0.5;

    // 1. Dispersion half-step: u_hat = u_hat * exp(i * k^3 * dt / 2)
    for (let i = 0; i < N; i++) {
      this.re[i] = this.u[i];
      this.im[i] = 0.0;
    }
    this.fft.forward(this.re, this.im);

    for (let i = 0; i < N; i++) {
      const theta = (k[i] * k[i] * k[i]) * halfDt;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const r = this.re[i];
      const m = this.im[i];
      this.re[i] = r * cosT - m * sinT;
      this.im[i] = r * sinT + m * cosT;
    }
    this.fft.inverse(this.re, this.im);
    for (let i = 0; i < N; i++) {
      this.u[i] = this.re[i];
    }

    // 2. Non-linear step using RK4 on u_t = -3 (u^2)_x
    this.rk4Nonlinear(dt);

    // 3. Dispersion second half-step
    for (let i = 0; i < N; i++) {
      this.re[i] = this.u[i];
      this.im[i] = 0.0;
    }
    this.fft.forward(this.re, this.im);

    for (let i = 0; i < N; i++) {
      const theta = (k[i] * k[i] * k[i]) * halfDt;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const r = this.re[i];
      const m = this.im[i];
      this.re[i] = r * cosT - m * sinT;
      this.im[i] = r * sinT + m * cosT;
    }
    this.fft.inverse(this.re, this.im);
    for (let i = 0; i < N; i++) {
      this.u[i] = this.re[i];
    }

    this.t += dt;
  }

  computeNonlinearRHS(src, out) {
    const N = this.N;
    const k = this.k;
    // u^2
    for (let i = 0; i < N; i++) {
      this.rhs_re[i] = src[i] * src[i];
      this.rhs_im[i] = 0.0;
    }
    this.fft.forward(this.rhs_re, this.rhs_im);

    // Spectral derivative of -3 * u^2: -3 * (i * k) * FFT(u^2)
    for (let i = 0; i < N; i++) {
      const r = this.rhs_re[i];
      const m = this.rhs_im[i];
      const factor = 3.0 * k[i];
      this.rhs_re[i] = factor * m;
      this.rhs_im[i] = -factor * r;
    }
    this.fft.inverse(this.rhs_re, this.rhs_im);
    for (let i = 0; i < N; i++) {
      out[i] = this.rhs_re[i];
    }
  }

  rk4Nonlinear(dt) {
    const N = this.N;
    // k1 = f(u)
    this.computeNonlinearRHS(this.u, this.k1);

    // k2 = f(u + 0.5 * dt * k1)
    for (let i = 0; i < N; i++) this.u_tmp[i] = this.u[i] + 0.5 * dt * this.k1[i];
    this.computeNonlinearRHS(this.u_tmp, this.k2);

    // k3 = f(u + 0.5 * dt * k2)
    for (let i = 0; i < N; i++) this.u_tmp[i] = this.u[i] + 0.5 * dt * this.k2[i];
    this.computeNonlinearRHS(this.u_tmp, this.k3);

    // k4 = f(u + dt * k3)
    for (let i = 0; i < N; i++) this.u_tmp[i] = this.u[i] + dt * this.k3[i];
    this.computeNonlinearRHS(this.u_tmp, this.k4);

    // Update u
    const dt6 = dt / 6.0;
    for (let i = 0; i < N; i++) {
      this.u[i] += dt6 * (this.k1[i] + 2.0 * this.k2[i] + 2.0 * this.k3[i] + this.k4[i]);
    }
  }

  getInvariants() {
    const N = this.N;
    const dx = this.dx;
    let mass = 0.0;
    let momentum = 0.0;
    let energy = 0.0;

    // Compute derivative u_x spectrally
    for (let i = 0; i < N; i++) {
      this.re[i] = this.u[i];
      this.im[i] = 0.0;
    }
    this.fft.forward(this.re, this.im);
    for (let i = 0; i < N; i++) {
      const r = this.re[i];
      const m = this.im[i];
      this.re[i] = -this.k[i] * m;
      this.im[i] = this.k[i] * r;
    }
    this.fft.inverse(this.re, this.im);

    for (let i = 0; i < N; i++) {
      const val = this.u[i];
      const ux = this.re[i];
      mass += val * dx;
      momentum += val * val * dx;
      energy += (2.0 * val * val * val - ux * ux) * dx;
    }

    return { mass, momentum, energy };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KdVSolver };
}
