const PREFIXES = [
  { scale: 1, symbol: '' },
  { scale: 1e-3, symbol: 'm' },
  { scale: 1e-6, symbol: 'μ' },
  { scale: 1e-9, symbol: 'n' },
  { scale: 1e-12, symbol: 'p' },
  { scale: 1e-15, symbol: 'f' },
];

export function formatEngineering(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return `— ${unit}`;
  const abs = Math.abs(value);
  const prefix =
    PREFIXES.find((item, index) => abs >= item.scale || index === PREFIXES.length - 1) ?? PREFIXES[0];
  const scaled = value / prefix.scale;
  const decimals = Math.max(0, digits - Math.floor(Math.log10(Math.max(Math.abs(scaled), 1))) - 1);
  return `${scaled.toFixed(decimals)} ${prefix.symbol}${unit}`;
}

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-3)) {
    return value.toExponential(digits);
  }
  return value.toLocaleString('zh-CN', { maximumFractionDigits: digits });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
