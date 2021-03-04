import { getNextHue } from '../src';

test('colors', () => {
  const mathMock = Object.create(global.Math);
  mathMock.random = () => 0.1;
  const oldMath = global.Math;
  global.Math = mathMock;

  expect(getNextHue([])).toBe(36);
  expect(getNextHue([36])).toBe(216);
  expect(getNextHue([36, 216])).toBe(126);
  expect(getNextHue([36, 216, 126])).toBe(306);
  expect(getNextHue([36, 216, 126, 306])).toBe(81);

  global.Math = oldMath;
});
