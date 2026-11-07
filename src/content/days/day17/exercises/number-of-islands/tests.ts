import { describe, it, expect } from 'vitest';
import { numIslands } from './solution';

const g = (...rows: string[]) => rows.map((row) => row.split(''));

describe('numIslands', () => {
  it('returns 0 for an empty grid', () => {
    expect(numIslands([])).toBe(0);
  });

  it('returns 0 when there is only water', () => {
    expect(numIslands(g('000', '000'))).toBe(0);
  });

  it('counts one big island', () => {
    expect(numIslands(g('11110', '11010', '11000', '00000'))).toBe(1);
  });

  it('counts separate islands', () => {
    expect(numIslands(g('11000', '11000', '00100', '00011'))).toBe(3);
  });

  it('does NOT connect diagonal neighbours', () => {
    expect(numIslands(g('101', '010', '101'))).toBe(5);
  });

  it('handles a single row and a single column', () => {
    expect(numIslands(g('1011101'))).toBe(3);
    expect(numIslands(g('1', '1', '0', '1'))).toBe(2);
  });

  it('follows winding islands (a U shape is one island)', () => {
    expect(numIslands(g('10001', '10001', '11111'))).toBe(1);
    expect(numIslands(g('111', '010', '111'))).toBe(1);
  });

  it('does not mutate the input grid', () => {
    const grid = g('110', '011', '001');
    const before = JSON.stringify(grid);
    expect(numIslands(grid)).toBe(1);
    expect(JSON.stringify(grid)).toBe(before);
    expect(numIslands(grid)).toBe(1); // calling twice gives the same answer
  });

  it('handles a 40×40 grid that is entirely land', () => {
    const grid = Array.from({ length: 40 }, () => Array<string>(40).fill('1'));
    expect(numIslands(grid)).toBe(1);
  });
});
