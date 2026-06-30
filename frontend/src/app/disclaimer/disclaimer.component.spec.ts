import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DisclaimerComponent } from './disclaimer.component';

@Component({
  template: '<disclaimer-component></disclaimer-component>',
  imports: [DisclaimerComponent],
})
class WrapperComponent {}

describe('DisclaimerComponent', () => {
  let fixture: ComponentFixture<WrapperComponent>;

  beforeEach(async () => {
    fixture = TestBed.configureTestingModule({
      imports: [DisclaimerComponent],
    }).createComponent(WrapperComponent);
    await fixture.detectChanges();
  });

  it('should create the component', () => {
    const comp = fixture.debugElement.query(By.directive(DisclaimerComponent));
    expect(comp).toBeTruthy();
  });

  it('should render the disclaimer text', () => {
    const text = fixture.nativeElement.querySelector('disclaimer-component p').textContent;
    expect(text).toContain('analytical estimates');
  });

  it('should render the full disclaimer message', () => {
    const text = fixture.nativeElement.querySelector('disclaimer-component p').textContent;
    expect(text).toContain('Recovery ratios are analytical estimates based on public data');
    expect(text).toContain('Not an official government metric');
  });
});
