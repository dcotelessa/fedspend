import { Injectable } from '@angular/core';
import { signal, WritableSignal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private counter = 0;
  readonly loading$: WritableSignal<boolean> = signal(false) as WritableSignal<boolean>;

  increment(): void {
    this.counter++;
    this.loading$.set(this.counter > 0);
  }

  decrement(): void {
    this.counter = Math.max(this.counter - 1, 0);
    this.loading$.set(this.counter > 0);
  }
}
