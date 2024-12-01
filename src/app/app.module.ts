import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ContextMenuModule } from '@perfectmemory/ngx-contextmenu';
import { ModalModule } from 'ngx-bootstrap/modal';
import { AppComponent } from './app.component';
import { VisualiserGraphComponent } from './visualiser-graph.component';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';
import { ContextMenuService } from '@perfectmemory/ngx-contextmenu';

@NgModule({
  declarations: [
    AppComponent,
    VisualiserGraphComponent,
    ContextMenusComponent,
  ],
  imports: [
    BrowserModule,
    ContextMenuModule,
    ModalModule.forRoot(),
  ],
  providers: [ContextMenuService],
  bootstrap: [AppComponent]
})
export class AppModule { }
