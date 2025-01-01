import { Component } from '@angular/core';
import { Data } from '../../projects/ngx-relationship-visualiser-lib/lib/models/data.interface';
import { MOCKEDDATA } from '../../projects/ngx-relationship-visualiser-lib/lib/models/mocked-data';

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
