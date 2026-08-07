type Listener<T> = (value: T) => void;

/** Minimal typed pub/sub used by the device service mocks and their real BLE counterparts. */
export class Emitter<T> {
  private listeners = new Set<Listener<T>>();

  emit(value: T) {
    this.listeners.forEach((listener) => listener(value));
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
