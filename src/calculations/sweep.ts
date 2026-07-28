import type { MultiLink, SimulationParameters, SweepKey, SweepPoint } from '../models/types';
import { simulate } from './simulate';

export function setSweepValue(base: SimulationParameters, key: SweepKey, value: number): SimulationParameters {
  const p = structuredClone(base);
  switch (key) {
    case 'distanceM': p.propagation.distanceM = value; break;
    case 'radiantIntensityWsr': p.source.radiantIntensityWsr = value; break;
    case 'apertureDiameterM': p.optics.apertureDiameterM = value; break;
    case 'atmosphericTransmission': p.propagation.atmosphericTransmission = value; break;
    case 'responsivityAW': p.apd.responsivityAW = value; break;
    case 'gain': p.apd.gain = value; break;
    case 'darkCurrentA': p.apd.darkCurrentA = value; break;
    case 'directPowerW': p.background.directPowerW = value; break;
    case 'enbwHz': p.tia.enbwHz = value; break;
    case 'feedbackResistanceOhm': p.tia.feedbackResistanceOhm = value; break;
    case 'modulationDepth': p.source.modulationDepth = value; break;
  }
  return p;
}

export function linearSpace(start: number, end: number, count: number): number[] {
  if (count <= 1) return [start];
  return Array.from({ length: count }, (_, i) => start + (i / (count - 1)) * (end - start));
}

export function sweep(
  base: SimulationParameters,
  key: SweepKey,
  start: number,
  end: number,
  count: number,
): SweepPoint[] {
  return linearSpace(start, end, count).map((x) => ({ x, result: simulate(setSweepValue(base, key, x)) }));
}

export function matrixSweep(
  base: SimulationParameters,
  xKey: SweepKey,
  xValues: number[],
  yKey: SweepKey,
  yValues: number[],
) {
  return yValues.flatMap((y, yi) =>
    xValues.map((x, xi) => {
      const p = setSweepValue(setSweepValue(base, xKey, x), yKey, y);
      const result = simulate(p);
      return { x, y, xi, yi, snr: result.modulatedSnr, snrDb: result.snrDb };
    }),
  );
}

export function defaultBatch(base: SimulationParameters) {
  return [3000, 4000, 5000].flatMap((distanceM) =>
    [1, 2, 5].map((radiantIntensityWsr) => {
      const p = setSweepValue(setSweepValue(base, 'distanceM', distanceM), 'radiantIntensityWsr', radiantIntensityWsr);
      return {
        distanceM,
        radiantIntensityWsr,
        typical: simulate(p, p.apd.darkCurrentA),
        maximum: simulate(p, p.apd.maxDarkCurrentA),
      };
    }),
  );
}

export function simulateMultiLinks(
  base: SimulationParameters,
  links: MultiLink[],
  sumNonCoherent = true,
) {
  const enabled = links.filter((link) => link.enabled);
  const rows = enabled.map((link) => {
    const p = structuredClone(base);
    p.source.name = link.sourceName;
    p.source.radiantIntensityWsr = link.radiantIntensityWsr;
    p.propagation.distanceM = link.distanceM;
    p.propagation.attenuationMode = 'transmission';
    p.propagation.atmosphericTransmission = link.transmission;
    return { link, result: simulate(p) };
  });
  const totalPowerW = rows.reduce((sum, row) => sum + row.result.signalPowerW, 0);
  return { rows, totalPowerW: sumNonCoherent ? totalPowerW : Math.sqrt(totalPowerW) ** 2 };
}

export function monteCarlo(
  base: SimulationParameters,
  samples: number,
  uncertaintyFraction: number,
  random: () => number = Math.random,
) {
  const values = Array.from({ length: samples }, () => {
    const p = structuredClone(base);
    const normalish = (random() + random() + random() + random() - 2) * uncertaintyFraction;
    p.source.radiantIntensityWsr *= Math.max(0.01, 1 + normalish);
    p.propagation.atmosphericTransmission *= Math.max(0.01, 1 + normalish * 0.7);
    p.optics.alignmentEfficiency *= Math.max(0.01, 1 + normalish * 0.5);
    return simulate(p).snrDb;
  }).sort((a, b) => a - b);
  const pick = (q: number) => values[Math.min(values.length - 1, Math.floor(q * values.length))];
  return { values, p05: pick(0.05), median: pick(0.5), p95: pick(0.95) };
}
