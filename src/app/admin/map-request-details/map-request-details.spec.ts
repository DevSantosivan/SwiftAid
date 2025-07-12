import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapRequestDetails } from './map-request-details';

describe('MapRequestDetails', () => {
  let component: MapRequestDetails;
  let fixture: ComponentFixture<MapRequestDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapRequestDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapRequestDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
