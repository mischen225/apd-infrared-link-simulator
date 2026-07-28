import type { SimulationParameters, SimulationResult } from '../models/types';
import { excessNoiseFactor, multipliedCurrent, primaryPhotocurrent, resolveDarkCurrent } from './apd';
import {
  atmosphericTransmission,
  backgroundPower,
  effectiveArea,
  effectiveDistance,
  fovSolidAngle,
  lensEntrancePower,
  totalOpticalEfficiency,
} from './opticalLink';
import { noiseBreakdown } from './noise';
import { spectralCurves } from './spectralIntegration';

export function detectionLabel(snr: number): string {
  if (snr < 1) return '不可检测';
  if (snr < 3) return '极不稳定';
  if (snr < 5) return '勉强检测';
  if (snr < 10) return '可以检测';
  if (snr < 20) return '可靠检测';
  return '高可靠检测';
}

export function simulate(parameters: SimulationParameters, darkOverrideA?: number): SimulationResult {
  const { source, propagation, optics, apd, background, tia } = parameters;
  const distanceM = effectiveDistance(propagation);
  const effectiveAreaM2 = effectiveArea(optics.apertureDiameterM, optics.obscurationRatio);
  const fovSolidAngleSr = fovSolidAngle(optics);
  const lensPowerW = lensEntrancePower(source, effectiveAreaM2, distanceM);
  const atmosphere = atmosphericTransmission(propagation, distanceM);
  const afterAtmosphereW = lensPowerW * atmosphere;
  const afterFilterW = afterAtmosphereW * optics.lensTransmission * optics.filterTransmission;
  const totalEfficiency = totalOpticalEfficiency(propagation, optics, atmosphere);
  const signalPowerW = lensPowerW * totalEfficiency;
  const backgroundPowerW = backgroundPower(background, effectiveAreaM2, fovSolidAngleSr);
  const spectral = spectralCurves(
    source.wavelengthM,
    source.spectralFwhmM,
    optics.filterCenterM,
    optics.filterFwhmM,
    optics.filterTransmission,
    apd.responsivityAW,
  );
  const responsivityAW = optics.fineSpectrum ? spectral.effectiveResponsivityAW : apd.responsivityAW;
  const primaryCurrentA = primaryPhotocurrent(responsivityAW, signalPowerW);
  const signalCurrentA = multipliedCurrent(primaryCurrentA, apd.gain);
  const backgroundPrimaryCurrentA = primaryPhotocurrent(responsivityAW, backgroundPowerW);
  const backgroundCurrentA = multipliedCurrent(backgroundPrimaryCurrentA, apd.gain);
  const dark = resolveDarkCurrent(apd, darkOverrideA);
  const excess = excessNoiseFactor(apd);
  const noises = noiseBreakdown({
    signalPrimaryA: primaryCurrentA,
    backgroundPrimaryA: backgroundPrimaryCurrentA,
    bulkDarkPrimaryA: dark.bulkPreA,
    surfaceDarkOutputA: dark.surfaceOutputA,
    excessFactor: excess,
    apd,
    tia,
  });
  const snr = signalCurrentA / noises.totalA;
  const modulatedSnr = (source.modulationDepth * signalCurrentA) / noises.totalA;
  const snrDb = 20 * Math.log10(Math.max(modulatedSnr, Number.MIN_VALUE));
  const tiaSignalV = signalCurrentA * tia.feedbackResistanceOhm;
  const tiaNoiseV = noises.totalA * tia.feedbackResistanceOhm;
  const tiaDcV = (backgroundCurrentA + dark.outputA) * tia.feedbackResistanceOhm;
  const postSignalV = tiaSignalV * tia.postGain;
  const postNoiseV = Math.hypot(tiaNoiseV * tia.postGain, tia.postNoiseV);
  const peakOutputV = Math.abs(tiaDcV) + Math.abs(postSignalV);
  const saturated =
    peakOutputV >= tia.maxOutputV ||
    backgroundCurrentA + dark.outputA + signalCurrentA >= apd.maxOutputCurrentA;
  const adcLsbV = tia.adcFullScaleV / 2 ** tia.adcBits;
  const adcCode = Math.min(2 ** tia.adcBits - 1, Math.round(Math.abs(postSignalV) / adcLsbV));

  return {
    distanceM,
    effectiveAreaM2,
    fovSolidAngleSr,
    lensPowerW,
    afterAtmosphereW,
    afterFilterW,
    signalPowerW,
    backgroundPowerW,
    atmosphericTransmission: atmosphere,
    totalOpticalEfficiency: totalEfficiency,
    linkLossDb: -10 * Math.log10(Math.max(totalEfficiency, Number.MIN_VALUE)),
    responsivityAW,
    primaryCurrentA,
    signalCurrentA,
    backgroundPrimaryCurrentA,
    backgroundCurrentA,
    darkOutputCurrentA: dark.outputA,
    meanOutputCurrentA: signalCurrentA + backgroundCurrentA + dark.outputA,
    excessNoiseFactor: excess,
    noises,
    snr,
    modulatedSnr,
    snrDb,
    tiaSignalV,
    tiaNoiseV,
    tiaDcV,
    postSignalV,
    postNoiseV,
    peakOutputV,
    outputHeadroomV: tia.maxOutputV - peakOutputV,
    adcCode,
    adcLsbV,
    saturated,
    detectionLabel: detectionLabel(modulatedSnr),
  };
}
