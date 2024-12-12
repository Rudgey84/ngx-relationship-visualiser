import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit
} from '@angular/core';
import { VisualiserGraphService } from './visualiser/services/visualiser-graph.service';
import { DagreNodesOnlyLayout } from './visualiser/services/dagre-layout.service';
import { ContextMenuService } from '@kreash/ngx-contextmenu';
import { ContextMenusComponent } from './visualiser/context-menus/context-menus.component';

@Component({
  selector: 'visualiser-graph',
  templateUrl: "./visualiser-graph.component.html",
  styleUrls: ["./visualiser-graph.component.scss"],
})
export class VisualiserGraphComponent
  implements OnInit, OnDestroy, AfterViewInit
{
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
  public savedGraphData: string;
  public showConfirmation: boolean = false;
  public buttonBarRightPosition: string;
  @Input() readOnly: boolean = false;
  @Input() zoom: boolean = true;
  @Input() controls: boolean = true;
  @Input() zoomToFit: boolean = false;
  constructor(
    readonly visualiserGraphService: VisualiserGraphService,
    readonly contextMenuService: ContextMenuService,
    readonly dagreNodesOnlyLayout: DagreNodesOnlyLayout
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
    this.removeLocalStorageItemsByPrefix('savedGraphData');
    // Generate a random number so we can open two graphs without mixing the data
    const irUrn = data.irUrn;
    const randomNumber = Math.floor(Math.random() * 100000);
    this.savedGraphData = `savedGraphData${irUrn}_${randomNumber}`;
    // Timeout: The input arrives before the svg is rendered, therefore the nativeElement does not exist
    setTimeout(() => {
      this.dagreNodesOnlyLayout.renderLayout(data);
      // Take a copy of input for reset
      localStorage.setItem(this.savedGraphData, JSON.stringify(data));
      this.visualiserGraphService.update(
        data,
        this.graphElement.nativeElement,
        this.zoom,
        this.zoomToFit
      );
    }, 500);
  }

  public ngOnInit() {
    this.buttonBarRightPosition = '0';
    localStorage.setItem('nodes', JSON.stringify([]));
    localStorage.removeItem('nodes');
    this.updateWidth();
    // Subscribe to the link selections in d3
    this.visualiserGraphService.selectedNodesArray.subscribe(
      (selectedNodesArray) => {
        this.selectedNodesArray = selectedNodesArray;
      }
    );

    this.visualiserGraphService.dblClickNodePayload.subscribe(
      (dblClickNodePayload) => {
        this.selectedNodeId = dblClickNodePayload[0].id;
        this.viewNodeContextMenuEvent.emit(this.selectedNodeId);
      }
    );

    this.visualiserGraphService.dblClickLinkPayload.subscribe(
      (dblClickLinkPayload) => {
        this.selectedLinkArray = dblClickLinkPayload;
        this.viewLinkContextMenuEvent.emit(this.selectedLinkArray);
      }
    );

    this.visualiserGraphService.selectedLinkArray.subscribe(
      (selectedLinkArray) => {
        this.selectedLinkArray = selectedLinkArray;
      }
    );
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  
    if (this.showSearch) {
      setTimeout(() => {
        const field = document.querySelector('#searchInput') as HTMLInputElement; // Correct selector for the input
        if (field) {
          console.log('Search input is ready for focus:', field);
          field.focus();
          field.setSelectionRange(0, 0); // Move cursor to start (optional)
        } else {
          console.error('Search input not found.');
        }
      }, 0); // Delay to allow DOM rendering
    }
  }

  public onResize(event): void {
    this.updateWidth();
  }

  public updateWidth(): void {
    this.width = document.getElementById('pageId').offsetWidth;
  }

  public ngOnDestroy(): void {
    localStorage.setItem('nodes', JSON.stringify([]));
    localStorage.removeItem('nodes');
    localStorage.removeItem(this.savedGraphData);
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

  public viewLinkEvent(): void {
    this.viewLinkContextMenuEvent.emit(this.selectedLinkArray);
  }
  public viewNodeEvent(): void {
    this.viewNodeContextMenuEvent.emit(this.selectedNodeId);
  }
  public siFindEntityDetailsEvent(): void {
    this.toggleSearch();
  }
  public createLinkEvent(): void {
    this.createLinkContextMenuEvent.emit(this.selectedNodesArray);
  }

  public saveGraph(): void {
    this.visualiserGraphService.saveGraphData.subscribe((saveGraphData) => {
      this.saveGraphData = saveGraphData;
    });

    const nodePositions = this.filterProperties(this.saveGraphData);
    this.saveGraphDataEvent.emit(nodePositions);

    this.disableButtons(true);
    localStorage.setItem(
      this.savedGraphData,
      JSON.stringify(this.saveGraphData)
    );
    this.showConfirmationMessage();
  }

  // Filter out the properties we only need to send to the BE
  private filterProperties(data) {
    const { irUrn, nodes } = data;
    const filteredNodes = nodes.map((node) => {
      const { id, fx, fy } = node;
      return { id, fx: Math.floor(fx), fy: Math.floor(fy) };
    });

    return { irUrn, nodes: filteredNodes };
  }

  public resetGraph(): void {
    const data = JSON.parse(localStorage.getItem(this.savedGraphData));
    this.disableButtons(true);
    this.visualiserGraphService.resetGraph(
      data,
      this.graphElement.nativeElement,
      this.zoom,
      this.zoomToFit
    );
  }

  public layout(): void {
    const data = JSON.parse(localStorage.getItem(this.savedGraphData));
    const newDagreLayout = this.dagreNodesOnlyLayout.initRenderLayout(data);

    this.visualiserGraphService.resetGraph(
      newDagreLayout,
      this.graphElement.nativeElement,
      this.zoom,
      this.zoomToFit
    );
    this.enableButtons();
  }

  private disableButtons(disabled: boolean): void {
    const saveBtn = document.getElementById('save_graph');
    const resetBtn = document.getElementById('reset_graph');
    saveBtn.setAttribute('disabled', String(disabled));
    resetBtn.setAttribute('disabled', String(disabled));
  }

  private showConfirmationMessage(): void {
    this.showConfirmation = true;
    setTimeout(() => {
      this.showConfirmation = false;
    }, 3000);
  }

  private enableButtons(): void {
    const saveBtn = document.getElementById('save_graph');
    const resetBtn = document.getElementById('reset_graph');
    saveBtn.removeAttribute('disabled');
    resetBtn.removeAttribute('disabled');
  }

  public ngAfterViewInit(): void {
    this.registerDragElement();
  }

  private registerDragElement(): void {
    const elmnt = document.getElementById('draggable');
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;

    const dragMouseDown = (e) => {
      e = e || window.event;
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    };

    const elementDrag = (e) => {
      this.buttonBarRightPosition = null;
      e = e || window.event;
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      // limit the element's movement within the boundaries of the page
      const maxWidth = this.width - elmnt.offsetWidth;
      const maxHeight = window.innerHeight - elmnt.offsetHeight;

      let newLeft = elmnt.offsetLeft - pos1;
      let newTop = elmnt.offsetTop - pos2;

      newLeft = Math.max(0, Math.min(newLeft, maxWidth));
      newTop = Math.max(0, Math.min(newTop, maxHeight));

      // set the element's new position:
      elmnt.style.left = newLeft + 'px';
      elmnt.style.top = newTop + 'px';
    };

    const closeDragElement = () => {
      /* stop moving when mouse button is released:*/
      document.onmouseup = null;
      document.onmousemove = null;
    };

    if (document.getElementById(elmnt.id + 'Handle')) {
      /* if present, the header is where you move the DIV from:*/
      document.getElementById(elmnt.id + 'Handle').onmousedown = dragMouseDown;
    } else {
      /* otherwise, move the DIV from anywhere inside the DIV:*/
      elmnt.onmousedown = dragMouseDown;
    }
  }

  public allowDrop(ev): void {
    ev.preventDefault();
  }

  public drag(ev): void {
    ev.dataTransfer.setData('text', ev.target.id);
  }

  public drop(ev): void {
    ev.preventDefault();
    var data = ev.dataTransfer.getData('text');
    ev.target.appendChild(document.getElementById(data));
  }

  newData() {
    this.data = {
      irUrn: '1234',
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
          fx: null,
          fy: null,
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
