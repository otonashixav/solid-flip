export type StylableElement = Element & ElementCSSInlineStyle;
export type KeyframeType = Keyframe[] | PropertyIndexedKeyframes;
export type MovedElement = [el: StylableElement, x: number, y: number];
export type MoveIntegration = (allElements: StylableElement[]) => void;
export type ExitIntegration = (
  exitingElements: StylableElement[],
  finish: (elements: StylableElement[]) => void
) => void;
export type EnterIntegration = (
  enteringElements: StylableElement[],
  finish?: ((elements: StylableElement[]) => void) | undefined
) => void;
