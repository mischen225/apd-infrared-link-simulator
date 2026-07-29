import type { BackgroundParameters, OpticsParameters, PropagationParameters, SourceParameters } from '../models/types';

export function effectiveDistance(propagation: PropagationParameters): number {
  if (!propagation.autoSlantRange) return propagation.distanceM;
  const dh = propagation.detectorHeightM - propagation.sourceHeightM;
  return Math.hypot(propagation.distanceM, dh);
}

export function effectiveArea(apertureDiameterM: number, obscurationRatio: number): number {
  return (Math.PI * apertureDiameterM ** 2 * (1 - obscurationRatio)) / 4;
}

export function atmosphericTransmission(propagation: PropagationParameters, distanceM: number): number {
  if (propagation.attenuationMode === 'transmission') {
    return propagation.atmosphericTransmission;
  }
  return 10 ** (-(propagation.attenuationDbPerKm * (distanceM / 1000)) / 10);
}

export function fovSolidAngle(optics: OpticsParameters): number {
  const fov = optics.autoFov
    ? 2 * Math.atan(optics.detectorDiameterM / (2 * optics.focalLengthM))
    : optics.fovRad;
  return Math.PI * (fov / 2) ** 2;
}

export function freeSpaceCapturePower(source: SourceParameters, areaM2: number, distanceM: number): number {
  const angularIntensity = source.useTotalPower
    ? source.totalPowerW / Math.max(2 * Math.PI * (1 - Math.cos(source.divergenceRad / 2)), Number.EPSILON)
    : source.radiantIntensityWsr;
  return (angularIntensity * source.angularFactor * areaM2) / distanceM ** 2;
}

/** @deprecated Use freeSpaceCapturePower; this value does not yet include propagation loss. */
export const lensEntrancePower = freeSpaceCapturePower;

export function propagationEfficiency(
  propagation: PropagationParameters,
  atmosphere: number,
): number {
  return (
    atmosphere *
    propagation.pointingEfficiency *
    propagation.jitterEfficiency *
    propagation.turbulenceEfficiency *
    10 ** (-propagation.otherLossDb / 10)
  );
}

export function receiverOpticalEfficiency(optics: OpticsParameters): number {
  return (
    optics.lensTransmission *
    optics.filterTransmission *
    optics.spectralEfficiency *
    optics.couplingEfficiency *
    optics.alignmentEfficiency
  );
}

export function totalOpticalEfficiency(
  propagation: PropagationParameters,
  optics: OpticsParameters,
  atmosphere: number,
): number {
  return propagationEfficiency(propagation, atmosphere) * receiverOpticalEfficiency(optics);
}

export function backgroundPower(
  background: BackgroundParameters,
  areaM2: number,
  solidAngleSr: number,
): number {
  if (background.mode === 'direct') return background.directPowerW;
  return (
    background.spectralRadianceWm2SrM *
    areaM2 *
    (background.solidAngleSr || solidAngleSr) *
    background.bandwidthM *
    background.opticalTransmission
  );
}
