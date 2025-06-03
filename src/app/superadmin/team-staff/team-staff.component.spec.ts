import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamStaffComponent } from './team-staff.component';

describe('TeamStaffComponent', () => {
  let component: TeamStaffComponent;
  let fixture: ComponentFixture<TeamStaffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamStaffComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamStaffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
