if (typeof WeakRef === "undefined") {
  // @ts-ignore
  globalThis.WeakRef = class WeakRef<T extends object> {
    private target: T | undefined;
    constructor(target: T) {
      this.target = target;
    }
    deref(): T | undefined {
      return this.target;
    }
  };
}
