let updateCallbacks: (() => void)[] | undefined;
let commitCallbacks: (() => void)[] | undefined;

export function schedule(
  onUpdate: (fn: () => void) => void,
  fn: () => void
): void {
  commitCallbacks = [];
  updateCallbacks = [];
  fn();
  const onUpdate_ = updateCallbacks;
  const commit_ = commitCallbacks;
  updateCallbacks = commitCallbacks = undefined;
  for (const callback of commit_) callback();
  onUpdate(() => {
    commitCallbacks = [];
    for (const callback of onUpdate_) callback();
    const commit_ = commitCallbacks;
    commitCallbacks = undefined;
    for (const callback of commit_) callback();
  });
}

export function onUpdate(callback: () => void): void {
  updateCallbacks?.push(callback);
}

export function onCommit(callback: () => void): void {
  commitCallbacks?.push(callback);
}

export class ChildListObserver extends MutationObserver {
  private callbacks: (() => void)[] = [];
  constructor() {
    super(() => {
      this.callbacks.shift()?.();
    });
  }
  observe(node: Node): void {
    super.observe(node, { childList: true });
  }
  requestMutation(callback: () => void): void {
    this.callbacks.push(callback);
  }
}
