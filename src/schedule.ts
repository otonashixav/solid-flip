const updateCallbacks: (() => void)[][] = [];
const commitCallbacks: (() => void)[][] = [];

export function startUpdate(): void {
  updateCallbacks.push([]);
}

export function applyUpdate(): void {
  const callbacks = updateCallbacks.pop();
  if (!callbacks) return;
  for (const callback of callbacks) callback();
}

export function startCommit(): void {
  commitCallbacks.push([]);
}

export function applyCommit(): void {
  const callbacks = commitCallbacks.pop();
  if (!callbacks) return;
  for (const callback of callbacks) callback();
}

export function onUpdate(callback: () => void): void {
  updateCallbacks[updateCallbacks.length - 1]?.push(callback);
}

export function onCommit(callback: () => void): void {
  commitCallbacks[commitCallbacks.length - 1]?.push(callback);
}
