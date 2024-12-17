import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MMDROComponent } from './mmdro.component';

describe('MMDROComponent', () => {
  let component: MMDROComponent;
  let fixture: ComponentFixture<MMDROComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MMDROComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MMDROComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
