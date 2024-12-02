import { NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ContextMenuModule } from '@kreash/ngx-contextmenu';
import { AppComponent } from './app.component';
import { VisualiserGraphComponent } from './visualiser-graph.component';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';

@NgModule({
  declarations: [
    AppComponent,
    VisualiserGraphComponent,
    ContextMenusComponent
  ],
  imports: [
    BrowserModule,
    ModalModule.forRoot(),
    ContextMenuModule.forRoot({useBootstrap4: true})
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
