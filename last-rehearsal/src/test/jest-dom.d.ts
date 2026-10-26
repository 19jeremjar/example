// vitest 2 declares Assertion in @vitest/expect, so jest-dom's own
// augmentation of 'vitest' doesn't reach the global `expect`.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module '@vitest/expect' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
}
