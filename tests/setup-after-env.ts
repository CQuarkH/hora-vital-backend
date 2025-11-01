import { jest } from "@jest/globals";

// Set NODE_ENV to test for proper test behavior
process.env.NODE_ENV = "test";

// Configuración de timeouts
jest.setTimeout(60000);

// Mock global para console (opcional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Mantener error para debugging
};
