let updateCallbacks: (() => void)[] | undefined;
let commitCallbacks: (() => void)[] | undefined;

export function schedule(update: () => void, fn: () => void): void {
  commitCallbacks = [];
  updateCallbacks = [];
  fn();
  const onUpdate_ = updateCallbacks;
  const commit_ = commitCallbacks;
  updateCallbacks = commitCallbacks = undefined;
  for (const callback of commit_) callback();
  update();
  commitCallbacks = [];
  for (const callback of onUpdate_) callback();
  const commit__ = commitCallbacks;
  commitCallbacks = undefined;
  for (const callback of commit__) callback();
}

export function onUpdate(callback: () => void): void {
  updateCallbacks?.push(callback);
}

export function onCommit(callback: () => void): void {
  commitCallbacks?.push(callback);
}
