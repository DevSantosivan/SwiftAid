import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MmdroAdminComponent } from './mmdro-admin.component';

describe('MmdroAdminComponent', () => {
  let component: MmdroAdminComponent;
  let fixture: ComponentFixture<MmdroAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MmdroAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MmdroAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
