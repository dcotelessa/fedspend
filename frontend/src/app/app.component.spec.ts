import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatToolbarModule } from '@angular/material/toolbar';
import { By } from '@angular/platform-browser';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  interface NavCase {
    name: string;
    route: string;
  }

  const navTable: NavCase[] = [
    { name: 'Dashboard', route: '/' },
    { name: 'Geography', route: '/geography' },
    { name: 'Agencies', route: '/agencies' },
    { name: 'Disaster', route: '/disaster' },
  ];

  interface FooterCase {
    name: string;
    expectedText: string;
  }

  const footerTable: FooterCase[] = [
    { name: 'mentions USASpending.gov', expectedText: 'USASpending.gov' },
    { name: 'mentions OpenFEMA', expectedText: 'OpenFEMA' },
  ];

  function createFixture() {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, MatToolbarModule, AppComponent],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture;
  }

  it.each(navTable)(
    'renders a nav link for $name at route $route',
    ({ route }) => {
      const fixture = createFixture();
      const link = fixture.debugElement.query(By.css(`a[routerLink="${route}"]`));
      expect(link).not.toBeNull();
    },
  );

  it.each(footerTable)(
    'footer $name',
    ({ expectedText }) => {
      const fixture = createFixture();
      const footer = fixture.debugElement.query(By.css('footer'));
      expect(footer).not.toBeNull();
      expect(footer.nativeElement.textContent).toContain(expectedText);
    },
  );
});
