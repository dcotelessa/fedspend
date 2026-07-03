import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Provide minimal canvas implementation for jsdom
const getContext = function() {
  return {
    canvas: {},
    fillText: jest.fn(),
    measureText: jest.fn().mockReturnValue({ width: 10 }),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    beginPath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    clearRect: jest.fn(),
    createLinearGradient: jest.fn(),
    addColorStop: jest.fn(),
  };
};

// Install canvas globally - always replace
const globalObj = global as any;
globalObj.HTMLCanvasElement = class HTMLCanvasElementMock {
  constructor() {
    this.getContext = getContext;
  }
};

globalObj.ResizeObserver = class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
};
