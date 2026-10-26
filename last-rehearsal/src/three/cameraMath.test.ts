import { clampToBounds, easeInOutCubic, fovForAspect } from './cameraMath';

describe('camera maths', () => {
  const bounds = { min: [-1, 0, -2] as [number, number, number], max: [1, 2, 2] as [number, number, number] };

  it('keeps the camera inside the room box', () => {
    expect(clampToBounds([5, -3, 0.5], bounds)).toEqual([1, 0, 0.5]);
    expect(clampToBounds([0.2, 1, -9], bounds)).toEqual([0.2, 1, -2]);
  });

  it('eases from 0 to 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });

  it('uses a wider lens on portrait screens', () => {
    expect(fovForAspect(0.46)).toBeGreaterThan(fovForAspect(1.78));
  });
});
