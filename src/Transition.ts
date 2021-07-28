import { children, createComputed, createSignal, untrack, JSX } from 'solid-js';

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
	allElements: [el: StylableElement, x: number, y: number][]
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
		transform: [`translate(${x}px,${y}px)`, ''],
		composite: 'add',
	})
): MoveFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (movedEls) =>
		movedEls.forEach(([el, x, y]) => el.animate(getKeyframes(x, y), options));
}

export function defaultEnter(
	animationOptions?: KeyframeAnimationOptions,
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = [
		{
			opacity: 0,
		},
		{},
	],
	skipInitial = true
): EnterFunction {
	let initial = skipInitial;
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (els) =>
		initial
			? (initial = false)
			: requestAnimationFrame(() =>
					els.forEach((el) => el.animate(keyframes, options))
			  );
}

export function defaultExit(
	animationOptions?: KeyframeAnimationOptions,
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = [
		{},
		{
			opacity: 0,
		},
	]
): ExitFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (els, done) => {
		Promise.all(
			els.reverse().map((el) => {
				const properties =
					el instanceof HTMLElement
						? {
								left: el.offsetLeft,
								top: el.offsetTop,
								width: el.offsetWidth,
								height: el.offsetHeight,
						  }
						: undefined;
				el.style.setProperty('position', 'absolute');
				el.style.setProperty('margin', '0px');
				for (const name in properties) {
					const property = properties[name as keyof typeof properties];
					el.style.setProperty(name, `${property}px`);
				}
				return el.animate(keyframes, options).finished;
			})
		).then(done);
	};
}

function moveEls(els: StylableElement[], moveFunction?: MoveFunction | false) {
	if (!moveFunction || !els.length) return;
	const movedEls: [StylableElement, number, number][] = [];
	els.forEach((el) => {
		if (el.parentNode) {
			const { x, y } = el.getBoundingClientRect();
			movedEls.push([el, x, y]);
		}
	});
	movedEls.length &&
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
	let {
		move = defaultMove(),
		enter = defaultEnter(),
		exit = defaultExit(),
	} = props;
	const getResolved = children(() => props.children);
	const [getEls, setEls] = createSignal<StylableElement[]>([]);

	createComputed((prevSet: Set<StylableElement>) => {
		const resolved = getResolved();
		const els = (Array.isArray(resolved) ? resolved : [resolved]).filter(
			(el) => el instanceof Element
		) as StylableElement[];
		const currSet = new Set(els);
		const enteringEls = (enter &&
			els.filter((el) => !prevSet.has(el))) as StylableElement[];
		const exitingSet = prevSet;

		exitingSet.forEach((el) => currSet.has(el) && exitingSet.delete(el));
		untrack(getEls).forEach(
			(el, index) => currSet.has(el) || els.splice(index, 0, el)
		);

		const deleteEls = () => {
			setEls((els) => {
				const nextEls = els.filter((el) => !exitingSet.has(el));
				moveEls(nextEls, move);
				return nextEls;
			});
		};

		moveEls(els, move);
		exitingSet.size && (exit ? exit([...exitingSet], deleteEls) : deleteEls());
		setEls(els);
		enter && enteringEls.length && enter(enteringEls);

		return currSet;
	}, new Set());

	return getEls;
}
