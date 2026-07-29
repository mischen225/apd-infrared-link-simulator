import type { APDParameters, NoiseBreakdown, TIAParameters } from '../models/types';

export const ELECTRON_CHARGE_C = 1.602176634e-19;
export const BOLTZMANN_JK = 1.380649e-23;

export function shotNoiseRms(
  primaryCurrentA: number,
  gain: number,
  excessFactor: number,
  bandwidthHz: number,
): number {
  return Math.sqrt(2 * ELECTRON_CHARGE_C * bandwidthHz * gain ** 2 * excessFactor * primaryCurrentA);
}

export function surfaceShotNoiseRms(surfaceCurrentA: number, bandwidthHz: number): number {
  return Math.sqrt(2 * ELECTRON_CHARGE_C * bandwidthHz * surfaceCurrentA);
}

export function resistorThermalNoiseRms(resistanceOhm: number, temperatureK: number, bandwidthHz: number): number {
  return Math.sqrt(resistorThermalNoiseCurrentMeanSquare(resistanceOhm, temperatureK, bandwidthHz));
}

export function resistorThermalNoiseCurrentMeanSquare(
  resistanceOhm: number,
  temperatureK: number,
  bandwidthHz: number,
): number {
  return (4 * BOLTZMANN_JK * temperatureK * bandwidthHz) / resistanceOhm;
}

export function resistorThermalNoiseCurrentDensity(
  resistanceOhm: number,
  temperatureK: number,
): number {
  return Math.sqrt((4 * BOLTZMANN_JK * temperatureK) / resistanceOhm);
}

export function resistorThermalNoiseVoltageDensity(
  resistanceOhm: number,
  temperatureK: number,
): number {
  return Math.sqrt(4 * BOLTZMANN_JK * temperatureK * resistanceOhm);
}

export function resistorThermalNoiseVoltageRms(
  resistanceOhm: number,
  temperatureK: number,
  bandwidthHz: number,
): number {
  return Math.sqrt(4 * BOLTZMANN_JK * temperatureK * resistanceOhm * bandwidthHz);
}

export function apdShotAndThermalNoiseRms(
  primaryPhotocurrentA: number,
  primaryDarkCurrentA: number,
  gain: number,
  excessFactor: number,
  bandwidthHz: number,
  loadResistanceOhm: number,
  temperatureK: number,
): number {
  const shotVariance =
    2 *
    ELECTRON_CHARGE_C *
    gain ** 2 *
    excessFactor *
    (primaryPhotocurrentA + primaryDarkCurrentA) *
    bandwidthHz;
  const thermalVariance = resistorThermalNoiseCurrentMeanSquare(
    loadResistanceOhm,
    temperatureK,
    bandwidthHz,
  );
  return Math.sqrt(shotVariance + thermalVariance);
}

export function integratedVoltageNoiseRms(apd: APDParameters, tia: TIAParameters): number {
  if (tia.voltageNoiseMode === 'simple') {
    return (tia.opAmpVoltageNoiseVHz / tia.feedbackResistanceOhm) * Math.sqrt(tia.enbwHz);
  }
  const capacitance =
    apd.junctionCapacitanceF + tia.opAmpInputCapacitanceF + tia.pcbCapacitanceF;
  const points = 360;
  const fMin = Math.max(0.1, tia.enbwHz / 10000);
  const fMax = Math.max(tia.enbwHz * 20, 10);
  let variance = 0;
  let previousF = fMin;
  let previousDensity = voltageNoiseDensityAt(fMin);
  function voltageNoiseDensityAt(frequencyHz: number) {
    const capacitiveCurrentDensity = 2 * Math.PI * frequencyHz * capacitance * tia.opAmpVoltageNoiseVHz;
    const resistiveCurrentDensity = tia.opAmpVoltageNoiseVHz / tia.feedbackResistanceOhm;
    const lowPass = 1 / Math.sqrt(1 + (frequencyHz / tia.enbwHz) ** 8);
    return Math.hypot(capacitiveCurrentDensity, resistiveCurrentDensity) * lowPass;
  }
  for (let i = 1; i < points; i += 1) {
    const ratio = i / (points - 1);
    const frequency = fMin * (fMax / fMin) ** ratio;
    const density = voltageNoiseDensityAt(frequency);
    variance += (frequency - previousF) * (density ** 2 + previousDensity ** 2) * 0.5;
    previousF = frequency;
    previousDensity = density;
  }
  return Math.sqrt(variance);
}

export interface NoiseInputs {
  signalPrimaryA: number;
  backgroundPrimaryA: number;
  bulkDarkPrimaryA: number;
  surfaceDarkOutputA: number;
  excessFactor: number;
  apd: APDParameters;
  tia: TIAParameters;
}

export function noiseBreakdown(input: NoiseInputs): NoiseBreakdown {
  const { apd, tia } = input;
  const b = tia.enbwHz;
  const signalShotA = shotNoiseRms(input.signalPrimaryA, apd.gain, input.excessFactor, b);
  const backgroundShotA = shotNoiseRms(input.backgroundPrimaryA, apd.gain, input.excessFactor, b);
  const bulkDarkShotA = shotNoiseRms(input.bulkDarkPrimaryA, apd.gain, input.excessFactor, b);
  const surfaceDarkShotA = surfaceShotNoiseRms(input.surfaceDarkOutputA, b);
  const apdLoadThermalA = resistorThermalNoiseRms(
    apd.loadResistanceOhm,
    apd.temperatureK,
    b,
  );
  const feedbackThermalA = resistorThermalNoiseRms(tia.feedbackResistanceOhm, apd.temperatureK, b);
  const opAmpCurrentA = tia.opAmpCurrentNoiseAHz * Math.sqrt(b);
  const opAmpVoltageA = integratedVoltageNoiseRms(apd, tia);
  const biasA = tia.biasNoiseA;
  const adcLsbV = tia.adcFullScaleV / 2 ** tia.adcBits;
  const adcA = adcLsbV / Math.sqrt(12) / tia.feedbackResistanceOhm;
  const otherA = tia.otherNoiseA;
  const totalA = Math.hypot(
    signalShotA,
    backgroundShotA,
    bulkDarkShotA,
    surfaceDarkShotA,
    apd.includeLoadThermalNoise ? apdLoadThermalA : 0,
    feedbackThermalA,
    opAmpCurrentA,
    opAmpVoltageA,
    biasA,
    adcA,
    otherA,
  );
  return {
    signalShotA,
    backgroundShotA,
    bulkDarkShotA,
    surfaceDarkShotA,
    apdLoadThermalA,
    feedbackThermalA,
    opAmpCurrentA,
    opAmpVoltageA,
    biasA,
    adcA,
    otherA,
    totalA,
  };
}
