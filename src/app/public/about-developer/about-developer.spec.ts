import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutDeveloper } from './about-developer';

describe('AboutDeveloper', () => {
  let component: AboutDeveloper;
  let fixture: ComponentFixture<AboutDeveloper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutDeveloper]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutDeveloper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
