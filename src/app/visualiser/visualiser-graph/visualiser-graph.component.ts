import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  TemplateRef
} from '@angular/core';
import { VisualiserGraphService } from '../services/visualiser-graph.service';
import { DagreNodesOnlyLayout } from '../services/dagre-layout.service';
import { ContextMenuService } from '@kreash/ngx-contextmenu';
import { ContextMenusComponent } from '../context-menus/context-menus.component';
import { Data } from '../../models/data.interface';
import { NEWDATA } from '../../models/mocked-data';
import { ModalsComponent } from '../modals/modals.component';
declare var bootbox: any;

@Component({
  selector: 'visualiser-graph',
  templateUrl: "./visualiser-graph.component.html",
  styleUrls: ["./visualiser-graph.component.scss"],
})
export class VisualiserGraphComponent
  implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('svgId') graphElement: ElementRef;
  @ViewChild(ContextMenusComponent) public contextMenu: ContextMenusComponent;
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
  public editLinksData: any = null; 
  @Input() readOnly: boolean = false;
  @Input() zoom: boolean = true;
  @Input() controls: boolean = true;
  @Input() zoomToFit: boolean = false;
  @ViewChild(ModalsComponent) public modalsComponent: ModalsComponent;
  constructor(
    readonly visualiserGraphService: VisualiserGraphService,
    readonly contextMenuService: ContextMenuService,
    readonly dagreNodesOnlyLayout: DagreNodesOnlyLayout
  ) { }

  public removeLocalStorageItemsByPrefix(prefix) {
    for (var key in localStorage) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  @Input()
  set data(data: Data) {
    this.removeLocalStorageItemsByPrefix('savedGraphData');
    // Generate a random number so we can open two graphs without mixing the data
    const dataId = data.dataId;
    const randomNumber = crypto.getRandomValues(new Uint32Array(1))[0];
    this.savedGraphData = `savedGraphData${dataId}_${randomNumber}`;
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

    // Subscribe to the double-click node payload
    this.visualiserGraphService.dblClickNodePayload.subscribe(
      (dblClickNodePayload) => {
        this.selectedNodeId = dblClickNodePayload[0].id;

        if (this.modalsComponent) {
          this.modalsComponent.openModal(this.modalsComponent.viewNodeModal);
        } else {
          console.error('Modal component is not available.');
        }
      }
    );

    // Subscribe to the double-click Link payload
    this.visualiserGraphService.dblClickLinkPayload.subscribe(
      (dblClickLinkPayload) => {
        this.selectedLinkArray = dblClickLinkPayload;

        if (this.modalsComponent) {
          this.modalsComponent.openModal(this.modalsComponent.editLinkLabelModal);
        } else {
          console.error('Modal component is not available.');
        }
      }
    );

    this.visualiserGraphService.selectedLinkArray.subscribe(
      (selectedLinkArray) => {
        this.selectedLinkArray = selectedLinkArray;
      }
    );
  }

  public toggleSearch() {
    this.showSearch = !this.showSearch;

    if (this.showSearch) {
      setTimeout(() => {
        const field = document.querySelector('#searchInput') as HTMLInputElement;
        if (field) {
          field.focus();
          field.setSelectionRange(0, 0);
        } else {
          console.error('Search input not found.');
        }
      }, 0);
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
    const data = JSON.parse(localStorage.getItem(this.savedGraphData));
    if (this.selectedNodesArray?.length === 2) {
      contextMenu = this.contextMenu.createEditLinkContextMenu;
      item = {
        graphData: data,
        selectedNodes: this.selectedNodesArray
    };
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
        contextMenu = this.contextMenu.editLinkLabelContextMenu;
        item = this.selectedLinkArray;
      } else if (localName === 'svg') {
        contextMenu = this.contextMenu.findNodesContextMenu;
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

  public findNodesEvent(): void {
    this.toggleSearch();
  }

  public onConfirmSave(): void {
    bootbox.confirm({
      title: "Save Graph",
      message: "Are you sure you want to save the graph?",
      buttons: {
        confirm: {
          label: 'Yes',
          className: 'btn-success'
        },
        cancel: {
          label: 'No',
          className: 'btn-danger'
        }
      },
      callback: (result) => {
        if (result) {
          this.visualiserGraphService.saveGraphData.subscribe((saveGraphData) => {
            this.saveGraphData = saveGraphData;
          });
      
          this.saveGraphDataEvent.emit(this.saveGraphData);
      
          this.disableButtons(true);
          localStorage.setItem(
            this.savedGraphData,
            JSON.stringify(this.saveGraphData)
          );
          this.showConfirmationMessage();
        }
      }
    });
  }

  public onCreateLink(linkData): void {
    if (this.selectedNodesArray.length === 2) {
      const sourceNode = this.selectedNodesArray[0];
      const targetNode = this.selectedNodesArray[1];

      const relationships = linkData.label.map((label) => ({
        label,
        lineStyle: linkData.lineStyle,
        source: sourceNode.id,
        sourceArrow: linkData.sourceArrow,
        target: targetNode.id,
        targetArrow: linkData.targetArrow,
        linkStrength: linkData.linkStrength,
      }));

      const newLink = {
        source: sourceNode.id,
        target: targetNode.id,
        label: linkData.label,
        lineStyle: linkData.lineStyle,
        sourceArrow: linkData.sourceArrow,
        targetArrow: linkData.targetArrow,
        linkId: `${sourceNode.id}_${targetNode.id}`,
        relationships,
      };

      bootbox.confirm({
        title: "Creating link",
        message: "Creating a link will save graph data, are you sure?",
        buttons: {
          confirm: {
            label: 'Yes',
            className: 'btn-success'
          },
          cancel: {
            label: 'No',
            className: 'btn-danger'
          }
        },
        callback: (result) => {
          if (result) {
            const data = JSON.parse(localStorage.getItem(this.savedGraphData));
            data.links.push(newLink);
            localStorage.setItem(this.savedGraphData, JSON.stringify(data));

            this.data = data;
            this.saveGraphDataEvent.emit(data);
          }
        }
      });
    } else {
      console.error('Please select exactly two nodes to create a link.');
    }
  }

  public handleEditLinksEvent(event: { open: boolean; data: any }) {
    if (event.open) {
      this.openModal('editLinksModal');
      this.editLinksData = event.data;
    }
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

  public applyLayout(): void {
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
    document.querySelectorAll('#save_graph, #reset_graph').forEach(btn => {
      btn.setAttribute('disabled', String(disabled));
    });
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

    const dragMouseDown = (e: MouseEvent): void => {
      // Prevent any default behavior
      e.preventDefault();

      // Get the mouse cursor position at startup
      pos3 = e.clientX;
      pos4 = e.clientY;

      // Set up mouse event listeners
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    };

    const elementDrag = (e: MouseEvent): void => {
      this.buttonBarRightPosition = null;

      // Calculate the new cursor position
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      // Limit the element's movement within the boundaries of the page
      const maxWidth = this.width - elmnt.offsetWidth;
      const maxHeight = window.innerHeight - elmnt.offsetHeight;

      let newLeft = elmnt.offsetLeft - pos1;
      let newTop = elmnt.offsetTop - pos2;

      newLeft = Math.max(0, Math.min(newLeft, maxWidth));
      newTop = Math.max(0, Math.min(newTop, maxHeight));

      // Set the element's new position
      elmnt.style.left = `${newLeft}px`;
      elmnt.style.top = `${newTop}px`;
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

  openModal(modal: string) {
    const modalTemplate = this.modalsComponent[modal] as TemplateRef<any>;
    if (modalTemplate) {
      this.modalsComponent.openModal(modalTemplate);
    } else {
      console.error(`Modal template ${modal} is not available.`);
    }
  }

  newData() {
    this.data = NEWDATA;
  }
}
