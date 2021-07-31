# Solid FLIP

A lightweight, highly performant transitions library for solid-js.

## Usage

[Playground Link](https://playground.solidjs.com/?hash=-277761497&version=1.0.7)

```tsx
// Basic Usage; most children that resolve to an Element are okay.
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

The `Transition` component provides all functionality for transitions. This includes `For` components, `Switch` and `Match` for use in routing, etc. By default, it transitions all moved children using the FLIP method, and fades elements in/out when they enter or exit. All children should implement `HTMLElement`, or at least `Element` -- note that SVG elements will not be properly repositioned when exiting by default, although there is no problem unless you are exiting multiple at once, as they do not support `element.offsetLeft|Top|Width|Height` which are required by the default implementation.

It accepts three props, `move`, `enter` and `exit`, which take functions that handle the movement, entering, and exiting of props respectively.

## Changelog

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
