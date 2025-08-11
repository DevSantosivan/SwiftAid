import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingAutgate } from './loading-autgate';

describe('LoadingAutgate', () => {
  let component: LoadingAutgate;
  let fixture: ComponentFixture<LoadingAutgate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingAutgate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadingAutgate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
