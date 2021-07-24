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

function animateMove(
	el: StylableElement,
	x: number,
	y: number,
	options: KeyframeAnimationOptions
) {
	return el.animate(
		[
			{
				transform: `translate(${x}px,${y}px)`,
				composite: 'add',
			},
			{},
		],
		options
	);
}

function addClasses(el: StylableElement, classes?: string[]) {
	classes && el.classList.add(...classes);
}

function removeClasses(el: StylableElement, classes?: string[]) {
	classes && el.classList.remove(...classes);
}

export function defaultMove({
	animationOptions,
	moveClass,
	onMoveStart,
	onMoveEnd,
}: {
	animationOptions?: KeyframeAnimationOptions;
	moveClass?: string;
	onMoveStart?: (el: StylableElement, x: number, y: number) => void;
	onMoveEnd?: (el: StylableElement, x: number, y: number) => void;
} = {}): MoveFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	let moveId = 0;
	if (Boolean(moveClass || onMoveStart || onMoveEnd)) {
		const moveClasses = moveClass?.split(' ');
		return async function (el, x, y) {
			const currMoveId = (moveId++).toString();
			if (!el.dataset.moveId) {
				onMoveStart?.(el, x, y);
				addClasses(el, moveClasses);
			}
			el.dataset.moveId = currMoveId;
			await animateMove(el, x, y, options).finished;
			if (el.dataset.moveId === currMoveId) {
				onMoveEnd?.(el, x, y);
				removeClasses(el, moveClasses);
			}
		};
	} else {
		return (el, x, y) => animateMove(el, x, y, options);
	}
}

export function animationLifecycle({
	skipInitialEnter: skipEnter = true,
	setPositionOnExit = true,
	animationOptions,
	enterActiveClass,
	enterClass,
	enterToClass,
	exitActiveClass,
	exitClass,
	exitToClass,
	onBeforeEnter,
	onEnter,
	onAfterEnter,
	onBeforeExit,
	onExit,
	onAfterExit,
}: {
	skipInitialEnter?: boolean;
	setPositionOnExit?: boolean;
	animationOptions?: KeyframeAnimationOptions;
	enterActiveClass?: string;
	enterClass?: string;
	enterToClass?: string;
	exitActiveClass?: string;
	exitClass?: string;
	exitToClass?: string;
	onBeforeEnter?: (el: Element) => void;
	onEnter?: (el: Element) => Promise<void>;
	onAfterEnter?: (el: Element) => void;
	onBeforeExit?: (el: Element) => void;
	onExit?: (el: Element) => void;
	onAfterExit?: (el: Element) => void;
} = {}): LifecycleFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	const enterActiveClasses = enterActiveClass?.split(' ');
	const enterClasses = enterClass?.split(' ');
	const enterToClasses = enterToClass?.split(' ');
	const exitActiveClasses = exitActiveClass?.split(' ');
	const exitClasses = exitClass?.split(' ');
	const exitToClasses = exitToClass?.split(' ');
	return function (el: StylableElement) {
		let exiting = false;
		addClasses(el, enterActiveClasses);
		addClasses(el, enterClasses);
		onBeforeEnter?.(el);
		skipEnter
			? setTimeout(() => (skipEnter = true))
			: requestAnimationFrame(async () => {
					removeClasses(el, enterClasses);
					addClasses(el, enterToClasses);
					await Promise.all([
						el.animate([{ opacity: 0 }, {}], options).finished,
						onEnter?.(el),
					]);
					if (!exiting) {
						removeClasses(el, enterToClasses);
						removeClasses(el, enterActiveClasses);
						onAfterEnter?.(el);
					}
			  });
		return (done) => {
			exiting = true;
			removeClasses(el, enterClasses);
			removeClasses(el, enterToClasses);
			removeClasses(el, enterActiveClasses);
			addClasses(el, exitActiveClasses);
			addClasses(el, exitClasses);
			onBeforeExit?.(el);
			const { offsetLeft, offsetTop } = el as any;
			requestAnimationFrame(async () => {
				removeClasses(el, exitClasses);
				addClasses(el, exitToClasses);
				if (setPositionOnExit) {
					el.style.setProperty('position', 'absolute');
					offsetLeft && el.style.setProperty('left', `${offsetLeft}px`);
					offsetTop && el.style.setProperty('top', `${offsetTop}px`);
				}
				await Promise.all([
					el.animate([{}, { opacity: 0 }], options).finished,
					onExit?.(el),
				]);
				removeClasses(el, exitToClasses);
				removeClasses(el, exitActiveClasses);
				onAfterExit?.(el);
				done();
			});
		};
	};
}

export function Transition(props: {
	children: JSX.Element;
	move?: MoveFunction;
	lifecycle?: LifecycleFunction;
}) {
	const { move = defaultMove(), lifecycle = animationLifecycle() } = props;
	const getResolved = children(() => props.children);
	const [getElements, setElements] = createSignal<StylableElement[]>([]);
	const exitFunctions = new Map<StylableElement, ExitFunction>();

	createComputed((prevSet: Set<StylableElement>) => {
		const resolved = getResolved();
		const currElements = (
			Array.isArray(resolved) ? resolved : [resolved]
		).filter((el) => el instanceof Element);
		const currSet = new Set(currElements);

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

		untrack(getElements).forEach((el, index) => {
			if (!currSet.has(el)) currElements.splice(index, 0, el);
		});
		setElements(currElements);

		return currSet;
	}, new Set());

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
