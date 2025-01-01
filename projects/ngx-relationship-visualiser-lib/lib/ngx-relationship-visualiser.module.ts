import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { VisualiserGraphComponent } from './visualiser/visualiser-graph/visualiser-graph.component';

@NgModule({
  declarations: [
    VisualiserGraphComponent
  ],
  imports: [
    BrowserModule
  ],
  exports: [VisualiserGraphComponent]
})

export class NgxRelationshipVisualiserModule { }
