import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { DirectedGraphExperimentService } from './visualiser/services/directed-graph-experiment.service';
import { ContextMenuService } from 'ngx-contextmenu';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';

@Component({
  selector: 'dge-directed-graph-experiment',
  template: `
  <div class="page">
  <button (click)="newData()">New data</button>

  <app-context-menus
  (entityDetailsContextMenuEvent)="showEntityContextMenuEvent()"
  (findEntityContextMenuEvent)="siFindEntityDetailsEvent()"
  (createLinkContextMenuEvent)="siCreateLinkEvent()"
  (editLinkContextMenuEvent)="siEditLinkEvent()"
></app-context-menus>

     <svg #svgId width="500" height="700" (contextmenu)="visualiserContextMenus($event)"><g [zoomableOf]="svgId"></g></svg>
     </div>
  `,
})
export class DirectedGraphExperimentComponent implements OnInit {
  @ViewChild('svgId') graphElement: ElementRef;
  @ViewChild(ContextMenusComponent) public contextMenu: ContextMenusComponent;

  public createLinkArray;
  public selectedNodeId;
  public editLinkArray;
  @Input() readOnly: boolean;

  constructor(
    private directedGraphExperimentService: DirectedGraphExperimentService,
    private contextMenuService: ContextMenuService
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
        alert(`node id: ${this.selectedNodeId} was double clicked`);
      }
    );

    this.directedGraphExperimentService.editLinkArray.subscribe(
      (editLinkArray) => {
        this.editLinkArray = editLinkArray;
      }
    );
  }

  @Input()
  set data(data: any) {
    // Timeout: The input arrives before the svg is rendered, therefore the nativeElement does not exist
    setTimeout(() => {
      this.directedGraphExperimentService.update(
        data,
        this.graphElement.nativeElement
      );
    }, 500);
  }

  public visualiserContextMenus(event): void {
    if (!this.readOnly) {
      // ctrl + click on two nodes for link menu
      if (this.createLinkArray?.length === 2) {
        this.contextMenuService.show.next({
          contextMenu: this.contextMenu.createLinkContextMenu,
          event: event,
          item: this.createLinkArray,
        });
        event.stopPropagation();
      } else {
        // We get the ids from different dom levels depending on a click on node text or the node image
        if (
          event.target.localName === 'image' ||
          event.srcElement.parentNode.id === 'nodeText'
        ) {
          this.selectedNodeId =
            event.srcElement.id || event.srcElement.parentNode.__data__.id;
          this.contextMenuService.show.next({
            contextMenu: this.contextMenu.nodeContextMenu,
            event: event,
            item: this.selectedNodeId,
          });
          event.stopPropagation();
        }

        if (event.target.localName === 'textPath') {
          this.contextMenuService.show.next({
            contextMenu: this.contextMenu.editLinkContextMenu,
            event: event,
            item: this.editLinkArray,
          });
          event.stopPropagation();
        }

        if (event.target.localName === 'svg') {
          this.contextMenuService.show.next({
            contextMenu: this.contextMenu.canvasContextMenu,
            event: event,
            item: 'item',
          });

          event.stopPropagation();
        }
      }
      event.preventDefault();
    }
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
