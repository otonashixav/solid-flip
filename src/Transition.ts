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
		transform: [`translate(${x}px,${y}px)`, ''],
		composite: 'add',
	})
): MoveFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (els) =>
		els.forEach(([el, x, y]) => el.animate(getKeyframes(x, y), options));
}

export function defaultEnter(
	animationOptions?: KeyframeAnimationOptions,
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: [0, null],
	},
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
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: [null, 0],
	}
): ExitFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (els, done) => {
		const offsets: [undefined | number | null, undefined | number | null][] =
			els.map((el: any) => [el.offsetLeft, el.offsetTop]);
		requestAnimationFrame(() =>
			Promise.all(
				els.map((el, index) => {
					const [left, top] = offsets[index];
					el.style.setProperty('position', 'absolute');
					left && el.style.setProperty('left', `${left}px`);
					top && el.style.setProperty('top', `${top}px`);
					return el.animate(keyframes, options).finished;
				})
			).then(done)
		);
	};
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

	createComputed((prevSet: Set<StylableElement>) => {
		const resolved = getResolved();
		const els = (Array.isArray(resolved) ? resolved : [resolved]).filter(
			(el) => el instanceof Element
		) as StylableElement[];
		const currSet = new Set(els);

		const enteringEls = els.filter((el) => !prevSet.has(el));
		const exitingSet = prevSet;
		exitingSet.forEach((el) => currSet.has(el) && exitingSet.delete(el));
		const deleteEls = () =>
			setEls((els) => els.filter((el) => !exitingSet.has(el)));

		exitingSet.size && (exit ? exit([...exitingSet], deleteEls) : deleteEls());
		enteringEls.length && enter && enter(enteringEls);

		untrack(getEls).forEach(
			(el, index) => currSet.has(el) || els.splice(index, 0, el)
		);
		setEls(els);

		return currSet;
	}, new Set());

	move &&
		createRenderEffect(() => {
			const movedEls: [StylableElement, number, number][] = [];
			getEls().forEach((el) => {
				if (el.parentNode) {
					const { x, y } = el.getBoundingClientRect();
					movedEls.push([el, x, y]);
				}
			});
			requestAnimationFrame(() => {
				let newLen = 0;
				for (let i = movedEls.length; i--; i > 0) {
					const movedEl = movedEls[i];
					const [el, prevX, prevY] = movedEl;
					const { x, y } = el.getBoundingClientRect();
					movedEl[1] = prevX - x;
					movedEl[2] = prevY - y;
					if (!(movedEl[1] || movedEl[2])) movedEls.splice(i, 1);
					else newLen++;
				}
				movedEls.length = newLen;
				move(movedEls);
			});
		});

	return getEls;
}
