# Solid FLIP

A lightweight, highly performant FLIP library for solid-js.

## Usage

[Playground Link](https://playground.solidjs.com/?hash=506309423&version=1.0.0)

Usage is basically identical to using a `For` component. However, the map function provided must return an `Element`. More specifically, it must have the `animate` and `getBoundingClientRect` methods, and must have a `parentElement` (once mounted).

```tsx
<TransitionFor
	each={reactiveList()}
	fallback='Loading...'
	options={{ duration: 300, persistDuration: 500 }}>
	{(item, index) => {
		let el!: HTMLSpanElement;
		onMount(() => el.animate([{ opacity: 0 }, {}], { duration: 500 }));
		onCleanup(() => el.animate([{}, { opacity: 0 }], { duration: 500 }));
		return (
			<span ref={el}>
				{index()}: {item}
			</span>
		);
	}}
</TransitionFor>
```

The `options` prop allows you to specify the animation options for the FLIP animation, and additionally the duration that cleaned up children continue to persist. Note that although they continue to persist, they are no longer in a reactive context, thus all effects will stop working. If you need to use effects, use `createRoot` and dispose it once the child has been removed from the DOM tree:

```tsx
<TransitionFor
	each={reactiveList()}
	fallback='Loading...'
	options={{ duration: 300, persistDuration: 500 }}>
	{(item, index) => {
		let el!: HTMLSpanElement, dispose!: () => void;
		const [getDisposed, setDisposed] = createSignal(false);
		createEffect(() => console.log(getDisposed())); // will log false only
		onMount(() => el.animate([{ opacity: 0 }, {}], { duration: 500 }));
		onCleanup(() => {
			setDisposed(true);
			el.animate([{}, { opacity: 0 }], { duration: 500 }).finished.then(
				dispose
			);
		});
		return createRoot((d) => {
			dispose = d;
			createEffect(() => {
				console.log(getDisposed()); // will log false, then true
			});
			return (
				<span ref={el}>
					{index()}: {item} is disposed: {getDisposed()}
				</span>
			);
		});
	}}
</TransitionFor>
```
