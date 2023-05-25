import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { DirectedGraphExperimentService } from './visualiser/services/directed-graph-experiment.service';
import { ContextMenuService } from 'ngx-contextmenu';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';

@Component({
  selector: 'dge-directed-graph-experiment',
  template: `

		<style>
			#zoom_level {
				position: relative;
				background-color: rgba(0, 0, 0, 0.8);
				color: #fff;
				padding: 5px;
				border-radius: 5px;
				opacity: 0;
				transition: opacity 1s ease-in-out;
			}
      .buttonBar {
        position: absolute;
        right: 0px;
        padding: 10px
      }
      .zoomIndicator {
        position: absolute;
        left: 0px;
        padding: 10px
      }
		</style>

  <div class="page" id="pageId" (window:resize)="onResize($event)">
  <div class="buttonBar">
  <button type="button" class="btn btn-secondary mr-3" (click)="newData()">New data</button>
  <button type="button" class="btn btn-secondary mr-3" (click)="resetGraph()">Reset</button>
  <div *ngIf="controls" class="btn-group" role="group" aria-label="Zoom Control">
  <button type="button" *ngIf="zoom" class="btn btn-secondary" data-toggle="tooltip" data-placement="top" title="Zoom in" id="zoom_in"><i class="bi bi-zoom-in"></i></button>
  <button type="button" *ngIf="zoom"  class="btn btn-secondary" data-toggle="tooltip" data-placement="top" title="Zoom out" id="zoom_out"><i class="bi bi-zoom-out"></i></button>
  <button type="button" *ngIf="zoom"  class="btn btn-secondary" data-toggle="tooltip" data-placement="top" title="Zoom reset" id="zoom_reset"><i class="bi bi-arrow-counterclockwise"></i></button>
  <button type="button" *ngIf="zoom" class="btn btn-secondary" data-toggle="tooltip" data-placement="top" title="All in view" id="zoom_all"><i class="bi bi-arrows-fullscreen"></i></button>
  <!--<button type="button" *ngIf="zoom"  class="btn btn-secondary ml-1" id="select_all">Select all</button>-->

  </div>
  </div>
  <div *ngIf="zoom" class="zoomIndicator">
  <span id="zoom_level" ></span>
  </div>
  <app-context-menus
  (viewNodeContextMenuEvent)="viewNodeEvent()"
  (findEntityContextMenuEvent)="siFindEntityDetailsEvent()"
  (createLinkContextMenuEvent)="createLinkEvent()"
  (viewLinkContextMenuEvent)="viewLinkEvent()"
></app-context-menus>

     <svg #svgId [attr.width]="width" height="780" (contextmenu)="visualiserContextMenus($event)"></svg>
     </div>
  `,
})
export class DirectedGraphExperimentComponent implements OnInit, OnDestroy {
  @ViewChild('svgId') graphElement: ElementRef;
  @ViewChild(ContextMenusComponent) public contextMenu: ContextMenusComponent;
  @Output() viewLinkContextMenuEvent = new EventEmitter<any>();
  @Output() viewNodeContextMenuEvent = new EventEmitter<any>();
  @Output() createLinkContextMenuEvent = new EventEmitter<any>();
  public selectedNodesArray;
  public selectedNodeId;
  public selectedLinkArray;
  public width;

  @Input() readOnly: boolean = false;
  @Input() zoom: boolean = true;
  @Input() controls: boolean = true;
  constructor(
    private directedGraphExperimentService: DirectedGraphExperimentService,
    private contextMenuService: ContextMenuService
  ) {}

  @Input()
  set data(data: any) {
    // Timeout: The input arrives before the svg is rendered, therefore the nativeElement does not exist
    setTimeout(() => {
      // Take a copy of input for reset
      localStorage.setItem('originalData', JSON.stringify(data));
      this.directedGraphExperimentService.update(
        data,
        this.graphElement.nativeElement,
        this.zoom
      );
    }, 500);
  }

  public ngOnInit() {
    localStorage.setItem('nodes', JSON.stringify([]));
    localStorage.removeItem('nodes');
    this.updateWidth();
    // Subscribe to the link selections in d3
    this.directedGraphExperimentService.selectedNodesArray.subscribe(
      (selectedNodesArray) => {
        this.selectedNodesArray = selectedNodesArray;
      }
    );

    this.directedGraphExperimentService.dblClickNodePayload.subscribe(
      (dblClickNodePayload) => {
        this.selectedNodeId = dblClickNodePayload[0].id;
        this.viewNodeContextMenuEvent.emit(this.selectedNodeId);
      }
    );

    this.directedGraphExperimentService.dblClickLinkPayload.subscribe(
      (dblClickLinkPayload) => {
        this.selectedLinkArray = dblClickLinkPayload;
        this.viewLinkContextMenuEvent.emit(this.selectedLinkArray);
      }
    );

    this.directedGraphExperimentService.selectedLinkArray.subscribe(
      (selectedLinkArray) => {
        this.selectedLinkArray = selectedLinkArray;
      }
    );
  }

  public onResize(event) {
    this.updateWidth();
  }

  public updateWidth() {
    this.width = document.getElementById('pageId').offsetWidth;
  }

  public ngOnDestroy() {
    localStorage.setItem('nodes', JSON.stringify([]));
    localStorage.removeItem('nodes');
  }

