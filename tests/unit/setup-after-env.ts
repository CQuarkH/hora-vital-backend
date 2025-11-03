
jest.setTimeout(30000);

afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});
