export type StylableElement = Element & ElementCSSInlineStyle;
export type KeyframeType = Keyframe[] | PropertyIndexedKeyframes;
export type MovedElement = [el: StylableElement, x: number, y: number];
export type MoveIntegration = (allElements: StylableElement[]) => void;
export interface EnterIntegration {
  (enteringElements: StylableElement[]): void;
  initial?: InitialIntegration;
}
export type ExitIntegration = (
  exitingElements: StylableElement[],
  removeElements: (exitingElement?: StylableElement) => void
) => void;
export type InitialIntegration = (initialElements: StylableElement[]) => void;
