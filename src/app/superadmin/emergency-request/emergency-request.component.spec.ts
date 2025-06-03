import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmergencyRequestComponent } from './emergency-request.component';

describe('EmergencyRequestComponent', () => {
  let component: EmergencyRequestComponent;
  let fixture: ComponentFixture<EmergencyRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencyRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmergencyRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
