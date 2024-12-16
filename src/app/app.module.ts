import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ContextMenuModule } from '@kreash/ngx-contextmenu';
import { AppComponent } from './app.component';
import { VisualiserGraphComponent } from './visualiser/visualiser-graph/visualiser-graph.component';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';
import { ModalsComponent } from './visualiser/modals/modals.component';

@NgModule({
  declarations: [
    AppComponent,
    VisualiserGraphComponent,
    ContextMenusComponent,
    ModalsComponent
  ],
  imports: [
    BrowserModule,
    ModalModule.forRoot(),
    ContextMenuModule.forRoot({ useBootstrap4: true })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
