import {
	Accessor,
	batch,
	createComputed,
	createMemo,
	createRenderEffect,
	createSignal,
	For,
	JSX,
	mapArray,
	untrack,
} from 'solid-js';

interface TransitionOptions extends KeyframeAnimationOptions {
	persistDuration?: number;
}

const DEFAULT_OPTIONS: TransitionOptions = {
	duration: 150,
};

type Resolvable = (() => Resolvable) | Element;

function resolve(resolvable: Resolvable): Element {
	while (typeof resolvable === 'function') resolvable = resolvable();
	return resolvable;
}

function getRelativePos(el: Element, parent: Element): [x: number, y: number] {
	const elRect = el.getBoundingClientRect();
	const parentRect = parent.getBoundingClientRect();
	return [elRect.x - parentRect.x, elRect.y - parentRect.y];
}

export function TransitionFor<T>(props: {
	each: readonly T[] | null | undefined;
	fallback?: JSX.Element;
	options?: TransitionOptions;
	children: (item: T, index: Accessor<number>) => JSX.Element;
}) {
	const {
		fallback,
		options: { persistDuration, ...flipOptions } = DEFAULT_OPTIONS,
		children: mapFn,
	} = props;
	const [getItems, setItems] = createSignal<Element[]>([]);
	const getCurrentItems = createMemo(
		mapArray(
			() => props.each as T[],
			mapFn.length === 2
				? (item, getIndex) =>
						resolve(mapFn(item, getIndex) as Resolvable) as Element
				: (item) => resolve((mapFn as any)(item) as Resolvable) as Element
		)
	);
	createComputed(() => {
		const deletedSet = new Set<Element>();
		batch(() => {
			const currentItems = getCurrentItems();
			const nextItems = [...currentItems];
			const currentSet = new Set(currentItems);
			const all = untrack(() => getItems());
			all.forEach((item, index) => {
				if (persistDuration && !currentSet.has(item)) {
					nextItems.splice(index, 0, item);
					deletedSet.add(item);
				}
			});
			setItems(nextItems);
		});
		persistDuration &&
			setTimeout(
				() =>
					setItems((items) => items.filter((item) => !deletedSet.has(item))),
				persistDuration
			);
	});
	return (
		<For each={getItems()} fallback={fallback}>
			{(el, getIndex) => {
				createRenderEffect(() => {
					const _ = getIndex();
					const parent = el.parentElement;
					if (parent) {
						const [prevX, prevY] = getRelativePos(el, parent);
						requestAnimationFrame(() => {
							const [x, y] = getRelativePos(el, parent);
							const deltaX = prevX - x;
							const deltaY = prevY - y;
							if (deltaX || deltaY)
								el.animate(
									[
										{
											transform: `translate(${deltaX}px,${deltaY}px)`,
											composite: 'add',
										},
										{},
									],
									flipOptions
								);
						});
					}
				});
				return el;
			}}
		</For>
	);
}
