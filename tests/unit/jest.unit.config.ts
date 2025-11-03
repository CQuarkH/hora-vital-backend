import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  rootDir: "../../",
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/unit"],
  testMatch: ["**/*.unit.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage-unit",
  testTimeout: 30000,
  setupFilesAfterEnv: ["<rootDir>/tests/unit/setup-after-env.ts"],
  verbose: true,
};

export default config;
