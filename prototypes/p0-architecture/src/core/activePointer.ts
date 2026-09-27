export class ActivePointerGate {
  #pointerId: number | null = null;

  get activePointerId(): number | null {
    return this.#pointerId;
  }

  begin(pointerId: number): boolean {
    if (this.#pointerId !== null) return false;
    this.#pointerId = pointerId;
    return true;
  }

  accepts(pointerId: number): boolean {
    return this.#pointerId === pointerId;
  }

  end(pointerId: number): boolean {
    if (this.#pointerId !== pointerId) return false;
    this.#pointerId = null;
    return true;
  }

  reset(): void {
    this.#pointerId = null;
  }
}
