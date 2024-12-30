import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { NgxRelationshipVisualiserPremiumModule } from '../../projects/ngx-relationship-visualiser-premium-lib/lib/ngx-relationship-visualiser-premium.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    NgxRelationshipVisualiserPremiumModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
