import { Directive, Input, ElementRef, OnInit } from '@angular/core';
import { DirectedGraphExperimentService } from './directed-graph-experiment.service';

@Directive({
  selector: '[zoomableOf]',
})
export class ZoomableDirective implements OnInit {
  @Input('zoomableOf') zoomableOf: ElementRef;

  constructor(
    private directedGraphExperimentService: DirectedGraphExperimentService,
    private _element: ElementRef
  ) {}

  ngOnInit() {
    this.directedGraphExperimentService.applyZoomableBehaviour(
      this.zoomableOf,
      this._element.nativeElement
    );
  }
}
