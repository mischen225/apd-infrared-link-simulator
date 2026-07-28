export interface SpectrumPoint {
  wavelengthM: number;
  value: number;
}

export function gaussian(wavelengthM: number, centerM: number, fwhmM: number): number {
  const sigma = fwhmM / (2 * Math.sqrt(2 * Math.log(2)));
  return Math.exp(-0.5 * ((wavelengthM - centerM) / sigma) ** 2);
}

export function trapezoidIntegral(points: SpectrumPoint[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    const width = points[i].wavelengthM - points[i - 1].wavelengthM;
    sum += width * (points[i].value + points[i - 1].value) * 0.5;
  }
  return sum;
}

export function spectralCurves(
  sourceCenterM: number,
  sourceFwhmM: number,
  filterCenterM: number,
  filterFwhmM: number,
  filterPeak: number,
  responsivityAW: number,
  points = 161,
) {
  const min = Math.min(sourceCenterM - 3 * sourceFwhmM, filterCenterM - 3 * filterFwhmM);
  const max = Math.max(sourceCenterM + 3 * sourceFwhmM, filterCenterM + 3 * filterFwhmM);
  const data = Array.from({ length: points }, (_, index) => {
    const wavelengthM = min + (index / (points - 1)) * (max - min);
    const source = gaussian(wavelengthM, sourceCenterM, sourceFwhmM);
    const filter = filterPeak * gaussian(wavelengthM, filterCenterM, filterFwhmM);
    const responsivity = responsivityAW * Math.max(0.25, 1 - Math.abs(wavelengthM - sourceCenterM) / (500e-9));
    return { wavelengthM, source, filter, responsivity, overlap: source * filter * responsivity };
  });
  const sourceIntegral = trapezoidIntegral(data.map((p) => ({ wavelengthM: p.wavelengthM, value: p.source })));
  const overlapIntegral = trapezoidIntegral(data.map((p) => ({ wavelengthM: p.wavelengthM, value: p.overlap })));
  return { data, effectiveResponsivityAW: overlapIntegral / sourceIntegral };
}
