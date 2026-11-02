declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react' {
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export type FC<P = {}> = (props: P) => any;
  export type ReactNode = any;
  const React: any;
  export default React;
}

declare namespace React {
  export type FC<P = {}> = (props: P) => any;
  export type ReactNode = any;
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const TextInput: any;
  export const TouchableOpacity: any;
  export const ScrollView: any;
  export const SafeAreaView: any;
  export const StatusBar: any;
  export const Modal: any;
  export const Alert: any;
  export const ActivityIndicator: any;
  export const Image: any;
  export const Dimensions: {
    get(dim: 'window' | 'screen'): { width: number; height: number; scale: number; fontScale: number };
  };
  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
  };
  export const Share: {
    share(content: { message: string; title?: string; url?: string }): Promise<any>;
  };
  export type LayoutChangeEvent = any;
}
