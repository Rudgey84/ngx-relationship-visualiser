import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { DirectedGraphExperimentComponent } from './directed-graph-experiment.component';
import { AppComponent } from './app.component';
import { ContextMenuModule } from 'ngx-contextmenu';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';
import { ModalModule } from 'ngx-bootstrap/modal';

@NgModule({
  declarations: [
    AppComponent,
    DirectedGraphExperimentComponent,
    ContextMenusComponent
  ],
  imports: [ContextMenuModule.forRoot({useBootstrap4: true}), BrowserModule, ModalModule.forRoot(),],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
