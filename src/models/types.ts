export type SourceType = 'LED' | '激光器' | '自定义';
export type AngularModel = '定向辐射强度' | '朗伯体' | '高斯角分布';
export type AttenuationMode = 'transmission' | 'dbPerKm';
export type ExcessNoiseMode = 'exponent' | 'mcintyre' | 'direct';
export type DarkCurrentMode =
  | 'preMultiplication'
  | 'measuredAtGain'
  | 'separate'
  | 'conservative'
  | 'advanced';
export type BackgroundMode = 'direct' | 'radiance' | 'spectrum';
export type VoltageNoiseMode = 'simple' | 'integrated';

export interface SourceParameters {
  name: string;
  type: SourceType;
  wavelengthM: number;
  spectralFwhmM: number;
  radiantIntensityWsr: number;
  totalPowerW: number;
  useTotalPower: boolean;
  divergenceRad: number;
  angularModel: AngularModel;
  angularFactor: number;
  modulationFrequencyHz: number;
  modulationDepth: number;
  dutyCycle: number;
  powerFluctuation: number;
}

export interface PropagationParameters {
  distanceM: number;
  sourceHeightM: number;
  detectorHeightM: number;
  autoSlantRange: boolean;
  attenuationMode: AttenuationMode;
  atmosphericTransmission: number;
  attenuationDbPerKm: number;
  weather: string;
  temperatureK: number;
  pointingEfficiency: number;
  jitterEfficiency: number;
  turbulenceEfficiency: number;
  otherLossDb: number;
}

export interface OpticsParameters {
  apertureDiameterM: number;
  obscurationRatio: number;
  lensTransmission: number;
  filterTransmission: number;
  spectralEfficiency: number;
  couplingEfficiency: number;
  alignmentEfficiency: number;
  focalLengthM: number;
  detectorDiameterM: number;
  fovRad: number;
  autoFov: boolean;
  filterCenterM: number;
  filterFwhmM: number;
  fineSpectrum: boolean;
}

export interface APDParameters {
  model: string;
  material: 'Si' | 'InGaAs' | '自定义';
  activeDiameterM: number;
  responsivityAW: number;
  gain: number;
  excessNoiseMode: ExcessNoiseMode;
  excessNoiseExponent: number;
  ionizationRatio: number;
  directExcessNoiseFactor: number;
  darkCurrentMode: DarkCurrentMode;
  darkCurrentA: number;
  maxDarkCurrentA: number;
  bulkDarkCurrentA: number;
  surfaceDarkCurrentA: number;
  junctionCapacitanceF: number;
  temperatureK: number;
  breakdownVoltageV: number;
  biasVoltageV: number;
  maxOutputCurrentA: number;
  loadResistanceOhm: number;
  includeLoadThermalNoise: boolean;
}

export interface BackgroundParameters {
  mode: BackgroundMode;
  directPowerW: number;
  spectralRadianceWm2SrM: number;
  solidAngleSr: number;
  bandwidthM: number;
  opticalTransmission: number;
}

export interface TIAParameters {
  feedbackResistanceOhm: number;
  feedbackCapacitanceF: number;
  opAmpCurrentNoiseAHz: number;
  opAmpVoltageNoiseVHz: number;
  opAmpInputCapacitanceF: number;
  pcbCapacitanceF: number;
  voltageNoiseMode: VoltageNoiseMode;
  biasNoiseA: number;
  otherNoiseA: number;
  enbwHz: number;
  postGain: number;
  postNoiseV: number;
  maxOutputV: number;
  adcFullScaleV: number;
  adcBits: number;
  adcSampleRateHz: number;
}

export interface CustomParameter {
  id: string;
  name: string;
  symbol: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  category: '光源' | '传播' | '光学' | 'APD' | '背景光' | '电子学';
}

export interface SimulationParameters {
  source: SourceParameters;
  propagation: PropagationParameters;
  optics: OpticsParameters;
  apd: APDParameters;
  background: BackgroundParameters;
  tia: TIAParameters;
  customParameters: CustomParameter[];
}

export interface NoiseBreakdown {
  signalShotA: number;
  backgroundShotA: number;
  bulkDarkShotA: number;
  surfaceDarkShotA: number;
  apdLoadThermalA: number;
  feedbackThermalA: number;
  opAmpCurrentA: number;
  opAmpVoltageA: number;
  biasA: number;
  adcA: number;
  otherA: number;
  totalA: number;
}

export interface LinkEfficiencyBudget {
  atmosphere: number;
  pointing: number;
  jitter: number;
  turbulence: number;
  otherPropagation: number;
  lens: number;
  filter: number;
  spectral: number;
  coupling: number;
  alignment: number;
}

export interface APDThermalNoiseResult {
  currentMeanSquareA2: number;
  currentDensityAHz: number;
  currentRmsA: number;
  voltageDensityVHz: number;
  voltageRmsV: number;
  shotAndThermalRmsA: number;
  includedInSystemTotal: boolean;
}

export interface SimulationResult {
  distanceM: number;
  effectiveAreaM2: number;
  fovSolidAngleSr: number;
  freeSpaceCapturePowerW: number;
  lensPowerW: number;
  afterAtmosphereW: number;
  afterLensW: number;
  afterFilterW: number;
  signalPowerW: number;
  backgroundPowerW: number;
  atmosphericTransmission: number;
  propagationEfficiency: number;
  receiverOpticalEfficiency: number;
  totalOpticalEfficiency: number;
  efficiencyBudget: LinkEfficiencyBudget;
  reconciliationErrorW: number;
  reconciliationErrorFraction: number;
  linkLossDb: number;
  responsivityAW: number;
  primaryCurrentA: number;
  signalCurrentA: number;
  backgroundPrimaryCurrentA: number;
  backgroundCurrentA: number;
  darkOutputCurrentA: number;
  meanOutputCurrentA: number;
  excessNoiseFactor: number;
  apdThermalNoise: APDThermalNoiseResult;
  noises: NoiseBreakdown;
  snr: number;
  modulatedSnr: number;
  snrDb: number;
  tiaSignalV: number;
  tiaNoiseV: number;
  tiaDcV: number;
  postSignalV: number;
  postNoiseV: number;
  peakOutputV: number;
  outputHeadroomV: number;
  adcCode: number;
  adcLsbV: number;
  saturated: boolean;
  detectionLabel: string;
}

export type SweepKey =
  | 'distanceM'
  | 'radiantIntensityWsr'
  | 'apertureDiameterM'
  | 'atmosphericTransmission'
  | 'responsivityAW'
  | 'gain'
  | 'darkCurrentA'
  | 'directPowerW'
  | 'enbwHz'
  | 'feedbackResistanceOhm'
  | 'modulationDepth';

export interface SweepPoint {
  x: number;
  result: SimulationResult;
}

export interface MultiLink {
  id: string;
  sourceName: string;
  detectorName: string;
  distanceM: number;
  radiantIntensityWsr: number;
  transmission: number;
  enabled: boolean;
}
