import {
	StylableElement,
	MoveFunction,
	EnterFunction,
	ExitFunction,
} from './types';

export function filterMoved(
	els: StylableElement[],
	move: (movedEls: [StylableElement, number, number][]) => void
): () => void {
	const movedEls = els.map((el) => {
		const { x, y } = el.getBoundingClientRect();
		return [el, x, y] as [StylableElement, number, number];
	});
	return () => {
		let i = movedEls.length;
		while (i--) {
			const movedEl = movedEls[i];
			const [el, prevX, prevY] = movedEl;
			const { x, y } = el.getBoundingClientRect();
			movedEl[1] = prevX - x;
			movedEl[2] = prevY - y;
			if (!(movedEl[1] || movedEl[2])) movedEls.splice(i, 1);
		}
		movedEls.length && move(movedEls);
	};
}

const DEFAULT_OPTIONS: KeyframeAnimationOptions = {
	duration: 300,
	easing: 'ease',
	fill: 'backwards',
};

export function animateMove(
	getKeyframes: (
		x: number,
		y: number
	) => Keyframe[] | PropertyIndexedKeyframes | null = (x, y) => ({
		transform: [`translate(${x}px,${y}px)`, 'none'],
		composite: 'add',
	}),
	animationOptions?: KeyframeAnimationOptions
): MoveFunction {
	const options = {
		...DEFAULT_OPTIONS,
		...animationOptions,
	};
	return (els) =>
		filterMoved(els, (movedEls) =>
			movedEls.forEach(([el, x, y]) => el.animate(getKeyframes(x, y), options))
		);
}

export function animateEnter(
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: [0, 1],
	},
	animationOptions?: KeyframeAnimationOptions,
	skipInitial = true
): EnterFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (els) =>
		skipInitial
			? void (skipInitial = false)
			: () => els.forEach((el) => el.animate(keyframes, options));
}

export function animateExit(
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: [1, 0],
	},
	animationOptions?: KeyframeAnimationOptions
): ExitFunction {
	const options = { ...DEFAULT_OPTIONS, ...animationOptions };
	return (els, done) => {
		const offsetsList = els.map<
			[StylableElement, Record<string, number> | null]
		>((el) => [
			el,
			el instanceof HTMLElement
				? {
						left: el.offsetLeft,
						top: el.offsetTop,
						width: el.offsetWidth,
						height: el.offsetHeight,
				  }
				: null,
		]);
		return () =>
			offsetsList.forEach(([el, offsets], i) => {
				el.style.setProperty('position', 'absolute');
				el.style.setProperty('margin', '0px');
				for (const name in offsets)
					el.style.setProperty(name, `${offsets[name]}px`);
				const finished = el.animate(keyframes, options).finished;
				!i && finished.then(done);
			});
	};
}
