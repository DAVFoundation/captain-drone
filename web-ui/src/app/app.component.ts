import { Component, ViewChild, ViewContainerRef, ComponentFactoryResolver, ComponentRef, ComponentFactory } from '@angular/core';
import { DroneComponent } from './drone/drone.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild('drones', { static: true, read: ViewContainerRef }) drones: ViewContainerRef;

  constructor(private resolver: ComponentFactoryResolver) { }

  addDrone() {
    const factory = this.resolver.resolveComponentFactory(DroneComponent);
    this.drones.createComponent(factory);
  }
}
