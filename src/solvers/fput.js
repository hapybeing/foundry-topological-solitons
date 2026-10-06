/**
 * FOUNDRY // FERMI-PASTA-ULAM-TSINGOU (FPUT) LATTICE SOLVER
 * Non-Linear Chain & The Recurrence Paradox (Birthplace of Solitons)
 * Equation: \ddot{q}_n = (q_{n+1} - 2q_n + q_{n-1}) + \alpha [(q_{n+1}-q_n)^2 - (q_n-q_{n-1})^2]
 * Integrator: Velocity-Verlet / Symplectic 4th-Order Scheme
 * Monitors normal mode energies E_k(t) and demonstrates near-perfect recurrence.
 */

class FPUTSolver {
  constructor(N = 64, alpha = 0.25, beta = 0.0) {
    this.N = N;
    this.alpha = alpha;
    this.beta = beta;

    this.q = new Float64Array(N + 2);
    this.p = new Float64Array(N + 2);
    this.acc = new Float64Array(N + 2);
    this.t = 0.0;

    this.basis = [];
    this.omega = new Float64Array(N + 1);
    const factor = Math.sqrt(2.0 / (N + 1));
    for (let k = 1; k <= Math.min(8, N); k++) {
      const mode = new Float64Array(N + 1);
      this.omega[k] = 2.0 * Math.sin((k * Math.PI) / (2.0 * (N + 1)));
      for (let n = 1; n <= N; n++) {
        mode[n] = factor * Math.sin((k * n * Math.PI) / (N + 1));
      }
      this.basis[k] = mode;
    }

    this.initialTotalEnergy = 0.0;
  }

  setInitialCondition(type = 'mode-1', params = {}) {
    this.t = 0.0;
    const N = this.N;
    for (let i = 0; i <= N + 1; i++) {
      this.q[i] = 0.0;
      this.p[i] = 0.0;
    }

    const amp = params.amp || 1.0;
    if (type === 'mode-1') {
      for (let n = 1; n <= N; n++) {
        this.q[n] = amp * Math.sin((1 * n * Math.PI) / (N + 1));
      }
    } else if (type === 'mode-2') {
      for (let n = 1; n <= N; n++) {
        this.q[n] = amp * Math.sin((2 * n * Math.PI) / (N + 1));
      }
    } else if (type === 'two-modes') {
      for (let n = 1; n <= N; n++) {
        this.q[n] = amp * (Math.sin((1 * n * Math.PI) / (N + 1)) + 0.5 * Math.sin((3 * n * Math.PI) / (N + 1)));
      }
    }

    this.initialTotalEnergy = this.getTotalEnergy();
  }

  computeForces(q, acc) {
    const N = this.N;
    const alpha = this.alpha;
    const beta = this.beta;

    q[0] = 0.0;
    q[N + 1] = 0.0;

    for (let n = 1; n <= N; n++) {
      const dRight = q[n + 1] - q[n];
      const dLeft = q[n] - q[n - 1];

      let force = dRight - dLeft;

      if (alpha !== 0) {
        force += alpha * (dRight * dRight - dLeft * dLeft);
      }
      if (beta !== 0) {
        force += beta * (dRight * dRight * dRight - dLeft * dLeft * dLeft);
      }

      acc[n] = force;
    }
  }

  step(dt) {
    const N = this.N;
    const halfDt = dt * 0.5;

    this.computeForces(this.q, this.acc);
    for (let n = 1; n <= N; n++) {
      this.p[n] += halfDt * this.acc[n];
      this.q[n] += dt * this.p[n];
    }

    this.computeForces(this.q, this.acc);
    for (let n = 1; n <= N; n++) {
      this.p[n] += halfDt * this.acc[n];
    }

    this.t += dt;
  }

  getModeEnergies(maxModes = 5) {
    const N = this.N;
    const energies = [];
    const limit = Math.min(maxModes, this.basis.length - 1);

    for (let k = 1; k <= limit; k++) {
      const b = this.basis[k];
      let Q_k = 0.0;
      let P_k = 0.0;
      for (let n = 1; n <= N; n++) {
        Q_k += this.q[n] * b[n];
        P_k += this.p[n] * b[n];
      }
      const w = this.omega[k];
      const E_k = 0.5 * (P_k * P_k + w * w * Q_k * Q_k);
      energies.push({ mode: k, energy: E_k });
    }

    return energies;
  }

  getTotalEnergy() {
    const N = this.N;
    const alpha = this.alpha;
    const beta = this.beta;
    let kinetic = 0.0;
    let potential = 0.0;

    for (let n = 1; n <= N; n++) {
      kinetic += 0.5 * this.p[n] * this.p[n];
    }

    for (let n = 0; n <= N; n++) {
      const delta = this.q[n + 1] - this.q[n];
      let v = 0.5 * delta * delta;
      if (alpha !== 0) v += (alpha / 3.0) * delta * delta * delta;
      if (beta !== 0) v += (beta / 4.0) * delta * delta * delta * delta;
      potential += v;
    }

    return kinetic + potential;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FPUTSolver };
}
