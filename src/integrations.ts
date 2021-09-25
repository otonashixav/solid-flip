import {
  EnterIntegration,
  ExitIntegration,
  KeyframeType,
  MoveIntegration,
  StylableElement,
} from "./types";
import { detachEls, filterMovedEls } from "./utils";

function run(fn: () => void): void {
  fn();
}

const DEFAULT_OPTIONS: KeyframeAnimationOptions = {
  duration: 300,
  easing: "ease",
  fill: "backwards",
};

const DEFAULT_MOVE_GET_KEYFRAMES = (x: number, y: number): KeyframeType => ({
  transform: [`translate(${x}px,${y}px)`, "none"],
  composite: "add",
});

export function animateMove(
  animate:
    | ((el: StylableElement, x: number, y: number) => void)
    | {
        getKeyframes?: (x: number, y: number) => KeyframeType;
        options?: KeyframeAnimationOptions;
      } = {}
): MoveIntegration {
  if (typeof animate === "object") {
    const { getKeyframes = DEFAULT_MOVE_GET_KEYFRAMES, options } = animate;
    animate = (el, x, y) => {
      el.animate(getKeyframes(x, y), {
        ...DEFAULT_OPTIONS,
        ...options,
      });
    };
  }

  const animateEl = animate;
  return (els) => {
    filterMovedEls(els).then((movedEls) => {
      for (const [el, x, y] of movedEls) animateEl(el, x, y);
    });
  };
}

const DEFAULT_ENTER_KEYFRAMES: KeyframeType = {
  opacity: [0, 1],
};

export function animateEnter(
  animate:
    | ((el: StylableElement) => void)
    | { keyframes?: KeyframeType; options?: KeyframeAnimationOptions } = {}
): EnterIntegration {
  if (typeof animate === "object") {
    const { keyframes = DEFAULT_ENTER_KEYFRAMES, options } = animate;
    animate = (el) => {
      el.animate(keyframes, { ...DEFAULT_OPTIONS, id: "enter", ...options });
    };
  }

  const animateEl = animate;
  return (els) =>
    requestAnimationFrame(() => {
      for (const el of els) animateEl(el);
    });
}

const DEFAULT_EXIT_KEYFRAMES: KeyframeType = {
  opacity: [1, 0],
};

export function animateExit(
  animate:
    | ((el: StylableElement) => Promise<unknown>)
    | {
        keyframes?: KeyframeType;
        options?: KeyframeAnimationOptions;
      } = {},
  options: {
    absolute?: boolean;
    reverseEnter?: boolean;
    separate?: boolean;
  } = {}
): ExitIntegration {
  const { absolute, reverseEnter, separate = reverseEnter } = options;
  if (typeof animate === "object") {
    const { keyframes = DEFAULT_EXIT_KEYFRAMES, options } = animate;
    animate = (el) =>
      el.animate(keyframes, { ...DEFAULT_OPTIONS, ...options }).finished;
  }

  const animate_ = animate;
  const animateEl = (el: StylableElement) => {
    if (reverseEnter) {
      const enterAnimation = el
        .getAnimations()
        .find((anim) => anim.id === "enter");
      if (enterAnimation) {
        enterAnimation.reverse();
        return enterAnimation.finished;
      }
    }
    return animate_(el);
  };

  return (els, removeEls) => {
    if (absolute) detachEls(els);
    if (separate) {
      for (const el of els) animateEl(el).then(() => removeEls(el));
    } else {
      animateEl(els.shift() as StylableElement).then(() => removeEls());
      for (const el of els) animateEl(el);
    }
  };
}

function addClasses(els: StylableElement[], ...classes: string[]) {
  for (const el of els) el.classList.add(...classes);
}

function removeClasses(els: StylableElement[], ...classes: string[]) {
  for (const el of els) el.classList.remove(...classes);
}

function splitClasses(
  classes: {
    name?: string | undefined;
    from?: string | undefined;
    active?: string | undefined;
    to?: string | undefined;
  },
  integrationType: "enter" | "exit"
) {
  const split = (className?: string) => className?.split(" ") ?? [];
  const fromClasses = split(classes.from);
  const activeClasses = split(classes.active);
  const toClasses = split(classes.to);
  const name = classes.name;
  if (name) {
    fromClasses.unshift(`${name}-${integrationType}-from`);
    activeClasses.unshift(`${name}-${integrationType}-active`);
    toClasses.unshift(`${name}-${integrationType}-to`);
  }
  return { fromClasses, activeClasses, toClasses };
}

function cssIntegration(
  integrationType: "enter" | "exit",
  classes: {
    fromClasses: string[];
    activeClasses: string[];
    toClasses: string[];
  },
  options: {
    separate?: boolean;
    type?: "animationend" | "transitionend" | "both";
  }
): (
  els: StylableElement[],
  removeElements?: (el?: StylableElement) => void
) => void {
  const { fromClasses, activeClasses, toClasses } = classes;
  const { separate, type = "both" } = options;
  return (els, removeEls) => {
    addClasses(els, ...fromClasses, ...activeClasses);
    (integrationType === "enter" ? requestAnimationFrame : run)(() =>
      requestAnimationFrame(() => {
        removeClasses(els, ...fromClasses);
        addClasses(els, ...toClasses);
        const registerEventHandler = (el: StylableElement) => {
          const handleEvent = ({ currentTarget }: Event) => {
            if (currentTarget !== el) return;
            removeEls
              ? separate
                ? removeEls(el)
                : removeEls()
              : separate
              ? el.classList.remove(...activeClasses)
              : removeClasses(els, ...activeClasses);
            if (type === "both") {
              el.removeEventListener("transitionend", handleEvent);
              el.removeEventListener("animationend", handleEvent);
            } else el.removeEventListener(type, handleEvent);
          };
          if (type === "both") {
            el.addEventListener("transitionend", handleEvent);
            el.addEventListener("animationend", handleEvent);
          } else el.addEventListener(type, handleEvent);
        };
        if (separate) for (const el of els) registerEventHandler(el);
        else registerEventHandler(els[0]);
      })
    );
  };
}

export function cssEnter(
  classNames: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    separate?: boolean;
    type?: "animationend" | "transitionend" | "both";
  } = {}
): EnterIntegration {
  const classes = splitClasses(classNames, "enter");
  const enter = cssIntegration("enter", classes, options);
  return Object.assign(enter, {
    initial: (els: StylableElement[]) => addClasses(els, ...classes.toClasses),
  });
}

export function cssExit(
  classNames: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    absolute?: boolean;
    separate?: boolean;
    type?: "animationend" | "transitionend" | "both";
  } = {}
): ExitIntegration {
  const { absolute, ...integrationOptions } = options;
  const classes = splitClasses(classNames, "exit");
  const exit = cssIntegration("exit", classes, integrationOptions);
  return (els, removeEls) => {
    absolute && detachEls(els);
    exit(els, removeEls);
  };
}
