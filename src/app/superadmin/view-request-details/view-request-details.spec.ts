import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewRequestDetails } from './view-request-details';

describe('ViewRequestDetails', () => {
  let component: ViewRequestDetails;
  let fixture: ComponentFixture<ViewRequestDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewRequestDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewRequestDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
