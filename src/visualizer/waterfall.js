/**
 * FOUNDRY // SPACE-TIME $(x,t)$ WATERFALL & WORLDSHEET VISUALIZER
 * Records spatial field evolution over time and projects continuous worldlines.
 * Visualizes soliton trajectories, phase shifts, radiation cascades, and collisions.
 */

class WaterfallVisualizer {
  constructor(canvas, width = 512, historyDepth = 256) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.height = historyDepth;

    this.offscreen = document.createElement('canvas');
    this.offscreen.width = width;
    this.offscreen.height = historyDepth;
    this.offCtx = this.offscreen.getContext('2d');

    this.imageData = this.offCtx.createImageData(width, historyDepth);
    this.pixels = new Uint32Array(this.imageData.data.buffer);
    this.currentLine = 0;

    this.colormap = 'cyberpunk';
    this.colorTables = this.generateColorTables();
  }

  generateColorTables() {
    const tables = {
      cyberpunk: new Uint32Array(256),
      plasma: new Uint32Array(256),
      electric: new Uint32Array(256),
      inferno: new Uint32Array(256)
    };

    for (let i = 0; i < 256; i++) {
      const t = i / 255.0;

      // Cyberpunk
      let r1, g1, b1;
      if (t < 0.33) {
        const u = t / 0.33;
        r1 = Math.floor(6 + 10 * u);
        g1 = Math.floor(10 + 200 * u);
        b1 = Math.floor(25 + 230 * u);
      } else if (t < 0.66) {
        const u = (t - 0.33) / 0.33;
        r1 = Math.floor(16 + 230 * u);
        g1 = Math.floor(210 - 150 * u);
        b1 = Math.floor(255 - 50 * u);
      } else {
        const u = (t - 0.66) / 0.34;
        r1 = Math.floor(246 + 9 * u);
        g1 = Math.floor(60 + 195 * u);
        b1 = Math.floor(205 + 50 * u);
      }
      tables.cyberpunk[i] = (255 << 24) | (b1 << 16) | (g1 << 8) | r1;

      // Electric
      const b2 = Math.floor(Math.min(255, 300 * Math.pow(t, 0.7)));
      const g2 = Math.floor(Math.min(255, 260 * Math.pow(t, 1.2)));
      const r2 = Math.floor(Math.min(255, 180 * Math.pow(t, 2.5)));
      tables.electric[i] = (255 << 24) | (b2 << 16) | (g2 << 8) | r2;

      // Plasma
      const r3 = Math.floor(255 * (0.5 + 0.5 * Math.sin(3.0 * t - 1.5)));
      const g3 = Math.floor(255 * (0.5 + 0.5 * Math.sin(3.0 * t)));
      const b3 = Math.floor(255 * (0.5 + 0.5 * Math.sin(3.0 * t + 1.5)));
      tables.plasma[i] = (255 << 24) | (b3 << 16) | (g3 << 8) | r3;

      // Inferno
      const r4 = Math.floor(255 * Math.min(1.0, 1.5 * t));
      const g4 = Math.floor(255 * Math.min(1.0, Math.max(0.0, 1.5 * t - 0.4)));
      const b4 = Math.floor(255 * Math.min(1.0, Math.max(0.0, 2.0 * t - 1.0)));
      tables.inferno[i] = (255 << 24) | (b4 << 16) | (g4 << 8) | r4;
    }

    return tables;
  }

  clear() {
    this.pixels.fill(0xFF07090E);
    this.currentLine = 0;
    this.render();
  }

  pushRow(field, minVal = -2.0, maxVal = 5.0) {
    const w = this.width;
    const h = this.height;
    const n = field.length;
    const table = this.colorTables[this.colormap] || this.colorTables.cyberpunk;
    const range = Math.max(0.001, maxVal - minVal);

    this.pixels.copyWithin(0, w, w * h);

    const rowOffset = (h - 1) * w;
    for (let x = 0; x < w; x++) {
      const fieldIdx = Math.floor((x / w) * n);
      const val = field[fieldIdx];
      const norm = Math.max(0.0, Math.min(1.0, (val - minVal) / range));
      const lutIdx = Math.floor(norm * 255.0);
      this.pixels[rowOffset + x] = table[lutIdx];
    }
  }

  render() {
    this.offCtx.putImageData(this.imageData, 0, 0);
    this.ctx.drawImage(
      this.offscreen,
      0, 0, this.width, this.height,
      0, 0, this.canvas.width, this.canvas.height
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WaterfallVisualizer };
}
