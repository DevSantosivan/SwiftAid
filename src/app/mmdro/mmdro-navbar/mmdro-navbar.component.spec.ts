import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MmdroNavbarComponent } from './mmdro-navbar.component';

describe('MmdroNavbarComponent', () => {
  let component: MmdroNavbarComponent;
  let fixture: ComponentFixture<MmdroNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MmdroNavbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MmdroNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
