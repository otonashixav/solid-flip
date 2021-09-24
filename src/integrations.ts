import { detachEls, filterMovedEls } from ".";

type KeyframeType = Keyframe[] | PropertyIndexedKeyframes;

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
  return async (els) => {
    (await filterMovedEls(els)).forEach((movedEl) => animateEl(...movedEl));
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
  return (els) => els.forEach(animateEl);
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
    detach?: boolean;
    reverseEnter?: boolean;
    separate?: boolean;
  } = {}
): ExitIntegration {
  const { detach, reverseEnter, separate = reverseEnter } = options;
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

  return (els, done) => {
    if (detach) detachEls(els);
    if (separate) {
      els.forEach((el, i) => {
        animateEl(el).then(() => done(i));
      });
    } else {
      animateEl(els[0]).then(() => done());
      for (let i = 1; i < els.length; i++) animateEl(els[i]);
    }
  };
}

function addClasses(els: StylableElement[], ...classes: string[]) {
  els.forEach((el) => el.classList.add(...classes));
}

function removeClasses(els: StylableElement[], ...classes: string[]) {
  els.forEach((el) => el.classList.remove(...classes));
}

function cssIntegration(
  classes: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    separate?: boolean;
    type?: "animationend" | "transitionend" | "animationend transitionend";
  }
): (els: StylableElement[], removeElements?: (index?: number) => void) => void {
  const { separate, type = "animationend transitionend" } = options;
  const name = classes.name ?? "s";
  const fromClasses = (classes.from?.split(" ") ?? []).concat(name);
  const activeClasses = (classes.active?.split(" ") ?? []).concat(name);
  const toClasses = (classes.to?.split(" ") ?? []).concat(name);

  return (els, onDone) => {
    addClasses(els, ...fromClasses, ...activeClasses);
    requestAnimationFrame(() => {
      removeClasses(els, ...fromClasses);
      addClasses(els, ...toClasses);
      const getEventHandler = (el: StylableElement, ...i: [number?]) => {
        const handleEvent = ({ target, currentTarget }: Event) => {
          if (currentTarget === null || target !== currentTarget) return;
          onDone ? onDone(...i) : el.classList.remove(...activeClasses);
          currentTarget.removeEventListener(type, handleEvent);
        };
        return handleEvent;
      };
      if (separate) {
        els.forEach((el, i) => {
          el.addEventListener(type, getEventHandler(el, i));
        });
      } else {
        els[0].addEventListener(type, getEventHandler(els[0]));
      }
    });
  };
}

export function cssEnter(
  classes: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    separate?: boolean;
    type?: "animationend" | "transitionend" | "animationend transitionend";
  } = {}
): EnterIntegration {
  return cssIntegration(classes, options);
}

export function cssExit(
  classes: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    separate?: boolean;
    type?: "animationend" | "transitionend" | "animationend transitionend";
  } = {}
): ExitIntegration {
  return cssIntegration(classes, options);
}
