import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoryCallComponent } from './history-call.component';

describe('HistoryCallComponent', () => {
  let component: HistoryCallComponent;
  let fixture: ComponentFixture<HistoryCallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryCallComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoryCallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
