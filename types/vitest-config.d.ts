declare module 'vitest/config' {
  export function defineConfig<T = any>(config: T): T;
}
