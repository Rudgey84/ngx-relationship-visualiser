import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { DirectedGraphExperimentComponent } from './directed-graph-experiment.component';
import { ZoomableDirective } from './zoomable.directive';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent,
    DirectedGraphExperimentComponent,
    ZoomableDirective,
  ],
  imports: [BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
