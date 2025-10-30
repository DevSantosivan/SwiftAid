import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountEdit } from './account-edit';

describe('AccountEdit', () => {
  let component: AccountEdit;
  let fixture: ComponentFixture<AccountEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
