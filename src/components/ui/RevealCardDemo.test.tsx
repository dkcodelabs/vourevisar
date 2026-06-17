import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RevealCardDemo from './RevealCardDemo';

describe('RevealCardDemo', () => {
  it('shows the saved gradient palettes with names and hex values', () => {
    render(<RevealCardDemo />);

    [
      ['Signal Red', '#FF6B35 | #FF1840'],
      ['Indigo Night', '#0047AB | #1A1A2E'],
      ['Golden Rush', '#FFD700 | #FF9800'],
      ['Deep Forest', '#0D2818 | #1B4332'],
      ['Aurora', '#00FF87 | #60EFFF'],
      ['Deep Space', '#0A0A1A | #16213E'],
      ['Rose Quartz', '#FFB7C5 | #C5A3FF'],
      ['Emerald Depths', '#1B4332 | #004D40'],
      ['Lemon Fizz', '#FFF44F | #FFB74D'],
      ['Berry Dark', '#92000A | #4A0040'],
      ['Neon Pulse', '#A8FF00 | #00FFEF'],
      ['Obsidian', '#0A0A14 | #1C1C2E'],
    ].forEach(([name, colors]) => {
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText(colors)).toBeInTheDocument();
    });
  });
});
