declare module 'vitest' {
  export type MockedFunction<T extends (...args: any[]) => any> = T & {
    mock: { calls: any[] };
    mockImplementation: (...args: any[]) => any;
    mockResolvedValue: (...args: any[]) => any;
    mockRejectedValue: (...args: any[]) => any;
    mockReturnValue: (...args: any[]) => any;
    mockReset: () => void;
    mockRestore: () => void;
  };

  export const vi: {
    fn: (...args: any[]) => any;
    mock: (...args: any[]) => any;
    mocked: <T>(item: T) => T;
    mockResolvedValue?: (...args: any[]) => any;
    clearAllMocks: () => void;
    restoreAllMocks: () => void;
    resetModules: () => void;
    spyOn: (object: any, key: string) => MockedFunction<any>;
    importActual: <T>(id: string) => Promise<T>;
    stubEnv: (name: string, value: string | undefined) => void;
    unstubAllEnvs: () => void;
    hoisted: <T>(factory: () => T) => T;
  };

  export const describe: (name: string, fn: () => any) => void;
  export const it: (name: string, fn: () => any) => void;
  export const beforeEach: (fn: () => any) => void;
  export const afterEach: (fn: () => any) => void;

  export interface Expect {
    (value: any): any;
    objectContaining: (value: any) => any;
    stringContaining: (value: string) => any;
  }

  export const expect: Expect;
}
