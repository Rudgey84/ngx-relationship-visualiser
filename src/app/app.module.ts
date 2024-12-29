import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { NgxRelationshipVisualiserModule } from './ngx-relationship-visualiser/ngx-relationship-visualiser.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    NgxRelationshipVisualiserModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
