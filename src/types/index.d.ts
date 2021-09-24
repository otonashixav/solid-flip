type StylableElement = SVGElement | HTMLElement;

type KeyframeType = Keyframe[] | PropertyIndexedKeyframes;

type MovedElement = [el: StylableElement, x: number, y: number];
type MoveIntegration = (allElements: StylableElement[]) => void;
type EnterIntegration = (enteringElements: StylableElement[]) => void;
type ExitIntegration = (
  exitingElements: StylableElement[],
  removeElements: (exitingElement?: StylableElement) => void
) => void;
