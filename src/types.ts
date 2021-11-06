export type KeyframeType = Keyframe[] | PropertyIndexedKeyframes;
export type MovedElement = [el: HTMLElement | SVGElement, x: number, y: number];
export type MoveIntegration = (
  allElements: (HTMLElement | SVGElement)[]
) => void;
export type ExitIntegration = (
  exitingElements: (HTMLElement | SVGElement)[],
  finish: (elements: (HTMLElement | SVGElement)[]) => void
) => void;
export type EnterIntegration = (
  enteringElements: (HTMLElement | SVGElement)[],
  finish?: ((elements: (HTMLElement | SVGElement)[]) => void) | undefined
) => void;
