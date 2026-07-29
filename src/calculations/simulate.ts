import type { SimulationParameters, SimulationResult } from '../models/types';
import { excessNoiseFactor, multipliedCurrent, primaryPhotocurrent, resolveDarkCurrent } from './apd';
import {
  atmosphericTransmission,
  backgroundPower,
  effectiveArea,
  effectiveDistance,
  fovSolidAngle,
  freeSpaceCapturePower,
  propagationEfficiency,
  receiverOpticalEfficiency,
  totalOpticalEfficiency,
} from './opticalLink';
import {
  apdShotAndThermalNoiseRms,
  noiseBreakdown,
  resistorThermalNoiseCurrentDensity,
  resistorThermalNoiseCurrentMeanSquare,
  resistorThermalNoiseRms,
  resistorThermalNoiseVoltageDensity,
  resistorThermalNoiseVoltageRms,
} from './noise';
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
  const freeSpaceCapturePowerW = freeSpaceCapturePower(source, effectiveAreaM2, distanceM);
  const atmosphere = atmosphericTransmission(propagation, distanceM);
  const afterAtmosphereW = freeSpaceCapturePowerW * atmosphere;
  const propagationFactor = propagationEfficiency(propagation, atmosphere);
  // 工程口径：镜头入口功率已经包含自由空间几何扩散以及全部传播/大气损耗。
  const lensPowerW = freeSpaceCapturePowerW * propagationFactor;
  const afterLensW = lensPowerW * optics.lensTransmission;
  const afterFilterW = afterLensW * optics.filterTransmission;
  const receiverFactor = receiverOpticalEfficiency(optics);
  const totalEfficiency = totalOpticalEfficiency(propagation, optics, atmosphere);
  const signalPowerW = lensPowerW * receiverFactor;
  const reconciledSignalPowerW = freeSpaceCapturePowerW * totalEfficiency;
  const reconciliationErrorW = signalPowerW - reconciledSignalPowerW;
  const reconciliationErrorFraction =
    Math.abs(reconciliationErrorW) / Math.max(Math.abs(reconciledSignalPowerW), Number.EPSILON);
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
  const apdThermalCurrentMeanSquare = resistorThermalNoiseCurrentMeanSquare(
    apd.loadResistanceOhm,
    apd.temperatureK,
    tia.enbwHz,
  );
  const apdThermalNoise = {
    currentMeanSquareA2: apdThermalCurrentMeanSquare,
    currentDensityAHz: resistorThermalNoiseCurrentDensity(
      apd.loadResistanceOhm,
      apd.temperatureK,
    ),
    currentRmsA: resistorThermalNoiseRms(
      apd.loadResistanceOhm,
      apd.temperatureK,
      tia.enbwHz,
    ),
    voltageDensityVHz: resistorThermalNoiseVoltageDensity(
      apd.loadResistanceOhm,
      apd.temperatureK,
    ),
    voltageRmsV: resistorThermalNoiseVoltageRms(
      apd.loadResistanceOhm,
      apd.temperatureK,
      tia.enbwHz,
    ),
    shotAndThermalRmsA: apdShotAndThermalNoiseRms(
      primaryCurrentA,
      dark.bulkPreA,
      apd.gain,
      excess,
      tia.enbwHz,
      apd.loadResistanceOhm,
      apd.temperatureK,
    ),
    includedInSystemTotal: apd.includeLoadThermalNoise,
  };
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
    freeSpaceCapturePowerW,
    lensPowerW,
    afterAtmosphereW,
    afterLensW,
    afterFilterW,
    signalPowerW,
    backgroundPowerW,
    atmosphericTransmission: atmosphere,
    propagationEfficiency: propagationFactor,
    receiverOpticalEfficiency: receiverFactor,
    totalOpticalEfficiency: totalEfficiency,
    efficiencyBudget: {
      atmosphere,
      pointing: propagation.pointingEfficiency,
      jitter: propagation.jitterEfficiency,
      turbulence: propagation.turbulenceEfficiency,
      otherPropagation: 10 ** (-propagation.otherLossDb / 10),
      lens: optics.lensTransmission,
      filter: optics.filterTransmission,
      spectral: optics.spectralEfficiency,
      coupling: optics.couplingEfficiency,
      alignment: optics.alignmentEfficiency,
    },
    reconciliationErrorW,
    reconciliationErrorFraction,
    linkLossDb: -10 * Math.log10(Math.max(totalEfficiency, Number.MIN_VALUE)),
    responsivityAW,
    primaryCurrentA,
    signalCurrentA,
    backgroundPrimaryCurrentA,
    backgroundCurrentA,
    darkOutputCurrentA: dark.outputA,
    meanOutputCurrentA: signalCurrentA + backgroundCurrentA + dark.outputA,
    excessNoiseFactor: excess,
    apdThermalNoise,
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
