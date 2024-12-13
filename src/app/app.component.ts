import { Component } from '@angular/core';
import { Data } from './models/data.interface';
import { MOCKEDDATA } from './models/mocked-data';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  public title = 'angular-visualiser';
  public mockedData: Data = MOCKEDDATA;

  public saveGraphData(event) {
    const { irUrn, nodes } = event;
    console.log(irUrn, nodes);
  }
}
