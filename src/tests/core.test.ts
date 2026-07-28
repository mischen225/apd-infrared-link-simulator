import { describe, expect, it } from 'vitest';
import { cloneDefaults } from '../data/defaults';
import { excessNoiseFactor, multipliedCurrent, primaryPhotocurrent } from '../calculations/apd';
import { effectiveArea, lensEntrancePower } from '../calculations/opticalLink';
import { shotNoiseRms } from '../calculations/noise';
import { simulate } from '../calculations/simulate';
import { defaultBatch, simulateMultiLinks } from '../calculations/sweep';
import { formatEngineering } from '../utils/format';
import { safeParseConfiguration } from '../utils/validation';

describe('光学链路纯函数', () => {
  it('光功率按距离平方反比变化', () => {
    const p = cloneDefaults();
    const area = effectiveArea(p.optics.apertureDiameterM, 0);
    const p1 = lensEntrancePower(p.source, area, 1000);
    const p2 = lensEntrancePower(p.source, area, 2000);
    expect(p1 / p2).toBeCloseTo(4, 10);
  });

  it('光功率与辐射强度成正比', () => {
    const p = cloneDefaults();
    const area = effectiveArea(p.optics.apertureDiameterM, 0);
    const p1 = lensEntrancePower(p.source, area, 1000);
    p.source.radiantIntensityWsr *= 3;
    const p2 = lensEntrancePower(p.source, area, 1000);
    expect(p2 / p1).toBeCloseTo(3, 10);
  });

  it('光功率与透镜面积成正比', () => {
    const p = cloneDefaults();
    const p1 = lensEntrancePower(p.source, 1e-4, 1000);
    const p2 = lensEntrancePower(p.source, 2e-4, 1000);
    expect(p2 / p1).toBeCloseTo(2, 10);
  });
});

describe('APD与噪声', () => {
  it('初级光电流等于响应度乘以光功率', () => {
    expect(primaryPhotocurrent(0.5, 20e-12)).toBeCloseTo(10e-12, 20);
  });

  it('APD输出电流正确乘以增益', () => {
    expect(multipliedCurrent(10e-12, 100)).toBeCloseTo(1e-9, 20);
  });

  it('指数与McIntyre过剩噪声因子计算正确', () => {
    const p = cloneDefaults();
    expect(excessNoiseFactor(p.apd)).toBeCloseTo(100 ** 0.3, 10);
    p.apd.excessNoiseMode = 'mcintyre';
    expect(excessNoiseFactor(p.apd)).toBeCloseTo(0.02 * 100 + 0.98 * (2 - 0.01), 10);
  });

  it('RMS散粒噪声随带宽平方根变化', () => {
    const n1 = shotNoiseRms(1e-12, 100, 4, 100);
    const n2 = shotNoiseRms(1e-12, 100, 4, 400);
    expect(n2 / n1).toBeCloseTo(2, 10);
  });

  it('背景光增加时散粒噪声增加', () => {
    const p = cloneDefaults();
    const low = simulate(p);
    p.background.directPowerW *= 100;
    const high = simulate(p);
    expect(high.noises.backgroundShotA).toBeGreaterThan(low.noises.backgroundShotA);
  });

  it('300 Hz ENBW直接使用300 Hz', () => {
    const p = cloneDefaults();
    p.tia.enbwHz = 300;
    const result = simulate(p);
    const expected = shotNoiseRms(result.primaryCurrentA, p.apd.gain, result.excessNoiseFactor, 300);
    expect(result.noises.signalShotA).toBeCloseTo(expected, 16);
  });
});

describe('系统行为', () => {
  it('调制SNR随调制深度线性变化', () => {
    const p = cloneDefaults();
    p.source.modulationDepth = 1;
    const full = simulate(p);
    p.source.modulationDepth = 0.25;
    const quarter = simulate(p);
    expect(quarter.modulatedSnr / full.modulatedSnr).toBeCloseTo(0.25, 10);
  });

  it('典型暗电流和最大暗电流模式结果不同', () => {
    const p = cloneDefaults();
    const typical = simulate(p, p.apd.darkCurrentA);
    const maximum = simulate(p, p.apd.maxDarkCurrentA);
    expect(maximum.snr).not.toBeCloseTo(typical.snr, 8);
  });

  it('单位格式切换不改变实际输入值', () => {
    const value = 12.3e-12;
    expect(formatEngineering(value, 'W')).toBe('12.3 pW');
    expect(value).toBe(12.3e-12);
  });

  it('JSON非法值被拒绝且不抛出异常', () => {
    expect(safeParseConfiguration('{oops').valid).toBe(false);
    const p = cloneDefaults();
    p.propagation.distanceM = -1;
    expect(safeParseConfiguration(JSON.stringify(p)).valid).toBe(false);
  });

  it('3、4、5 km与1、2、5 W/sr生成完整9组结果', () => {
    expect(defaultBatch(cloneDefaults())).toHaveLength(9);
  });

  it('多光源非相干功率叠加正确', () => {
    const p = cloneDefaults();
    const links = [
      { id: '1', sourceName: 'A', detectorName: 'D', distanceM: 5000, radiantIntensityWsr: 1, transmission: 0.9, enabled: true },
      { id: '2', sourceName: 'B', detectorName: 'D', distanceM: 5000, radiantIntensityWsr: 1, transmission: 0.9, enabled: true },
    ];
    const multi = simulateMultiLinks(p, links);
    expect(multi.totalPowerW).toBeCloseTo(multi.rows[0].result.signalPowerW * 2, 20);
  });

  it('后级理想增益不会提高输入SNR', () => {
    const p = cloneDefaults();
    p.tia.postNoiseV = 0;
    p.tia.postGain = 1;
    const a = simulate(p);
    p.tia.postGain = 20;
    const b = simulate(p);
    expect(b.postSignalV / b.postNoiseV).toBeCloseTo(a.postSignalV / a.postNoiseV, 10);
  });

  it('TIA饱和判断正确', () => {
    const p = cloneDefaults();
    p.tia.maxOutputV = 1e-9;
    expect(simulate(p).saturated).toBe(true);
  });
});
