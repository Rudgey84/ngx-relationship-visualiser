import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  AfterViewInit,
  TemplateRef
} from '@angular/core';
import { VisualiserGraphService } from '../services/visualiser-graph.service';
import { DagreNodesOnlyLayout } from '../services/dagre-layout.service';
import { ContextMenuService } from '@kreash/ngx-contextmenu';
import { ContextMenusComponent } from '../context-menus/context-menus.component';
import { Data, Link, Relationship } from '../../models/data.interface';
import { NEWDATA } from '../../models/mocked-data';
import { ModalsComponent } from '../modals/modals.component';
import { DexieService } from 'src/app/db/graphDatabase';
declare var bootbox: any;

@Component({
  selector: 'visualiser-graph',
  templateUrl: "./visualiser-graph.component.html",
  styleUrls: ["./visualiser-graph.component.scss"],
})
export class VisualiserGraphComponent implements OnInit, AfterViewInit {
  @ViewChild('svgId') graphElement: ElementRef;
  @ViewChild(ContextMenusComponent) public contextMenu: ContextMenusComponent;
  @Output() saveGraphDataEvent = new EventEmitter<any>();
  public selectedNodesArray;
  public selectedNodeId;
  public selectedLinkArray;
  public saveGraphData;
  public width;
  public showSearch: boolean = false;
  public savedGraphData: Data;
  public showConfirmation: boolean = false;
  public buttonBarRightPosition: string;
  public editLinksData: any = null;
  public editNodeData: any = null;
  @Input() readOnly: boolean = false;
  @Input() zoom: boolean = true;
  @Input() controls: boolean = true;
  @Input() zoomToFit: boolean = false;
  @ViewChild(ModalsComponent) public modalsComponent: ModalsComponent;
  constructor(
    readonly visualiserGraphService: VisualiserGraphService,
    readonly contextMenuService: ContextMenuService,
    readonly dagreNodesOnlyLayout: DagreNodesOnlyLayout,
    private dexieService: DexieService
  ) { }

