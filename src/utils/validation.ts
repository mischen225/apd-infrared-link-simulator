import type { SimulationParameters } from '../models/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  value?: SimulationParameters;
}

export function validateParameters(value: unknown): ValidationResult {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return { valid: false, errors: ['配置必须是 JSON 对象'] };
  const p = value as Partial<SimulationParameters>;
  const positive = (candidate: unknown, label: string) => {
    if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate <= 0) {
      errors.push(`${label}必须是大于 0 的有限数值`);
    }
  };
  positive(p.propagation?.distanceM, '传播距离');
  positive(p.optics?.apertureDiameterM, '透镜口径');
  positive(p.tia?.enbwHz, '等效噪声带宽');
  positive(p.apd?.gain, 'APD 增益');
  if (
    typeof p.propagation?.atmosphericTransmission !== 'number' ||
    p.propagation.atmosphericTransmission < 0 ||
    p.propagation.atmosphericTransmission > 1
  ) {
    errors.push('大气透过率必须位于 0～1');
  }
  return { valid: errors.length === 0, errors, value: errors.length === 0 ? (p as SimulationParameters) : undefined };
}

export function safeParseConfiguration(text: string): ValidationResult {
  try {
    return validateParameters(JSON.parse(text));
  } catch {
    return { valid: false, errors: ['JSON 格式错误，请检查逗号、引号和括号'] };
  }
}
