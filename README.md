# Solid FLIP

A lightweight transition library for solid-js.

## Installation

```sh
npm i @otonashixav/solid-flip
```

```sh
yarn add @otonashixav/solid-flip
```

```sh
pnpm i @otonashixav/solid-flip
```

## Basic Usage

[Playground Link](https://playground.solidjs.com/?hash=-374258646&version=1.1.6)

```tsx
<TransitionGroup
  enter={animateEnter()}
  exit={animateExit()}
  move={animateMove()}
>
  <For each={list()}>{(item) => <span>{item}</span>}</For>
  <Switch fallback={<span>Fallback Tab</span>}>
    <Match when={number() === 1}>
      <span>Tab 1</span>
    </Match>
    <Match when={number() === 2}>
      <span>Tab 2</span>
    </Match>
    <Match when={number() === 3}>
      <span>Tab 3</span>
    </Match>
    <Match when={number() === 4}>
      <span>Tab 4</span>
    </Match>
  </Switch>
</TransitionGroup>
```

## `<TransitionGroup>`

The `TransitionGroup` component should wrap elements to be transitioned. Only elements with a `style` property implementing `CSSStyleDeclaration` e.g. HTMLElements and SVGElements are supported.

### props

These are callbacks which if provided, are used to animate child elements as they enter, exit and are reordered. You can either pass your own functions or use the provided integrations.

#### enter

A callback called when elements enter. Accepts an array of entering elements. Used to transition entering elements. If `initial` is defined on the function, it will be called when the `TransitionGroup` component is created if there is no `initial` prop passed in.

#### exit

A callback called when elements exit. Accepts an array of exiting elements and a callback to remove one or all of them. Used to transition exiting elements.

#### move

A callback called when children elements are added, removed, or reordered. Accepts an array of all elements. Used to move elements using the FLIP technique.

#### initial

A callback called initially when the `TransitionGroup` component is first created. Accepts an array of all initally present elements. Used to apply initial styling. Also accepts a boolean; if true, calls `enter`, and if false, stops `enter.initial` from being called if present.

## Animate Integrations

All of these integrations can be provided with either keyframes (as a string or callback) and options to be passed to `element.animate` or a callback to manually animate an element.

These animation options are applied by default:

```ts
const DEFAULT_OPTIONS = {
  duration: 300,
  easing: "ease",
  fill: "backwards",
};
```

### animateEnter

```ts
function animateEnter(
  animate:
    | {
        keyframes: KeyframeType | ((el: StylableElement) => KeyframeType);
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement) => void) = {}
): EnterIntegration;
```

`keyframes` defaults to a simple fade in animation.

### animateExit

```ts
function animateExit(
  animate:
    | {
        keyframes: KeyframeType | ((el: StylableElement) => KeyframeType);
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement) => Promise<unknown>) = {},
  options: {
    absolute?: boolean;
    reverseEnter?: boolean;
    separate?: boolean;
  } = {}
): ExitIntegration;
```

- `animate` must return a Promise if provided with a callback. The elements will be removed once the Promise resolves.
- `keyframes` defaults to a simple fade out animation.
- `absolute: true` sets the `position`, `left`, `top`, `width`, `height` and `margin` properties such that the element is detached from the document flow with `position: absolute` and left where it was when it began to exit.
- `reverseEnter: true` causes the element to exit by reversing the first ongoing enter animation, identified by `id: enter`, instead of exiting with the provided animation. It also sets `separate: true`.
- `separate: true` causes each element to be removed when its own animation has completed, instead of using a single animation to remove all the elements. This is useful if your animations have different durations, but otherwise less performant.

### animateMove

```ts
function animateMove(
  animate:
    | {
        keyframes?: (el: StylableElement, x: number, y: number) => KeyframeType;
        options?: KeyframeAnimationOptions;
      }
    | ((el: StylableElement, x: number, y: number) => void) = {}
): MoveIntegration;
```

`keyframes` defaults to a simple straight line movement. If providing your own animation, it should move the element from `(x, y)` to `(0, 0)`.

## Class Integrations

These add and remove classes to transition elements. These accept a classes object with these properties:

- `name` - If provided, also adds an additional class to each of the other three props. For example, when provided to cssEnter, adds `name-enter-from`, `name-enter-active` and `name-enter-to` to the classes.
- `from` - Classes to add, then remove. This is the starting point for transitioning.
- `active` - Classes that should be present during the transition. These usually provide css animations.
- `to` - Classes that are added after the `from` classes are removed, and persist after the transition ends.

They also all accept these options:

- `separate` - Listens to events on all elements, instead of just the first one. Useful if your transitions finish at different times, but otherwise less performant.
- `type` - The type of events to listen to, indicating the end of the transition. Defaults to `both`.

### cssEnter

```ts
function cssEnter(
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
): EnterIntegration;
```

### cssExit

```ts
function cssExit(
  classes: {
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
): ExitIntegration;
```

`absolute: true` sets the `position`, `left`, `top`, `width`, `height` and `margin` properties such that the element is detached from the document flow with `position: absolute` and left where it was when it began to exit.

## Utilities

Helper functions for composing your own integrations.

### filterMovedEls

Filters an array of elements to just those which have moved after the DOM updates. Returns an array which will contain these elements after the DOM updates.

### detachEls

Sets the `position`, `left`, `top`, `width`, `height` and `margin` properties such that the element is detached from the document flow with `position: absolute` and left where it was when it began to exit.

## Scheduling

### onUpdate

Takes a callback, used to schedule element operations between integrations. When called within an integration, causes the callback passed to be called after the DOM updates.

### onCommit

Takes a callback, used to schedule element operations between integrations. When called within an integration, causes the callback passed to be called after all the integrations have returned. When called within `onUpdate`, causes the callback passed to be called after all `onUpdate` callbacks have been called. Any style changes to elements via any method should be wrapped in an `onCommit`, so that integrations that need to read values from elements read correctly before any changes have been applied.

## Changelog

### 0.8.5

- Redo scheduler again.

### 0.8.4

- Properly update the scheduler.

### 0.8.3

- Remove setTimeout inside removeEls.

### 0.8.2

- Use the scheduler when removing elements as well.

### 0.8.1

- Fix css integrations exiting before entering when they were exited within one frame, causing their event handlers to never trigger.

### 0.8.0

- Make transitions run asynchronously instead of within a computation, avoiding batching which may cause elements to not exit due to caching. This slightly changes how the scheduler works.

### 0.7.8

- Undo unnecessary fix in 0.7.7 (doesn't do anything).

### 0.7.7

- Fix initial case return value (returned undefined instead of the set of elements).
- Use computations instead of render effects to avoid batching, in order to hopefully fix elements rarely not exiting.

### 0.7.5

- Keep `TransitionGroup` uninitialized (i.e. delay running or not running initial) until at least one child exists to help with lazily loading children.

### 0.7.4

- Fix initial not being run with the scheduler.

### 0.7.3

- Fix checking removed elements against `currentTarget` instead of `target` as intended.

### 0.7.2

- Simplify reverse enter implementation.
- Default keyframes now use computed styles instead of animating from/to `opacity: 1`, making them more compatible with default opacity other than 1, and when exiting halfway through the enter animation.

### 0.7.1

- Renamed `animateMove`'s `getKeyframes` to `keyframes`.
- Removed `extraKeyframesList` as it is obsoleted by providing an array of keyframes with offsets.
- Added the option to pass a callback to `keyframes` on `animateEnter` and `animateExit`.

### 0.7.0

- Helpers are now called integrations, inspired by `solid-app-router`.
- Added scheduling to integrations to make it clearer what runs when.
- `animate` integrations now accept an object for animate parameters instead of taking two parameters for the keyframes and options. They can also accept a callback that animates the element.
- Added `separate` as an option where applicable, separating removal of elements or classes per element instead of using the first element to remove all elements or classes.
- Renamed `fixPosition` to `absolute` to make it clearer what it does. It also works on SVG elements now.
- Renamed the `fixPositions` utility to `detachEls` and `filterMoved` to `filterMovedEls` to make it clearer what they do.
- Added `type` as an option on css integrations to prevent the wrong type of event from triggering the listener.
- A custom event is now used to remove enter classes instead of hijacking the `animationend` listener.
- `StylableElement` is now `Element & ElementCSSInlineStyle` instead of `HTMLElement | SVGElement`.
- Allowed `initial` to be a callback, and allowed it to be provided via `enter` as well.
- Added `reverseEnter` to `animateExit`, allowing enter animations to be reversed in causes where it looks cleaner to do so.

### 0.6.4

- Actually apply the fix in 0.6.1.

### 0.6.3

- Fixed playground link.

### 0.6.2

- Accidentally bumped the version number.

### 0.6.1

- Fixed a bug in `Transition` where removed children were not saved until they removed themselves.
- Added prettier.

### 0.6.0

- Make `Transition` props reactive between transitions, fixing [#2](https://github.com/otonashixav/solid-flip/issues/2). Moved `skipInitial` to a prop on `Transition`, `initial`, which specifies whether to enter the initial children. `fixPosition` accepts only `true` now, since the default is `false` and will remain so.

### 0.5.7

- Revert change in 0.5.6, as it had unintended side effects.

### 0.5.6

- Make `Transition` props reactive between transitions, fixing [#2](https://github.com/otonashixav/solid-flip/issues/2). Additionally swapped the project to spaces over tabs and double quotes over single quotes, following convention.

### 0.5.5

- Ignore `transitionend` and `animationend` events from elements other than the target element, fixing [#1](https://github.com/otonashixav/solid-flip/issues/1).

### 0.5.4

- Change default `fixPosition` to false as it is more often not used than used.

### 0.5.3

- Update dependencies

### 0.5.2

- `to` classes now remain on the element after entering/exiting, enabling some use cases. This should not break any existing cases as far as I am aware.

### 0.5.1

- Updated playground link

### 0.5.0

- Added support for `name` and css animations in css helpers, renamed the css helpers. Note that css animations are untested (because I'm unfamiliar with them), so feedback is appreciated

### 0.4.6

- Added better documentation

### 0.4.2 - 0.4.5

- Tried to get peerDependencies to work such that all versions of the solid playground would be compatible with the library, but couldn't do it. Will revisit.

### 0.4.1

- Fix firefox not applying enter styling on the first frame for whatever reason

### 0.4.0

- Replaced the `skipInitial` parameter in `animateEnter` with an options object; split the `cssEnterExit` function into two, `cssTransitionEnter` and `cssTransitionExit`.

### 0.3.5

- Add a new helper, `cssEnterExit` that takes enter/exit class strings and returns an object containing the `enter` and `exit` props. See the playground link for an example.

### 0.3.4

- Apply the previous animation fix to all animations instead of just move where it is most apparent

### 0.3.3

- Fix animation jitteryness in firefox

### 0.3.2

- Fix opacity values (should not be inherit)

### 0.3.1

- Fix readme playground link

### 0.3.0

- A `Transition` component without props will no longer default to having all default transition handlers. Instead, they must now be created with the `animateEnter`, `animateExit`, and `animateMove` functions, which implement the handlers using the web animations api. Calling them without parameters will use sensible defaults.

### 0.2.11

- Restore previous operation order to prevent items from sometimes jumping (will need to batch requestAnimationFrame to fix)

### 0.2.10

- Fix calling done multiple times in the default exit handler

### 0.2.9

- More optimizations

### 0.2.8

- Fix invalid keyframes in firefox

### 0.2.7

- Further optimizations, fixed an issue introduced in 0.2.6 that caused exiting elements to be incorrectly sized on exit

### 0.2.6

- Slight optimizations and preparations for further improvements

### 0.2.5

- Fix invalid keyframe values again

### 0.2.4

- Fixes the sizing of elements with percentage heights and/or margins after `defaultExit`

### 0.2.3

- More optimizations, fix invalid keyframe values

### 0.2.2

- Slight optimizations and bug fixes

### 0.2.1

- Fix types

### 0.2.0

- Animation Handlers now take an array of elements instead of just one, so that multiple `requestAnimationFrame` calls do not need to be done, and to simplify some cases e.g. avoiding the entry animation for the initial render.
- Split `lifecycle` into `enter` and `exit` to avoid having an internal map of exit functions when it is not always needed. Managing the state of individual elements can be done externally when needed.
