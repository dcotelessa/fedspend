import { Component, OnInit } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatToolbarModule, MatSlideToggleModule, RouterLink, RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(public readonly theme: ThemeService) {}

  ngOnInit(): void {
    const isDark = this.theme.isDark$();
    document.body.classList.toggle('dark-theme', isDark);
  }
}
