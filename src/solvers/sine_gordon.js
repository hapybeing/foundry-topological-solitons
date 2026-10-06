/**
 * FOUNDRY // SINE-GORDON TOPOLOGICAL SOLITON SOLVER
 * Equation: \phi_{tt} - \phi_{xx} + \sin(\phi) = 0
 * Symplectic 4th-Order Yoshida Integrator
 * Features: Topological charge Q tracking, Kink, Antikink, Breathers,
 * Annihilation resonance, and Josephson fluxon dynamics.
 */

class SineGordonSolver {
  constructor(N = 512, L = 64.0) {
    this.N = N;
    this.L = L;
    this.dx = L / N;
    this.x = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      this.x[i] = -L / 2 + i * this.dx;
    }

    // State fields: phi and p = phi_t
    this.phi = new Float64Array(N);
    this.p = new Float64Array(N);
    this.acc = new Float64Array(N);
    this.t = 0.0;

    // Yoshida 4th-order coefficients
    const cbrt2 = Math.cbrt(2.0);
    const w1 = 1.0 / (2.0 - cbrt2);
    const w0 = -cbrt2 / (2.0 - cbrt2);

    this.c = [w1 * 0.5, (w0 + w1) * 0.5, (w0 + w1) * 0.5, w1 * 0.5];
    this.d = [w1, w0, w1];

    this.initialEnergy = 0.0;
    this.initialCharge = 0.0;
  }

  setInitialCondition(type = 'kink-antikink', params = {}) {
    this.t = 0.0;
    const x = this.x;
    const N = this.N;

    for (let i = 0; i < N; i++) {
      this.phi[i] = 0.0;
      this.p[i] = 0.0;
    }

    if (type === 'single-kink') {
      const v = Math.min(0.95, Math.max(-0.95, params.v || 0.4));
      const gamma = 1.0 / Math.sqrt(1.0 - v * v);
      const x0 = params.x0 || 0.0;
      for (let i = 0; i < N; i++) {
        const arg = gamma * (x[i] - x0);
        this.phi[i] = 4.0 * Math.atan(Math.exp(arg));
        const sech = 1.0 / Math.cosh(arg);
        this.p[i] = -2.0 * gamma * v * sech;
      }
    } else if (type === 'kink-antikink') {
      const v = params.v !== undefined ? params.v : 0.45;
      const gamma = 1.0 / Math.sqrt(Math.max(0.01, 1.0 - v * v));
      const x0 = params.x0 || 10.0;

      for (let i = 0; i < N; i++) {
        const arg1 = gamma * (x[i] + x0);
        const arg2 = gamma * (x[i] - x0);

        const phi_kink = 4.0 * Math.atan(Math.exp(arg1));
        const phi_antikink = -4.0 * Math.atan(Math.exp(arg2));

        const p_kink = -2.0 * gamma * v / Math.cosh(arg1);
        const p_antikink = -2.0 * gamma * v / Math.cosh(arg2);

        this.phi[i] = phi_kink + phi_antikink;
        this.p[i] = p_kink + p_antikink;
      }
    } else if (type === 'kink-kink') {
      const v = params.v !== undefined ? params.v : 0.35;
      const gamma = 1.0 / Math.sqrt(Math.max(0.01, 1.0 - v * v));
      const x0 = params.x0 || 10.0;

      for (let i = 0; i < N; i++) {
        const arg1 = gamma * (x[i] + x0);
        const arg2 = gamma * (x[i] - x0);

        const phi_kink1 = 4.0 * Math.atan(Math.exp(arg1));
        const phi_kink2 = 4.0 * Math.atan(Math.exp(-arg2));

        this.phi[i] = phi_kink1 + phi_kink2;
        this.p[i] = (-2.0 * gamma * v / Math.cosh(arg1)) + (2.0 * gamma * v / Math.cosh(arg2));
      }
    } else if (type === 'breather') {
      const omega = params.omega || 0.75;
      const eta = Math.sqrt(1.0 - omega * omega);
      for (let i = 0; i < N; i++) {
        const num = (eta / omega) * Math.cos(0);
        const den = Math.cosh(eta * x[i]);
        this.phi[i] = 4.0 * Math.atan(num / den);
        this.p[i] = 0.0;
      }
    } else if (type === 'subcritical-resonance') {
      const v = 0.245;
      const gamma = 1.0 / Math.sqrt(1.0 - v * v);
      const x0 = 8.0;
      for (let i = 0; i < N; i++) {
        const arg1 = gamma * (x[i] + x0);
        const arg2 = gamma * (x[i] - x0);
        this.phi[i] = 4.0 * Math.atan(Math.exp(arg1)) - 4.0 * Math.atan(Math.exp(arg2));
        this.p[i] = (-2.0 * gamma * v / Math.cosh(arg1)) - (2.0 * gamma * v / Math.cosh(arg2));
      }
    }

    const inv = this.getInvariants();
    this.initialEnergy = inv.energy;
    this.initialCharge = inv.topologicalCharge;
  }

  computeAcceleration(phi, acc) {
    const N = this.N;
    const invDx2 = 1.0 / (this.dx * this.dx);

    for (let i = 0; i < N; i++) {
      const left = i === 0 ? phi[N - 1] : phi[i - 1];
      const right = i === N - 1 ? phi[0] : phi[i + 1];
      const curr = phi[i];

      const laplacian = (right - 2.0 * curr + left) * invDx2;
      acc[i] = laplacian - Math.sin(curr);
    }
  }

  step(dt) {
    const N = this.N;
    const c = this.c;
    const d = this.d;

    for (let i = 0; i < N; i++) this.phi[i] += c[0] * this.p[i] * dt;
    this.computeAcceleration(this.phi, this.acc);
    for (let i = 0; i < N; i++) this.p[i] += d[0] * this.acc[i] * dt;

    for (let i = 0; i < N; i++) this.phi[i] += c[1] * this.p[i] * dt;
    this.computeAcceleration(this.phi, this.acc);
    for (let i = 0; i < N; i++) this.p[i] += d[1] * this.acc[i] * dt;

    for (let i = 0; i < N; i++) this.phi[i] += c[2] * this.p[i] * dt;
    this.computeAcceleration(this.phi, this.acc);
    for (let i = 0; i < N; i++) this.p[i] += d[2] * this.acc[i] * dt;

    for (let i = 0; i < N; i++) this.phi[i] += c[3] * this.p[i] * dt;

    this.t += dt;
  }

  getInvariants() {
    const N = this.N;
    const dx = this.dx;
    let kinetic = 0.0;
    let gradient = 0.0;
    let potential = 0.0;

    for (let i = 0; i < N; i++) {
      const p = this.p[i];
      const next = i === N - 1 ? this.phi[0] : this.phi[i + 1];
      const dPhi = (next - this.phi[i]) / dx;

      kinetic += 0.5 * p * p * dx;
      gradient += 0.5 * dPhi * dPhi * dx;
      potential += (1.0 - Math.cos(this.phi[i])) * dx;
    }

    const energy = kinetic + gradient + potential;
    const topologicalCharge = (this.phi[N - 1] - this.phi[0]) / (2.0 * Math.PI);

    return {
      energy,
      kinetic,
      gradient,
      potential,
      topologicalCharge
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SineGordonSolver };
}
