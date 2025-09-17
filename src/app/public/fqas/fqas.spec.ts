import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FQAs } from './fqas';

describe('FQAs', () => {
  let component: FQAs;
  let fixture: ComponentFixture<FQAs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FQAs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FQAs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
