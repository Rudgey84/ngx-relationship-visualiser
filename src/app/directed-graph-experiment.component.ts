import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  AfterContentInit,
} from '@angular/core';
import { DirectedGraphExperimentService } from './directed-graph-experiment.service';

@Component({
  selector: 'dge-directed-graph-experiment',
  template: `
  <button (click)="newData()">New data</button>
     <svg #svgId width="500" height="700"><g [zoomableOf]="svgId"></g></svg>
  `,
})
export class DirectedGraphExperimentComponent
  implements OnInit, AfterContentInit
{
  @ViewChild('svgId') graphElement: ElementRef;
  public createLinkArray;
  public selectedNodeId;
  constructor(
    private directedGraphExperimentService: DirectedGraphExperimentService
  ) {}

  public ngOnInit() {
    // Subscribe to the link selections in d3
    this.directedGraphExperimentService.createLinkArray.subscribe(
      (createLinkArray) => {
        this.createLinkArray = createLinkArray;
        console.log(this.createLinkArray);
      }
    );

    this.directedGraphExperimentService.dblClickPayload.subscribe(
      (dblClickPayload) => {
        this.selectedNodeId = dblClickPayload[0].id;
        alert(`node id: ${this.selectedNodeId} was double clicked`, )
      }
    );
  }

  @Input()
  set data(data: any) {
    this.directedGraphExperimentService.update(
      data,
      this.graphElement.nativeElement
    );
  }


  newData() {
    this.data = {
      nodes: [
        {
          id: '2494EA624C3E6F00D2ACC3EF',
          version: 0,
          typeName: 'Motor Vehicle',
          label: ['Pink', 'Panther'],
          icon: 'Car',
          xpos: 0,
          ypos: 0,
          x: 0,
          y: 0,
          fx: null,
          fy: null,
        },
        {
          id: '2494EA62',
          version: 0,
          typeName: 'Motor Vehicle',
          label: ['D1RTY', 'Brown', 'Ford Cortina'],
          icon: 'Car',
          xpos: 0,
          ypos: 0,
          x: 0,
          y: 0,
          fx: null,
          fy: null,
        },
        {
          id: '123',
          version: 0,
          typeName: 'Motor Vehicle',
          label: ['Greg'],
          icon: 'Car',
          xpos: 0,
          ypos: 0,
          x: 0,
          y: 0,
          fx: null,
          fy: null,
        },
      ],

      links: [
        {
          source: '123',
          target: '2494EA62',
          label: ['Criminal associate', 'Dealer'],
          lineStyle: 'Unconfirmed',
          sourceArrow: true,
          targetArrow: true,
          linkId: '1234',
          relationships: [
            {
              label: '(Criminal associate)',
              lineStyle: 'Confirmed',
              source: '123',
              sourceArrow: false,
              target: '2494EA62',
              targetArrow: true,
            },
            {
              label: '(Dealer)',
              lineStyle: 'Confirmed',
              source: '123',
              sourceArrow: true,
              target: '2494EA62',
              targetArrow: false,
            },
          ],
        },
        {
          source: '2494EA624C3E6F00D2ACC3EF',
          target: '2494EA62',
          label: ['Criminal associate', 'Dealer'],
          lineStyle: 'Unconfirmed',
          sourceArrow: true,
          targetArrow: true,
          linkId: '1234',
          relationships: [
            {
              label: '(Criminal associate)',
              lineStyle: 'Confirmed',
              source: '2494EA624C3E6F00D2ACC3EF',
              sourceArrow: false,
              target: '2494EA62',
              targetArrow: true,
            },
            {
              label: '(Dealer)',
              lineStyle: 'Confirmed',
              source: '2494EA624C3E6F00D2ACC3EF',
              sourceArrow: true,
              target: '2494EA62',
              targetArrow: false,
            },
            {
              label: 'Another link',
              lineStyle: 'Confirmed',
              source: '2494EA624C3E6F00D2ACC3EF',
              sourceArrow: true,
              target: '2494EA62',
              targetArrow: false,
            },
            {
              label: 'And Another link',
              lineStyle: 'Confirmed',
              source: '2494EA624C3E6F00D2ACC3EF',
              sourceArrow: true,
              target: '2494EA62',
              targetArrow: false,
            },
          ],
        },
        {
          source: '2494EA624C3E6F00D2ACC3EF',
          target: '123',
          label: ['Criminal associate', 'Dealer'],
          lineStyle: 'Unconfirmed',
          sourceArrow: true,
          targetArrow: true,
          linkId: '1234',
          relationships: [
            {
              label: '(Criminal associate)',
              lineStyle: 'Confirmed',
              source: '2494EA624C3E6F00D2ACC3EF',
              sourceArrow: false,
              target: '123',
              targetArrow: true,
            },
            {
              label: '(Dealer)',
              lineStyle: 'Confirmed',
              source: '2494EA624C3E6F00D2ACC3EF',
              sourceArrow: true,
              target: '123',
              targetArrow: false,
            },
          ],
        },
      ],
    };
  }
}
