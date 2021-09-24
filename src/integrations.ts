import { detachEls, filterMovedEls } from "./utils";

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
    filterMovedEls(els).then((movedEls) =>
      movedEls.forEach((movedEl) => animateEl(...movedEl))
    );
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

  return (els, removeEls) => {
    if (detach) detachEls(els);
    if (separate) {
      els.forEach((el) => animateEl(el).then(() => removeEls(el)));
    } else {
      animateEl(els[0]).then(() => removeEls());
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
  integrationType: "enter" | "exit",
  classes: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    separate?: boolean;
    type?: "animationend" | "transitionend" | "both";
  }
): (
  els: StylableElement[],
  removeElements?: (el?: StylableElement) => void
) => void {
  const { separate, type = "both" } = options;
  const name = classes.name ?? "s";
  const fromClasses = (classes.from?.split(" ") ?? []).concat(
    `${name}-${integrationType}-from`
  );
  const activeClasses = (classes.active?.split(" ") ?? []).concat(
    `${name}-${integrationType}-active`
  );
  const toClasses = (classes.to?.split(" ") ?? []).concat(
    `${name}-${integrationType}-to`
  );

  return (els, removeEls) => {
    addClasses(els, ...fromClasses, ...activeClasses);
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
      for (let i = 0; i < (separate ? els.length : 1); i++) {
        registerEventHandler(els[i]);
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
    type?: "animationend" | "transitionend" | "both";
  } = {}
): EnterIntegration {
  const enter = cssIntegration("enter", classes, options);
  return enter;
}

export function cssExit(
  classes: {
    name?: string;
    from?: string;
    active?: string;
    to?: string;
  },
  options: {
    detach?: boolean;
    separate?: boolean;
    type?: "animationend" | "transitionend" | "both";
  } = {}
): ExitIntegration {
  const { detach, ...integrationOptions } = options;
  const exit = cssIntegration("exit", classes, integrationOptions);
  return (els, removeEls) => {
    detach && detachEls(els);
    exit(els, removeEls);
  };
}
