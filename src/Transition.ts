import {
	children,
	createComputed,
	createRenderEffect,
	createSignal,
	untrack,
	JSX,
} from 'solid-js';

export interface StylableElement
	extends Element,
		ElementCSSInlineStyle,
		HTMLOrSVGElement {}
export type MoveFunction = (el: StylableElement, x: number, y: number) => void;
export type LifecycleFunction = (el: StylableElement) => ExitFunction;
type ExitFunction = (done: () => void) => void;

const DEFAULT_OPTIONS: KeyframeAnimationOptions = {
	duration: 300,
	easing: 'ease',
};

export function defaultMove(
	animationOptions?: KeyframeAnimationOptions,
	getMoveKeyframes: (
		x: number,
		y: number
	) => Keyframe[] | PropertyIndexedKeyframes | null = (x, y) => ({
		transform: [`translate(${x}px,${y}px)`, ''],
		composite: 'add',
	})
): MoveFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (el, x, y) => el.animate(getMoveKeyframes(x, y), options);
}

export function defaultLifecycle(
	animationOptions?: KeyframeAnimationOptions,
	enterKeyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: [0, null],
	},
	exitKeyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: [null, 0],
	}
): LifecycleFunction {
	let skipEnter = true;
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return function (el: StylableElement) {
		skipEnter
			? setTimeout(() => (skipEnter = false))
			: requestAnimationFrame(() => el.animate(enterKeyframes, options));
		return (done) => {
			const { offsetLeft, offsetTop } = el as any;
			requestAnimationFrame(async () => {
				el.style.setProperty('position', 'absolute');
				offsetLeft && el.style.setProperty('left', `${offsetLeft}px`);
				offsetTop && el.style.setProperty('top', `${offsetTop}px`);
				await el.animate(exitKeyframes, options).finished;
				done();
			});
		};
	};
}

export function Transition(props: {
	children: JSX.Element;
	move?: MoveFunction | false;
	lifecycle?: LifecycleFunction | false;
}): JSX.Element {
	const { move = defaultMove(), lifecycle = defaultLifecycle() } = props;
	const getResolved = children(() => props.children);
	const [getElements, setElements] = createSignal<StylableElement[]>([]);
	const exitFunctions = new Map<StylableElement, ExitFunction>();

	createComputed((prevSet: Set<StylableElement>) => {
		const resolved = getResolved();
		const currElements = (
			Array.isArray(resolved) ? resolved : [resolved]
		).filter((el) => el instanceof Element);
		const currSet = new Set(currElements);

		if (lifecycle) {
			const newElements = currElements.filter((el) => !prevSet.has(el));
			newElements.forEach((el) => exitFunctions.set(el, lifecycle(el)));

			let deleted = false;
			prevSet.forEach((el) => {
				// Modify prevSet in place to contain only items not found in currSet
				if (currSet.has(el)) {
					prevSet.delete(el);
				} else {
					// Delete items not found in currSet
					const exit = exitFunctions.get(el);
					exitFunctions.delete(el) &&
						exit!(() => {
							if (!deleted) {
								deleted = true;
								setElements((els) => els.filter((el) => !prevSet.has(el)));
							}
						});
				}
			});
		} else {
			prevSet.forEach((el) => currSet.has(el) && prevSet.delete(el));
			setElements((els) => els.filter((el) => !prevSet.has(el)));
		}

		untrack(getElements).forEach((el, index) => {
			if (!currSet.has(el)) currElements.splice(index, 0, el);
		});
		setElements(currElements);

		return currSet;
	}, new Set());

	move &&
		createRenderEffect(() => {
			getElements().forEach((el) => {
				if (el.parentElement) {
					const { x: prevX, y: prevY } = el.getBoundingClientRect();
					requestAnimationFrame(() => {
						const { x, y } = el.getBoundingClientRect();
						const deltaX = prevX - x;
						const deltaY = prevY - y;
						if (deltaX || deltaY) move(el, deltaX, deltaY);
					});
				}
			});
		});

	return getElements;
}
