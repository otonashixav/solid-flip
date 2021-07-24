# Solid FLIP

A lightweight, highly performant transitions library for solid-js.

## Usage

[Playground Link](https://playground.solidjs.com/?hash=737063430&version=1.0.4)

The `Transition` component provides all functionality for transitions. This includes `For` components, `Switch` and `Match` for use in routing, etc. By default, it transitions all moved children using the FLIP method, and fades elements in/out when they enter or exit. All children should implement `HTMLElement`, or at least `Element` -- note that SVG elements will not be properly repositioned when exiting by default, although there is no problem unless you are exiting multiple at once, as they do not support `element.offsetLeft` and `element.offsetTop` which are required by the default implementation.

It accepts two props, `move` and `lifecycle`, which take functions that handle the movement and entering/exiting of props respectively. You can use the exported functions `defaultMove` and `defaultLifecycle` to customize the animations for these slightly, but any further changes (e.g. adding classes, triggering other events) must be implemented in custom animation handlers. Additionally, passing `false` for either prop will disable the respective animations.
