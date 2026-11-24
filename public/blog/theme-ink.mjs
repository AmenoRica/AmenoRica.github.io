// Compatibility entry point for older cached blog scripts.
import { inkFrames as makeFrames } from '../theme-ink.mjs';

export function inkFrames(width, height) {
  return makeFrames(width, height, 16);
}
