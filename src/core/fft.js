/**
 * FOUNDRY // CORE FFT ENGINE
 * High-performance Cooley-Tukey Radix-2 Fast Fourier Transform
 * Optimized for real-time pseudo-spectral PDE integration.
 */

class FFT1D {
  constructor(size) {
    if ((size & (size - 1)) !== 0 || size < 2) {
      throw new Error(`FFT size must be a power of 2, received: ${size}`);
    }
    this.size = size;
    this.levels = Math.log2(size);
    
    // Precompute bit reversal permutation
    this.bitRev = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      let rev = 0;
      let temp = i;
      for (let j = 0; j < this.levels; j++) {
        rev = (rev << 1) | (temp & 1);
        temp >>= 1;
      }
      this.bitRev[i] = rev;
    }

    // Precompute twiddle factors (e^{-2 pi i k / N})
    this.cosTable = new Float64Array(size / 2);
    this.sinTable = new Float64Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      const angle = (-2.0 * Math.PI * i) / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
  }

  /**
   * Forward transform: in-place radix-2 DIT FFT
   * @param {Float64Array} re Real component array
   * @param {Float64Array} im Imaginary component array
   */
  forward(re, im) {
    const n = this.size;
    const bitRev = this.bitRev;
    const cosTable = this.cosTable;
    const sinTable = this.sinTable;

    // Bit-reversal permutation
    for (let i = 0; i < n; i++) {
      const j = bitRev[i];
      if (i < j) {
        const tr = re[i]; re[i] = re[j]; re[j] = tr;
        const ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }

    // Butterfly stages
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < half; j++) {
          const k = j * step;
          const u_r = cosTable[k];
          const u_i = sinTable[k];

          const posA = i + j;
          const posB = i + j + half;

          const br = re[posB];
          const bi = im[posB];

          // Complex multiply: (br + i bi) * (u_r + i u_i)
          const tr = br * u_r - bi * u_i;
          const ti = br * u_i + bi * u_r;

          re[posB] = re[posA] - tr;
          im[posB] = im[posA] - ti;
          re[posA] += tr;
          im[posA] += ti;
        }
      }
    }
  }

  /**
   * Inverse transform: in-place IFFT with 1/N scaling
   * @param {Float64Array} re Real component array
   * @param {Float64Array} im Imaginary component array
   */
  inverse(re, im) {
    const n = this.size;
    // Conjugate imaginary part
    for (let i = 0; i < n; i++) {
      im[i] = -im[i];
    }
    // Forward transform
    this.forward(re, im);
    // Conjugate back and normalize by 1/N
    const invN = 1.0 / n;
    for (let i = 0; i < n; i++) {
      re[i] *= invN;
      im[i] = -im[i] * invN;
    }
  }

  /**
   * Generates spectral wavenumbers k for periodic box of length L
   * Standard order: [0, 1, 2, ..., N/2-1, -N/2, -N/2+1, ..., -1] * (2 pi / L)
   */
  static getWavenumbers(size, L) {
    const k = new Float64Array(size);
    const dk = (2.0 * Math.PI) / L;
    const half = size / 2;
    for (let i = 0; i < size; i++) {
      if (i < half) {
        k[i] = i * dk;
      } else {
        k[i] = (i - size) * dk;
      }
    }
    return k;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FFT1D };
}
