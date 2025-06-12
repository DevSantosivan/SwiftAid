import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapRequest } from './map-request';

describe('MapRequest', () => {
  let component: MapRequest;
  let fixture: ComponentFixture<MapRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapRequest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
