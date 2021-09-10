type OneOrOther<U, V> = {
  [K in keyof U]?: U[K];
} &
  {
    [K in keyof V]?: V[K];
  } &
  {
    [K in keyof (U | V)]: U[K] | V[K];
  };

export type StylableElement = OneOrOther<HTMLElement, SVGElement>;
export type MoveFunction = (
  movableElements: StylableElement[]
) => (() => void) | undefined;
export type EnterFunction = (
  enteringElements: StylableElement[]
) => (() => void) | undefined;
export type ExitFunction = (
  exitingElements: StylableElement[],
  removeElements: () => void
) => (() => void) | undefined;
