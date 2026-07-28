import type { APDParameters, DarkCurrentMode } from '../models/types';

export function excessNoiseFactor(apd: APDParameters): number {
  if (apd.excessNoiseMode === 'direct') return apd.directExcessNoiseFactor;
  if (apd.excessNoiseMode === 'mcintyre') {
    const { gain: m, ionizationRatio: k } = apd;
    return k * m + (1 - k) * (2 - 1 / m);
  }
  return apd.gain ** apd.excessNoiseExponent;
}

export function primaryPhotocurrent(responsivityAW: number, powerW: number): number {
  return responsivityAW * powerW;
}

export function multipliedCurrent(primaryCurrentA: number, gain: number): number {
  return primaryCurrentA * gain;
}

export interface ResolvedDarkCurrent {
  bulkPreA: number;
  surfaceOutputA: number;
  outputA: number;
  definition: string;
}

export function resolveDarkCurrent(
  apd: APDParameters,
  overrideA?: number,
  modeOverride?: DarkCurrentMode,
): ResolvedDarkCurrent {
  const mode = modeOverride ?? apd.darkCurrentMode;
  const input = overrideA ?? apd.darkCurrentA;
  switch (mode) {
    case 'measuredAtGain':
      return {
        bulkPreA: input / apd.gain,
        surfaceOutputA: 0,
        outputA: input,
        definition: '总暗电流为增益 M 下实测输出值，不再重复乘以 M',
      };
    case 'separate':
    case 'advanced':
      {
        const baseTotal = apd.bulkDarkCurrentA + apd.surfaceDarkCurrentA;
        const scale = overrideA === undefined || baseTotal <= 0 ? 1 : overrideA / baseTotal;
        const bulkPreA = apd.bulkDarkCurrentA * scale;
        const surfaceOutputA = apd.surfaceDarkCurrentA * scale;
      return {
        bulkPreA,
        surfaceOutputA,
        outputA: bulkPreA * apd.gain + surfaceOutputA,
        definition: '高级模式：体暗电流倍增，表面暗电流不倍增',
      };
      }
    case 'conservative':
      return {
        bulkPreA: input,
        surfaceOutputA: 0,
        outputA: input * apd.gain,
        definition: '保守模式：输入暗电流全部视为倍增前电流',
      };
    default:
      return {
        bulkPreA: input,
        surfaceOutputA: 0,
        outputA: input * apd.gain,
        definition: '输入值为倍增前体暗电流',
      };
  }
}
