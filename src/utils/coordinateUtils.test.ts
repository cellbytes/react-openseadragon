import { expect, describe, test } from 'vitest';

import { toRect } from './coordinateUtils';

describe('toRect', () => {
  test('returns an OpenSeadragon.Rect with correct x, y, width, height values', () => {
    const result = toRect({ x: 10, y: 20, width: 30, height: 40 });
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
    expect(result.width).toBe(30);
    expect(result.height).toBe(40);
  });

  test('works with an object that has extra fields beyond Rectable', () => {
    const input = { x: 1, y: 2, width: 3, height: 4, extra: 'ignored', another: 99 };
    const result = toRect(input);
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
    expect(result.width).toBe(3);
    expect(result.height).toBe(4);
  });
});
