import { Component, ViewChild } from '@angular/core';
import { Data } from '../../projects/ngx-relationship-visualiser-premium-lib/lib/models/data.interface';
import { MOCKEDDATA } from '../../projects/ngx-relationship-visualiser-premium-lib/lib/models/mocked-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  public title = 'ngx-relationship-visualiser-premium';
  public mockedData: Data = MOCKEDDATA;

  public saveGraphData(data) {
    console.log("saved Data", data);
  }
}
