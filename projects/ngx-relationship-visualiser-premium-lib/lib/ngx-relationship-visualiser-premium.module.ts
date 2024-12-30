import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ContextMenuModule } from '@kreash/ngx-contextmenu';
import { VisualiserGraphComponent } from './visualiser/visualiser-graph/visualiser-graph.component';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';
import { ModalsComponent } from './visualiser/modals/modals.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
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
  exports: [VisualiserGraphComponent]
})

export class NgxRelationshipVisualiserPremiumModule { }
