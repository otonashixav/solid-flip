export type KeyframeType = Keyframe[] | PropertyIndexedKeyframes;
export type MovedElement = [el: Element, x: number, y: number];
export type MoveIntegration = (allElements: Element[]) => void;
export type ExitIntegration = (
  exitingElements: Element[],
  finish: (elements: Element[]) => void
) => void;
export type EnterIntegration = (
  enteringElements: Element[],
  finish?: ((elements: Element[]) => void) | undefined
) => void;
