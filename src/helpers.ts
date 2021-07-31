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

export function positionAbsolute(els: StylableElement[]): () => void {
	const offsetsList = els.map<[StylableElement, Record<string, number> | null]>(
		(el) => [
			el,
			el instanceof HTMLElement
				? {
						left: el.offsetLeft,
						top: el.offsetTop,
						width: el.offsetWidth,
						height: el.offsetHeight,
				  }
				: null,
		]
	);
	return () =>
		offsetsList.forEach(([el, offsets]) => {
			el.style.setProperty('position', 'absolute');
			el.style.setProperty('margin', '0px');
			for (const name in offsets)
				el.style.setProperty(name, `${offsets[name]}px`);
		});
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
	options: {
		skipInitial?: boolean;
	} = {}
): EnterFunction {
	let { skipInitial = true } = options;
	return (els) =>
		skipInitial
			? void (skipInitial = false)
			: () =>
					els.forEach((el) =>
						el.animate(keyframes, { ...DEFAULT_OPTIONS, ...animationOptions })
					);
}

export function animateExit(
	keyframes: Keyframe[] | PropertyIndexedKeyframes | null = {
		opacity: [1, 0],
	},
	animationOptions?: KeyframeAnimationOptions,
	options: { fixPosition?: boolean } = {}
): ExitFunction {
	const { fixPosition = true } = options;
	return (els, done) => {
		const setAbsolute = fixPosition && positionAbsolute(els);
		return () => {
			fixPosition && (setAbsolute as () => void)();
			els.forEach((el, i) => {
				const finished = el.animate(keyframes, {
					...DEFAULT_OPTIONS,
					...animationOptions,
				}).finished;
				!i && finished.then(done);
			});
		};
	};
}

export function cssTransitionEnter(
	classes: {
		from?: string;
		to?: string;
		active?: string;
	},
	options: {
		skipInitial?: boolean;
	} = {}
): EnterFunction {
	let { skipInitial = true } = options;
	const fromClasses = classes.from?.split(' ') ?? [];
	const toClasses = classes.to?.split(' ') ?? [];
	const activeClasses = classes.active?.split(' ') ?? [];
	return (els) => {
		if (skipInitial) {
			skipInitial = false;
			return;
		}
		els.forEach((el) => el.classList.add(...fromClasses, ...activeClasses));
		return () => {
			els.forEach((el) => {
				el.classList.remove(...fromClasses);
				el.classList.add(...toClasses);
				(toClasses.length || activeClasses.length) &&
					el.addEventListener(
						'transitionend',
						() => el.classList.remove(...toClasses, ...activeClasses),
						{ once: true }
					);
			});
		};
	};
}
export function cssTransitionExit(
	classes: {
		from?: string;
		to?: string;
		active?: string;
	},
	options: {
		fixPosition?: boolean;
	} = {}
): ExitFunction {
	let { fixPosition = true } = options;
	const fromClasses = classes.from?.split(' ') ?? [];
	const toClasses = classes.to?.split(' ') ?? [];
	const activeClasses = classes.active?.split(' ') ?? [];
	return (els, removeEls) => {
		const setAbsolute = fixPosition && positionAbsolute(els);
		els.forEach((el) => {
			el.dispatchEvent(new TransitionEvent('transitionend'));
			el.classList.add(...fromClasses, ...activeClasses);
		});
		return () => {
			fixPosition && (setAbsolute as () => void)();
			els.forEach((el, i) => {
				el.classList.remove(...fromClasses);
				el.classList.add(...toClasses);
				!i && el.addEventListener('transitionend', removeEls, { once: true });
			});
		};
	};
}
