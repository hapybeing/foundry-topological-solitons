const { FFT1D } = require('../src/core/fft.js');
const { KdVSolver } = require('../src/solvers/kdv.js');
const { SineGordonSolver } = require('../src/solvers/sine_gordon.js');
const { NLSESolver } = require('../src/solvers/nlse.js');
const { FPUTSolver } = require('../src/solvers/fput.js');

console.log('=== RUNNING FOUNDRY SOLITON TEST SUITE ===');

// 1. FFT Test
console.log('1. Testing FFT roundtrip accuracy...');
const fft = new FFT1D(512);
const re = new Float64Array(512);
const im = new Float64Array(512);
for (let i = 0; i < 512; i++) re[i] = Math.sin(i * 0.1) + Math.cos(i * 0.35);
const orig = new Float64Array(re);
fft.forward(re, im);
fft.inverse(re, im);
let maxErr = 0;
for (let i = 0; i < 512; i++) maxErr = Math.max(maxErr, Math.abs(re[i] - orig[i]));
console.log(`   ✓ FFT Max Roundtrip Error: ${maxErr.toExponential(2)}`);
if (maxErr > 1e-12) throw new Error('FFT accuracy failed');

// 2. KdV Invariant Conservation
console.log('2. Testing KdV Invariant Conservation...');
const kdv = new KdVSolver(512, 64.0);
kdv.setInitialCondition('two-solitons');
const kdv_i0 = kdv.getInvariants();
for (let i = 0; i < 200; i++) kdv.step(0.005);
const kdv_i1 = kdv.getInvariants();
const kdvMassDrift = Math.abs(kdv_i1.mass - kdv_i0.mass) / Math.abs(kdv_i0.mass);
const kdvMomDrift = Math.abs(kdv_i1.momentum - kdv_i0.momentum) / Math.abs(kdv_i0.momentum);
console.log(`   ✓ KdV Mass Drift: ${kdvMassDrift.toExponential(2)}`);
console.log(`   ✓ KdV Momentum Drift: ${kdvMomDrift.toExponential(2)}`);
if (kdvMassDrift > 1e-6 || kdvMomDrift > 1e-4) throw new Error('KdV conservation failed');

// 3. Sine-Gordon Symplectic Energy & Charge
console.log('3. Testing Sine-Gordon Symplectic Integration...');
const sg = new SineGordonSolver(512, 64.0);
sg.setInitialCondition('breather', { omega: 0.75 });
const sg_e0 = sg.getInvariants().energy;
for (let i = 0; i < 500; i++) sg.step(0.01);
const sg_e1 = sg.getInvariants().energy;
const sgEnergyDrift = Math.abs(sg_e1 - sg_e0) / sg_e0;
console.log(`   ✓ Sine-Gordon Breather Energy Drift: ${sgEnergyDrift.toExponential(2)}`);
if (sgEnergyDrift > 1e-7) throw new Error('Sine-Gordon symplectic drift too high');

// 4. NLSE Norm Conservation & Peregrine Peak
console.log('4. Testing NLSE Strang Split-Step Norm Conservation...');
const nlse = new NLSESolver(512, 64.0, 1.0);
nlse.setInitialCondition('peregrine-rogue');
const nlse_n0 = nlse.getInvariants().norm;
let maxRogueDensity = 0;
for (let i = 0; i < 400; i++) {
  nlse.step(0.005);
  const inv = nlse.getInvariants();
  if (inv.maxDensity > maxRogueDensity) maxRogueDensity = inv.maxDensity;
}
const nlse_n1 = nlse.getInvariants().norm;
const nlseNormDrift = Math.abs(nlse_n1 - nlse_n0) / nlse_n0;
console.log(`   ✓ NLSE Norm Drift: ${nlseNormDrift.toExponential(2)}`);
console.log(`   ✓ Peregrine Peak Observed: ${maxRogueDensity.toFixed(2)} (Theoretical peak ~ 9.0)`);
if (nlseNormDrift > 1e-12) throw new Error('NLSE norm drift failed');

// 5. FPUT Recurrence
console.log('5. Testing FPUT Lattice Symplectic Dynamics...');
const fput = new FPUTSolver(32, 0.25, 0.0);
fput.setInitialCondition('mode-1');
const fput_e0 = fput.getTotalEnergy();
for (let i = 0; i < 500; i++) fput.step(0.05);
const fput_e1 = fput.getTotalEnergy();
const fputDrift = Math.abs(fput_e1 - fput_e0) / fput_e0;
console.log(`   ✓ FPUT Energy Drift: ${fputDrift.toExponential(2)}`);
if (fputDrift > 1e-4) throw new Error('FPUT drift failed');

console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