  public visualiserContextMenus(event): void {
    if (this.readOnly) {
      return;
    }

    let contextMenu;
    let item;

    if (this.selectedNodesArray?.length === 2) {
      contextMenu = this.contextMenu.createLinkContextMenu;
      item = this.selectedNodesArray;
    } else {
      const targetEl = event.target;
      const localName = targetEl.localName;
      const parentNodeId = targetEl.parentNode.id;
      const data = targetEl.parentNode.__data__;
      this.selectedNodeId = targetEl.id || (data && data.id);

      if (localName === 'image' || parentNodeId === 'nodeText') {
        contextMenu = this.contextMenu.viewNodeContextMenu;
        item = this.selectedNodeId;
      } else if (localName === 'textPath') {
        contextMenu = this.contextMenu.viewLinkContextMenu;
        item = this.selectedLinkArray;
      } else if (localName === 'svg') {
        contextMenu = this.contextMenu.canvasContextMenu;
        item = 'item';
      }
    }

    this.contextMenuService.show.next({
      contextMenu,
      event,
      item,
    });

    event.stopPropagation();
    event.preventDefault();
  }

  public viewLinkEvent() {
    this.viewLinkContextMenuEvent.emit(this.selectedLinkArray);
  }
  public viewNodeEvent() {
    this.viewNodeContextMenuEvent.emit(this.selectedNodeId);
  }
  public createLinkEvent() {
    this.createLinkContextMenuEvent.emit(this.selectedNodesArray);
  }

  public resetGraph() {
    this.directedGraphExperimentService.resetGraph(JSON.parse(localStorage.getItem('originalData')),
      this.graphElement.nativeElement,
      this.zoom);
  }

  newData() {
    this.data = {
      nodes: [
        {
          id: '123',
          version: 0,
          typeName: 'men',
          label: ['John Doe', '01/01/1970'],
          icon: '21',
          xpos: 0,
          ypos: 0,
          x: 0,
          y: 0,
          fx: 100,
          fy: 400,
        },
        {
          id: '456',
          version: 0,
          typeName: 'men',
          label: ['Richard Hill', '14/05/1982'],
          icon: '44',
          xpos: 0,
          ypos: 0,
          x: 0,
          y: 0,
          fx: 410,
          fy: 284,
        },
        {
          id: '789',
          version: 0,
          typeName: 'men',
          label: ['Tom Smith', 'Software Developer'],
          icon: '99',
          xpos: 0,
          ypos: 0,
          x: 0,
          y: 0,
          fx: 55,
          fy: 60,
        },
        {
          id: '101112',
          version: 0,
          typeName: 'women',
          label: ['Jane Doe', '13/09/1970'],
          icon: '3',
          xpos: 0,
          ypos: 0,
          x: 0,
          y: 0,
          fx: 377,
          fy: 510,
        },
        {
          id: '131415',
          version: 0,
          typeName: 'women',
          label: ['Rebecca Jones', 'Doctor'],
          icon: '66',
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
          target: '456',
          label: ['Worked at IBM', 'Both in same scrum team'],
          lineStyle: 'Unconfirmed',
          sourceArrow: false,
          targetArrow: true,
          linkId: '1',
          relationships: [
            {
              label: 'Worked at IBM',
              lineStyle: 'Unconfirmed',
              source: '123',
              sourceArrow: false,
              target: '456',
              targetArrow: true,
            },
            {
              label: 'Both in same scrum team',
              lineStyle: 'Confirmed',
              source: '123',
              sourceArrow: true,
              target: '456',
              targetArrow: false,
            },
          ],
        },
        {
          source: '456',
          target: '789',
          label: [
            'Play in the same football team',
            'Daughters in the same class at school',
            'Went on a family holiday together last year',
          ],
          lineStyle: 'Confirmed',
          sourceArrow: true,
          targetArrow: true,
          linkId: '2',
          relationships: [
            {
              label: 'Play in the same football team',
              lineStyle: 'Confirmed',
              source: '456',
              sourceArrow: false,
              target: '789',
              targetArrow: true,
            },
            {
              label: 'Daughters in the same class at school',
              lineStyle: 'Confirmed',
              source: '456',
              sourceArrow: true,
              target: '789',
              targetArrow: false,
            },
            {
              label: 'Went on a family holiday together last year',
              lineStyle: 'Confirmed',
              source: '456',
              sourceArrow: true,
              target: '789',
              targetArrow: false,
            },
          ],
        },
        {
          source: '789',
          target: '123',
          label: ['Drink in the same pub', 'Drinking friends'],
          lineStyle: 'Unconfirmed',
          sourceArrow: true,
          targetArrow: true,
          linkId: '3',
          relationships: [
            {
              label: 'Drink in the same pub',
              lineStyle: 'Unconfirmed',
              source: '789',
              sourceArrow: false,
              target: '123',
              targetArrow: true,
            },
            {
              label: 'Drinking friends',
              lineStyle: 'Unconfirmed',
              source: '789',
              sourceArrow: true,
              target: '123',
              targetArrow: false,
            },
          ],
        },
        {
          source: '123',
          target: '101112',
          label: ['Married'],
          lineStyle: 'Confirmed',
          sourceArrow: true,
          targetArrow: true,
          linkId: '4',
          relationships: [
            {
              label: 'Married',
              lineStyle: 'Unconfirmed',
              source: '123',
              sourceArrow: true,
              target: '101112',
              targetArrow: true,
            },
          ],
        },
      ],
    };
  }
}