  @Input()
  set data(data: Data) {
    if (!data || !data.dataId) {
      console.error('Invalid data input');
      return;
    }

    this.savedGraphData = data;

    // Timeout: The input arrives before the svg is rendered, therefore the nativeElement does not exist
    setTimeout(async () => {
      this.dagreNodesOnlyLayout.renderLayout(data);
      // Take a copy of input for reset
      await this.dexieService.saveGraphData(data);

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
        this.handleEditNodesEvent(true);
      }
    );

    // Subscribe to the double-click Link payload
    this.visualiserGraphService.dblClickLinkPayload.subscribe(
      (dblClickLinkPayload) => {
        this.selectedLinkArray = dblClickLinkPayload;
        this.onEditLinkLabel();
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

  public async visualiserContextMenus(event): Promise<void> {
    if (this.readOnly) {
      return;
    }

    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    let contextMenu;
    let item;
    const targetEl = event.target;
    const localName = targetEl.localName;
    const parentNodeId = targetEl.parentNode.id;
    const data = targetEl.parentNode.__data__;
    this.selectedNodeId = targetEl.id || (data && data.id);

    if (this.selectedNodesArray?.length === 2) {
      contextMenu = this.contextMenu.createEditLinkContextMenu;
      item = {
        graphData: this.savedGraphData,
        selectedNodes: this.selectedNodesArray
      };
    } else {
      if (localName === 'image' || parentNodeId === 'nodeText') {
        contextMenu = this.contextMenu.editNodeContextMenu;
        item = this.selectedNodeId;
      } else if (localName === 'textPath') {
        contextMenu = this.contextMenu.editLinkLabelContextMenu;
        item = this.selectedLinkArray;
      } else if (localName === 'svg') {
        contextMenu = this.contextMenu.findCreateNodesContextMenu;
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

    // Update context menu items based on data from Dexie
    const updatedData = await this.dexieService.getGraphData(this.savedGraphData.dataId);
    if (this.selectedNodesArray?.length === 2) {
      item.graphData = updatedData;
    }
  }

  public findCreateNodesEvent(action: string): void {
    if (action === 'findNodes') {
      this.toggleSearch();
    } else if (action === 'createNode') {
      this.opencreateNodeModal();
    }
  }

  private opencreateNodeModal(): void {
    this.modalsComponent.openModal(this.modalsComponent.createNodeModal);
  }

  public async onConfirmSave(): Promise<void> {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    bootbox.confirm({
      title: "Save Graph",
      centerVertical: true,
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
      callback: async (result) => {
        if (result) {
          this.visualiserGraphService.saveGraphData.subscribe((saveGraphData) => {
            this.saveGraphData = saveGraphData;
          });

          this.saveGraphDataEvent.emit(this.saveGraphData);

          this.disableButtons(true);
          this.data = this.saveGraphData;
          this.showConfirmationMessage();
        }
      }
    });
  }

  public async onCreateNode(nodeData): Promise<void> {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);

    // Check if the node already exists
    const existingNodeIndex = data.nodes.findIndex(node => node.id === nodeData.id);

    if (existingNodeIndex === -1) {
      // Generate a unique numeric ID for the new node
      let newId;
      do {
        newId = crypto.getRandomValues(new Uint32Array(1))[0];
      } while (data.nodes.some(node => node.id === newId.toString()));

      nodeData.id = newId.toString();
    }

    bootbox.confirm({
      title: "Creating node",
      centerVertical: true,
      message: "Creating a node will save graph data, are you sure?",
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
      callback: async (result) => {
        if (result) {
          if (existingNodeIndex !== -1) {
            // Update the existing node
            data.nodes[existingNodeIndex] = nodeData;
          } else {
            // Add the new node
            data.nodes.push(nodeData);
          }

          this.data = data;
          this.saveGraphDataEvent.emit(data);
        }
      }
    });
  }

  public async onCreateLink(linkData): Promise<void> {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    // Ensure that exactly two nodes are selected
    if (this.selectedNodesArray.length === 2) {
      const sourceNode = this.selectedNodesArray[0];
      const targetNode = this.selectedNodesArray[1];

      // Retrieve the saved graph data from Dexie
      const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);

      // Find the next available linkIndex
      const allIndexes = data.links.reduce((acc, link) => {
        return acc.concat(link.relationships.map(rel => rel.linkIndex));
      }, []);
      let nextIndex = Math.max(...allIndexes, 0) + 1;

      // Map over the labels and linkStrength values, assuming each label has a corresponding linkStrength
      const relationships: Relationship[] = linkData.label.map((item) => ({
        linkIndex: item.linkIndex !== undefined ? item.linkIndex : nextIndex++,
        label: item.label,
        lineStyle: linkData.lineStyle,
        source: sourceNode.id,
        sourceArrow: linkData.sourceArrow,
        target: targetNode.id,
        targetArrow: linkData.targetArrow,
        linkStrength: item.linkStrength
      }));

      const newLink: Link = {
        source: sourceNode.id,
        target: targetNode.id,
        label: linkData.label.map(item => item.label),
        lineStyle: linkData.lineStyle,
        sourceArrow: linkData.sourceArrow,
        targetArrow: linkData.targetArrow,
        linkId: `${sourceNode.id}_${targetNode.id}`,
        relationships,
      };

      bootbox.confirm({
        title: "Creating link",
        centerVertical: true,
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
        callback: async (result) => {
          if (result) {
            const existingLinkIndex = data.links.findIndex(link =>
              link.linkId === `${sourceNode.id}_${targetNode.id}` || link.linkId === `${targetNode.id}_${sourceNode.id}`
            );
            if (existingLinkIndex !== -1) {
              data.links[existingLinkIndex] = newLink;
            } else {
              data.links.push(newLink);
            }

            this.data = data;
            this.saveGraphDataEvent.emit(data);
          }
        }
      });
    } else {
      console.error('Please select exactly two nodes to create a link.');
    }
  }

  public async onDeleteNode() {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    bootbox.confirm({
      title: "Deleting node",
      centerVertical: true,
      message: "Deleting a node will save graph data, are you sure? This will also delete all links associated with this node.",
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
      callback: async (result) => {
        if (result) {
          const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);

          // Remove the node with the matching id
          data.nodes = data.nodes.filter(node => node.id !== this.selectedNodeId);

          // Remove links with matching source or target
          data.links = data.links.filter(link => link.source !== this.selectedNodeId && link.target !== this.selectedNodeId);

          this.data = data;
          this.saveGraphDataEvent.emit(data);
        }
      }
    });
  }

  public async onDeleteLink(linkId): Promise<void> {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    bootbox.confirm({
      title: "Deleting link",
      centerVertical: true,
      message: "Deleting a link will save graph data, are you sure?",
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
      callback: async (result) => {
        if (result) {
          const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);
          const existingLinkIndex = data.links.findIndex(link => link.linkId === linkId);
          if (existingLinkIndex !== -1) {
            data.links.splice(existingLinkIndex, 1);

            this.data = data;
            this.saveGraphDataEvent.emit(data);
          }
        }
      }
    });
  }

  public async onEditLinkLabel() {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    bootbox.prompt({
      title: "Editing a link label will save graph data, are you sure?",
      centerVertical: true,
      value: this.selectedLinkArray[0].label,
      callback: async (result) => {
        if (result) {
          // Update the label property with the result
          this.selectedLinkArray[0].label = result;

          // Retrieve the saved graph data from Dexie
          const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);

          // Find the link in the data using source and target IDs
          const link = data.links.find(link =>
            (link.source === this.selectedLinkArray[0].source.id && link.target === this.selectedLinkArray[0].target.id) ||
            (link.source === this.selectedLinkArray[0].target.id && link.target === this.selectedLinkArray[0].source.id)
          );

          if (link) {
            // Find the relationship with the same linkIndex
            const relationship = link.relationships.find(rel => rel.linkIndex === this.selectedLinkArray[0].linkIndex);
            if (relationship) {
              // Update the label in the matched object
              relationship.label = result;
            }
            this.data = data;
            this.saveGraphDataEvent.emit(data);
          } else {
            console.error('Link not found.');
          }
        }
      }
    });
  }

  public handleEditLinksEvent(event: { open: boolean; data: any }) {
    if (event.open) {
      this.modalsComponent.openModal(this.modalsComponent.editLinksModal);
      this.editLinksData = event.data;
    }
  }

  public async handleEditNodesEvent(event) {
    if (event) {
      this.modalsComponent.openModal(this.modalsComponent.editNodeModal);
      const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);
      this.editNodeData = data.nodes.find(node => node.id === this.selectedNodeId);
    }
  }

  public async resetGraph(): Promise<void> {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);
    this.disableButtons(true);
    this.visualiserGraphService.resetGraph(
      data,
      this.graphElement.nativeElement,
      this.zoom,
      this.zoomToFit
    );
  }

  public async applyLayout(): Promise<void> {
    if (!this.savedGraphData) {
      console.error('savedGraphData is not set');
      return;
    }

    const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);
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