import { Component, ViewChild } from '@angular/core';
import { Data } from './ngx-relationship-visualiser/models/data.interface';
import { MOCKEDDATA } from './ngx-relationship-visualiser/models/mocked-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  public title = 'ngx-relationship-visualiser';
  public mockedData: Data = MOCKEDDATA;

  public saveGraphData(data) {
    console.log("saved Data", data);
  }
}
