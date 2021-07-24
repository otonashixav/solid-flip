# Solid FLIP

A lightweight, highly performant transitions library for solid-js.

## Usage

```tsx
// Basic Usage; most children that resolve to an `Element` are okay.
<Transition>
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

[Playground Link](https://playground.solidjs.com/?hash=737063430&version=1.0.4)

The `Transition` component provides all functionality for transitions. This includes `For` components, `Switch` and `Match` for use in routing, etc. By default, it transitions all moved children using the FLIP method, and fades elements in/out when they enter or exit. All children should implement `HTMLElement`, or at least `Element` -- note that SVG elements will not be properly repositioned when exiting by default, although there is no problem unless you are exiting multiple at once, as they do not support `element.offsetLeft` and `element.offsetTop` which are required by the default implementation.

It accepts two props, `move` and `lifecycle`, which take functions that handle the movement and entering/exiting of props respectively. You can use the exported functions `defaultMove` and `defaultLifecycle` to customize the animations for these slightly, but any further changes (e.g. adding classes, triggering other events) must be implemented in custom animation handlers. Additionally, passing `false` for either prop will disable the respective animations.
