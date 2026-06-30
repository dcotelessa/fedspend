import { Injectable, effect, inject, signal, WritableSignal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';

const STORAGE_KEY = 'fedspend-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly overlayContainer = inject(OverlayContainer);
  readonly isDark$: WritableSignal<boolean> = signal(this.readStorage());

  constructor() {
    effect(() => {
      const isDark = this.isDark$();
      document.body.classList.toggle('dark-theme', isDark);
      this.overlayContainer.getContainerElement().classList.toggle('dark-theme', isDark);
    });
  }

  toggle(): void {
    const next = !this.isDark$();
    this.isDark$.set(next);
    this.writeStorage(next);
  }

  private readStorage(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  }

  private writeStorage(value: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
    }
  }
}
