import {
	children,
	createSignal,
	untrack,
	JSX,
	createRenderEffect,
} from 'solid-js';

type OneOrOther<U, V> = {
	[K in keyof U]?: U[K];
} &
	{
		[K in keyof V]?: V[K];
	} &
	{
		[K in keyof (U | V)]: U[K] | V[K];
	};

export type StylableElement = OneOrOther<HTMLElement, SVGElement>;
export type MoveFunction = (
	movedElements: [el: StylableElement, x: number, y: number][]
) => void;
export type EnterFunction = (enteringElements: StylableElement[]) => void;
export type ExitFunction = (
	exitingElements: StylableElement[],
	done: () => void
) => void;

const DEFAULT_OPTIONS: KeyframeAnimationOptions = {
	duration: 300,
	easing: 'ease',
};

export function defaultMove(
	animationOptions?: KeyframeAnimationOptions,
	getKeyframes: (
		x: number,
		y: number
	) => Keyframe[] | PropertyIndexedKeyframes | null = (x, y) => ({
		transform: [`translate(${x}px,${y}px)`, 'none'],
		composite: 'add',
	})
): MoveFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (movedEls) =>
		movedEls.forEach(([el, x, y]) => el.animate(getKeyframes(x, y), options));
}

export function defaultEnter(
	animationOptions?: KeyframeAnimationOptions,
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: ['0', 'inherit'],
	},
	skipInitial = true
): EnterFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (els) =>
		skipInitial
			? (skipInitial = false)
			: requestAnimationFrame(() =>
					els.forEach((el) => el.animate(keyframes, options))
			  );
}

export function defaultExit(
	animationOptions?: KeyframeAnimationOptions,
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: ['inherit', '0'],
	}
): ExitFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (els, done) =>
		requestAnimationFrame(() =>
			els
				.map<[StylableElement, Record<string, number> | undefined]>((el) => [
					el,
					el instanceof HTMLElement
						? {
								left: el.offsetLeft,
								top: el.offsetTop,
								width: el.offsetWidth,
								height: el.offsetHeight,
						  }
						: undefined,
				])
				.forEach(([el, offsets], i) => {
					el.style.setProperty('position', 'absolute');
					el.style.setProperty('margin', '0px');
					for (const name in offsets)
						el.style.setProperty(name, `${offsets[name]}px`);
					const finished = el.animate(keyframes, options).finished;
					!i && finished.then(done);
				})
		);
}

function moveEls(els: StylableElement[], moveFunction?: MoveFunction | false) {
	if (!moveFunction || !els.length) return;
	const movedEls = els.map((el) => {
		const { x, y } = el.getBoundingClientRect();
		return [el, x, y] as [StylableElement, number, number];
	});
	requestAnimationFrame(() => {
		let i = movedEls.length;
		while (i--) {
			const movedEl = movedEls[i];
			const [el, prevX, prevY] = movedEl;
			const { x, y } = el.getBoundingClientRect();
			movedEl[1] = prevX - x;
			movedEl[2] = prevY - y;
			if (!(movedEl[1] || movedEl[2])) movedEls.splice(i, 1);
		}
		movedEls.length && moveFunction(movedEls);
	});
}

export function Transition(props: {
	children: JSX.Element;
	move?: MoveFunction | false;
	enter?: EnterFunction | false;
	exit?: ExitFunction | false;
}): JSX.Element {
	const {
		move = defaultMove(),
		enter = defaultEnter(),
		exit = defaultExit(),
	} = props;
	const getResolved = children(() => props.children);
	const [getEls, setEls] = createSignal<StylableElement[]>([]);

	createRenderEffect((prevSet: Set<StylableElement>) => {
		const resolved = getResolved();
		const els = (Array.isArray(resolved) ? resolved : [resolved]).filter(
			(el) => el instanceof Element
		) as StylableElement[];
		const currSet = new Set(els);
		const prevEls = untrack(getEls);

		if (enter) {
			const enteringEls = els.filter((el) => !prevSet.has(el));
			enteringEls.length && enter(enteringEls);
		}

		if (exit) {
			const exitingSet = prevSet;
			exitingSet.forEach((el) => currSet.has(el) && exitingSet.delete(el));
			if (exitingSet.size) {
				prevEls.forEach(
					(el, index) => currSet.has(el) || els.splice(index, 0, el)
				);

				const deleteEls = () =>
					setEls((els) => {
						const nextEls = els.filter((el) => !exitingSet.has(el));
						moveEls(nextEls, move);
						return nextEls;
					});

				exit([...exitingSet], deleteEls);
			}
		}

		moveEls(prevEls, move);

		setEls(els);

		return currSet;
	}, new Set());

	return getEls;
}
