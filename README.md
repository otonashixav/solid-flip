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

[Playground Link](https://playground.solidjs.com/?hash=1582873785&version=1.0.7)

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

The `Transition` component takes three props: `enter`, `exit`, and `move`. These accept functions that take an array of elements which need to be transitioned, figure out what changes to make (if needed), then return a callback containing all changes to be made. The `exit` prop additionally takes a `removeElements` function which should be called when it is done removing elements.

## Helper Functions

These exist to help compose `enter`, `exit` and `move` handler functions, covering most basic scenarios. You will have to write your own handlers for more complex scenarios.

### animateEnter / animateExit / animateMove

Uses `element.animate` to animate transitions. Takes the same parameters as `element.animate` (in the case of animateMove, the keyframes should be provided as a function which take two numbers, `x` and `y`, and return the actual keyframes; see the FLIP technique for more details on how to use these values). The third parameter is an object which contains additional options. All parameters are optional, defaulting to a simple fade in/out and linear slide.

#### animateEnter

Takes one additional option, `skipInitial`, defaulting to true, which skips the initial enter transition.

```tsx
<Transition
  enter={animateEnter(
    { opacity: [0, 1] },
    { duration: 300, easing: 'ease', fill: 'backwards' },
    { skipInitial: true }
  )}>
  ...
</Transition>
```

#### animateExit

Takes one additional option, `fixPosition`, defaulting to true, which sets the `position` proeprty of exiting elements to `absolute`, removes margins, and fixes `left, top, width, height` such that the exiting element is removed from the document flow without changes to how it renders.

```tsx
<Transition
  exit={animateExit(
    { opacity: [1, 0] },
    { duration: 300, easing: 'ease', fill: 'backwards' },
    { fixPosition: true }
  )}>
  ...
</Transition>
```

#### animateMove

No additional options.

```tsx
<Transition
  move={animateMove(
    (x, y) => ({ transform: [`translate(${x}px,${y}px)`, 'none'] }),
    { duration: 300, easing: 'ease', fill: 'backwards' }
  )}>
  ...
</Transition>
```

### cssTransitionEnter / cssTransitionExit

Uses classes to animate transitions. The only parameter is an object containing three optional properties: `from`, `active`, and `to`, which should each contain a string of classes that should be applied before, throughout, and during (but not before) entering or exiting. Note that these classes are not applied while the element is not actively entering or exiting. Additionally, all elements must have a transition duration set via either class or inline style.

```tsx
<Transition
  enter={cssTransitionEnter({ from: 'opacity-0' })}
  exit={cssTransitionExit({ to: 'opacity-0' })}>
  ...
</Transition>
```

## Changelog

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
