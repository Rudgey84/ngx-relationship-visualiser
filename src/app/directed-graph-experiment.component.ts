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
      .noMatchesText {
        opacity: 0;
        transition: opacity 0.5s;
        color: red;
      }
      .noMatchesText.show {
        opacity: 1;
      }
      @keyframes floatInFromTop {
        from {
          opacity: 0;
          transform: translateY(-100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .input-group {
        animation-name: floatInFromTop;
        animation-duration: 0.3s;
        animation-fill-mode: forwards;
        position: relative;
      }
      .searchButtonActive {
        outline: none;
        -webkit-box-shadow: inset 0px 0px 5px #323232;
           -moz-box-shadow: inset 0px 0px 5px #323232;
                box-shadow: inset 0px 0px 5px #323232;
      }
      .searchButtonInactive {
        opacity: 1;
      }
      .confirmation-message {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.5s, transform 0.5s;
      }

      .confirmation-message.show {
        opacity: 1;
        transform: translateX(-50%) translateY(-10px);
      }
		</style>

    <div class="page" id="pageId" (window:resize)="onResize($event)">
    <div class="buttonBar">
    <div *ngIf="controls">
      <div class="d-flex justify-content-end">
      <button type="button" class="btn btn-secondary mr-3" (click)="newData()"><i class="bi bi-arrow-counterclockwise"></i></button>
        <div class="btn-group" role="group" aria-label="Controls">
        <button
        type="button"
        id="save_graph"
        class="btn btn-secondary"
        data-toggle="tooltip"
        data-placement="top"
        title="Save data"
        (click)="saveGraph()"
      >
      <i class="bi bi-save"></i>
      </button>
          <button
            type="button"
            id="reset_graph"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Reset data"
            (click)="resetGraph()"
          >
            <i class="bi bi-skip-backward"></i>
          </button>
          <button
            type="button"
            *ngIf="zoom"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Zoom in"
            id="zoom_in"
          >
            <i class="bi bi-zoom-in"></i>
          </button>
          <button
            type="button"
            *ngIf="zoom"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Zoom out"
            id="zoom_out"
          >
            <i class="bi bi-zoom-out"></i>
          </button>
          <button
            type="button"
            *ngIf="zoom"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Zoom reset"
            id="zoom_reset"
            disabled="true"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
          <button
            type="button"
            *ngIf="zoom"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Zoom to fit"
            id="zoom_to_fit"
          >
            <i class="bi bi-arrows-fullscreen"></i>
          </button>
          <button
            type="button"
            *ngIf="zoom"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Select all"
            id="select_all"
          >
            <i class="bi bi-grid-fill"></i>
          </button>
          <button
            type="button"
            *ngIf="zoom"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Invert selection"
            id="toggle_selection"
          >
            <i class="bi bi-ui-checks-grid"></i>
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Toggle search"
            id="toggle_search"
            [ngClass]="{'searchButtonActive': showSearch, 'searchButtonInactive': !showSearch}"
            (click)="toggleSearch()"
          >
            <i class="bi bi-search"></i>
          </button>
        </div>
      </div>
      <div class="input-group mt-3" [hidden]="!showSearch">
        <div class="input-group-prepend">
          <button
            type="button"
            id="prevButton"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Previous"
            disabled
          >
            <i class="bi bi-arrow-left-square"></i>
          </button>
          <button
            type="button"
            id="nextButton"
            class="btn btn-secondary"
            data-toggle="tooltip"
            data-placement="top"
            title="Next"
            disabled
          >
            <i class="bi bi-arrow-right-square"></i>
          </button>
        </div>
        <input
          type="text"
          id="searchInput"
          class="form-control"
          placeholder="Search"
          aria-label="Search"
          aria-describedby="search"
        />
        <div class="input-group-append">
          <button
            class="btn btn-outline-secondary"
            type="button"
            id="searchButton"
            data-toggle="tooltip"
            data-placement="top"
            title="Search"
          >
            <i class="bi bi-search"></i>
          </button>
        </div>
        <div class="input-group-append">
          <button
            class="btn btn-outline-secondary"
            type="button"
            id="clearButton"
            data-toggle="tooltip"
            data-placement="top"
            title="Clear"
            disabled
          >
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
    </div>
    <div id="noMatchesText" class="noMatchesText float-right">No matches found</div>
  </div>
 <div *ngIf="zoom" class="zoomIndicator">
    <span id="zoom_level"></span>
 </div>
 <div class="alert alert-success confirmation-message" [class.show]="showConfirmation" role="alert">
 Saved <i class="bi bi-check-circle"></i>
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
  @Output() saveGraphDataEvent = new EventEmitter<any>();
  public selectedNodesArray;
  public selectedNodeId;
  public selectedLinkArray;
  public saveGraphData;
  public width;
  public showSearch: boolean = false;
  public storageItemName: string;
  public showConfirmation: boolean = false;
  @Input() readOnly: boolean = false;
  @Input() zoom: boolean = true;
  @Input() controls: boolean = true;
  @Input() zoomToFit: boolean = false;
  constructor(
    private directedGraphExperimentService: DirectedGraphExperimentService,
    private contextMenuService: ContextMenuService
  ) {}

  public removeLocalStorageItemsByPrefix(prefix) {
    for (var key in localStorage) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  @Input()
  set data(data: any) {
    this.removeLocalStorageItemsByPrefix("savedData");
    // Generate a random number so we can open two graphs without mixing the data
    const randomNumber = Math.floor(Math.random() * 100000);
    this.storageItemName = 'savedData' + randomNumber;
    // Timeout: The input arrives before the svg is rendered, therefore the nativeElement does not exist
    setTimeout(() => {

      // Take a copy of input for reset
      localStorage.setItem(this.storageItemName, JSON.stringify(data));
      this.directedGraphExperimentService.update(
        data,
        this.graphElement.nativeElement,
        this.zoom, 
        this.zoomToFit
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

  public toggleSearch() {
    this.showSearch = !this.showSearch;
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
    localStorage.removeItem(this.storageItemName);
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

  public saveGraph() {
    this.directedGraphExperimentService.saveGraphData.subscribe(
      (saveGraphData) => {
       // this.saveGraphData = this.removeLinksFromData(saveGraphData);
       this.saveGraphData = saveGraphData
      }
    );
    this.saveGraphDataEvent.emit(this.saveGraphData);
    const saveBtn = document.getElementById('save_graph');
    const resetBtn = document.getElementById('reset_graph');
    saveBtn.setAttribute('disabled', 'true');
    resetBtn.setAttribute('disabled', 'true');
    // Save wont trigger a refresh, so we store the new values until the next refresh or save is executed again
    localStorage.setItem(this.storageItemName, JSON.stringify(this.saveGraphData));

        // Show the confirmation message
        this.showConfirmation = true;

        // After a few seconds, hide the confirmation message
        setTimeout(() => {
          this.showConfirmation = false;
        }, 3000); // Adjust the duration (in milliseconds) as needed
  }

  // public removeLinksFromData(data: any): any {
  //   const newData = { ...data }; 
  //   delete newData.links;
  //   return newData;
  // }

  public resetGraph() {
    const data = JSON.parse(localStorage.getItem(this.storageItemName));
    this.directedGraphExperimentService.resetGraph(
      data,
      this.graphElement.nativeElement,
      this.zoom,
      this.zoomToFit);
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
