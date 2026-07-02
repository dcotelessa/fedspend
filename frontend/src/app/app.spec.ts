import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { App } from './app';

describe('App', () => {
  function createFixture() {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  }

  it('creates the root component', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  interface NavCase {
    name: string;
    route: string;
  }

  const navTable: NavCase[] = [
    { name: 'Home', route: '/' },
    { name: 'Geography', route: '/geography' },
    { name: 'Agencies', route: '/agencies' },
    { name: 'Disaster', route: '/disaster' },
  ];

  it.each(navTable)('renders a nav link for $name at route $route', ({ route }) => {
    const fixture = createFixture();
    const link = fixture.debugElement.query(By.css(`a[routerLink="${route}"]`));
    expect(link).not.toBeNull();
  });

  interface FooterCase {
    name: string;
    expectedText: string;
  }

  const footerTable: FooterCase[] = [
    { name: 'mentions USASpending.gov', expectedText: 'USASpending.gov' },
    { name: 'mentions OpenFEMA', expectedText: 'OpenFEMA' },
  ];

  it.each(footerTable)('footer $name', ({ expectedText }) => {
    const fixture = createFixture();
    const footer = fixture.debugElement.query(By.css('footer'));
    expect(footer).not.toBeNull();
    expect(footer.nativeElement.textContent).toContain(expectedText);
  });
});
