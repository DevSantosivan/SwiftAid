import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackingView } from './tracking-view';

describe('TrackingView', () => {
  let component: TrackingView;
  let fixture: ComponentFixture<TrackingView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackingView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackingView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
