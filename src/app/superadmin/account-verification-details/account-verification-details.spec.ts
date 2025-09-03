import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountVerificationDetails } from './account-verification-details';

describe('AccountVerificationDetails', () => {
  let component: AccountVerificationDetails;
  let fixture: ComponentFixture<AccountVerificationDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountVerificationDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountVerificationDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
