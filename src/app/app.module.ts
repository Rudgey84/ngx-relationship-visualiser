import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { DirectedGraphExperimentComponent } from './directed-graph-experiment.component';
import { ZoomableDirective } from './visualiser/directives/zoomable.directive';
import { AppComponent } from './app.component';
import { ContextMenuModule } from 'ngx-contextmenu';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';
@NgModule({
  declarations: [
    AppComponent,
    DirectedGraphExperimentComponent,
    ZoomableDirective,
    ContextMenusComponent
  ],
  imports: [ContextMenuModule.forRoot({useBootstrap4: true}), BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
