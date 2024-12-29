import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ContextMenuModule } from '@kreash/ngx-contextmenu';
import { AppComponent } from './app.component';
import { VisualiserGraphComponent } from './ngx-relationship-visualiser/visualiser/visualiser-graph/visualiser-graph.component';
import { ContextMenusComponent } from './ngx-relationship-visualiser/visualiser/context-menus/context-menus.component';
import { ModalsComponent } from './ngx-relationship-visualiser/visualiser/modals/modals.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    VisualiserGraphComponent,
    ContextMenusComponent,
    ModalsComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    ModalModule.forRoot(),
    ContextMenuModule.forRoot({ useBootstrap4: true }),
    NgSelectModule,
    FormsModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
