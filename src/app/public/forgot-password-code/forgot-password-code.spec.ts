import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForgotPasswordCode } from './forgot-password-code';

describe('ForgotPasswordCode', () => {
  let component: ForgotPasswordCode;
  let fixture: ComponentFixture<ForgotPasswordCode>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordCode]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordCode);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
