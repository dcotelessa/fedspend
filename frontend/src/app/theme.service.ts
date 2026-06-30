import { Injectable, signal, WritableSignal } from '@angular/core';

const STORAGE_KEY = 'fedspend-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark$: WritableSignal<boolean> = signal(this.readStorage());

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
      // localStorage may be unavailable in some environments
    }
  }
}
