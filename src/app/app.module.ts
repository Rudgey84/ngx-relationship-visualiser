import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ContextMenuModule } from 'ngx-contextmenu';
import { ModalModule } from 'ngx-bootstrap/modal';
import { AppComponent } from './app.component';
import { VisualiserGraphComponent } from './visualiser-graph.component';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';

@NgModule({
  declarations: [
    AppComponent,
    VisualiserGraphComponent,
    ContextMenusComponent,
  ],
  imports: [
    BrowserModule,
    ContextMenuModule.forRoot({ useBootstrap4: true }),
    ModalModule.forRoot(),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule { }
