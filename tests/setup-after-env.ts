import { jest } from '@jest/globals';

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