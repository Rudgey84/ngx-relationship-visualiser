import { NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ModalModule } from 'ngx-bootstrap/modal';
import { AppComponent } from './app.component';
import { VisualiserGraphComponent } from './visualiser-graph.component';

@NgModule({
  declarations: [
    AppComponent,
    VisualiserGraphComponent
  ],
  imports: [
    BrowserModule,
    ModalModule.forRoot()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
