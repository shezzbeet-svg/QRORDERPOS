'use client';
import { useMemo } from 'react';

function createPattern(value: string, size = 29) {
  let h = 2166136261 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let seed = h >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const grid: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const setFinder = (x: number, y: number) => {
    for (let row = y; row < y + 7; row += 1) {
      for (let col = x; col < x + 7; col += 1) {
        const border = row === y || row === y + 6 || col === x || col === x + 6;
        const center = row >= y + 2 && row <= y + 4 && col >= x + 2 && col <= x + 4;
        grid[row][col] = border || center;
      }
    }
  };
  setFinder(0, 0);
  setFinder(size - 7, 0);
  setFinder(0, size - 7);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid[row][col]) continue;
      grid[row][col] = rand() > 0.5;
    }
  }
  return grid;
}

export function QrBadge({ value, size = 128 }: { value: string; size?: number }) {
  const pattern = useMemo(() => createPattern(value), [value]);
  const cellSize = size / pattern.length;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`QR token ${value}`}
    >
      <rect width={size} height={size} fill="#fff" />
      {pattern.map((row, rowIndex) =>
        row.map((filled, colIndex) =>
          filled ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cellSize}
              y={rowIndex * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#111827"
            />
          ) : null
        )
      )}
    </svg>
  );
}
