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

[Playground Link](https://playground.solidjs.com/?hash=1153962070&version=1.1.3)

```tsx
<Transition enter={animateEnter()} exit={animateExit()} move={animateMove()}>
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
</Transition>
```

## `<Transition>`

The `Transition` component should wrap HTML and SVG elements to be transitioned. Note that although top-level SVG child elements are supported, it is ideal to wrap them in a `<div>` or other HTML element. The `Transition` component accepts three props containing the actual transition implementations.

### Props

The `Transition` component takes five props, including `children`. Three of these control how transitions happen: `enter`, `exit`, and `move`. These accept functions that take an array of elements which need to be transitioned, figure out what changes to make (if needed), then return a callback containing all changes to be made. The `exit` prop additionally takes a `removeElements` function which should be called when it is done removing elements.

## Helper Functions

These exist to help compose `enter`, `exit` and `move` handler functions, covering most basic scenarios. You will have to write your own handlers for more complex scenarios.

### animateEnter / animateExit / animateMove

Uses `element.animate` to animate transitions. Takes the same parameters as `element.animate` (in the case of animateMove, the keyframes should be provided as a function which take two numbers, `x` and `y`, and return the actual keyframes; see the FLIP technique for more details on how to use these values). The third parameter is an object which contains additional options. All parameters are optional, defaulting to a simple fade in/out and linear slide.

#### animateEnter

```tsx
<Transition
  enter={animateEnter(
    { opacity: [0, 1] },
    { duration: 300, easing: "ease", fill: "backwards" }
  )}
>
  ...
</Transition>
```

#### animateExit

Takes one additional option, `fixPosition`, defaulting to false, which sets the `position` proeprty of exiting elements to `absolute`, removes margins, and fixes `left, top, width, height` such that the exiting element is removed from the document flow without changes to how it renders. The parent should have `position: relative` for this to work properly.

```tsx
<Transition
  exit={animateExit(
    { opacity: [1, 0] },
    { duration: 300, easing: "ease", fill: "backwards" },
    { fixPosition: false }
  )}
>
  ...
</Transition>
```

#### animateMove

No additional options.

```tsx
<Transition
  move={animateMove(
    (x, y) => ({ transform: [`translate(${x}px,${y}px)`, "none"] }),
    { duration: 300, easing: "ease", fill: "backwards" }
  )}
>
  ...
</Transition>
```

### cssEnter / cssExit

Uses classes to animate transitions. The only parameter is an object containing four optional properties: `from`, `active`, and `to`, which should each contain a string of classes that should be applied during the first frame of, throughout, and after the first frame of entering and exiting, and `name`, which if provided will be suffixed with `-enter-from`, `-enter-active`, `-enter-to`, and the same with exit, and applied at the respective times as well. `to` classes will remain on the element. Additionally, all elements must have a transition duration set via either active, class or inline style, or have an active class which supplies a css animation, such that either a `transitionend` or `animationend` event is fired once the element has finished the entering or exiting animation or transition.

```tsx
<Transition
  enter={cssEnter({
    from: "opacity-0",
    active: "duration-300",
    name: "my-list",
  })}
  exit={cssExit(
    { to: "opacity-0", active: "duration-300", name: "my-list" },
    { fixPosition: false }
  )}
>
  ...
</Transition>
```

### filterMoved

Accepts an array of elements which may move (passed in by `Transition` when elements are added or removed), and a function for animating their movement. Useful for specifying your own version of `animateMove` if needed.

### fixPositions

Accepts an array of elements to be removed. Returns a function which when called, applies the required changes to fix those elements in place. The parent should have `position: relative` for this to work properly.

## Changelog

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
