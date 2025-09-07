import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bago } from './bago';

describe('Bago', () => {
  let component: Bago;
  let fixture: ComponentFixture<Bago>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bago]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Bago);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
