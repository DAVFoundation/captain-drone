import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DroneComponent } from './drone.component';

describe('DroneComponent', () => {
  let component: DroneComponent;
  let fixture: ComponentFixture<DroneComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DroneComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DroneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
