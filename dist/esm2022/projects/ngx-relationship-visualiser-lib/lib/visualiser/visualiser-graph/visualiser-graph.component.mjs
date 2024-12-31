import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ContextMenusComponent } from '../context-menus/context-menus.component';
import { ModalsComponent } from '../modals/modals.component';
import * as i0 from "@angular/core";
import * as i1 from "../services/visualiser-graph.service";
import * as i2 from "@kreash/ngx-contextmenu";
import * as i3 from "../services/dagre-layout.service";
import * as i4 from "../../db/graphDatabase";
import * as i5 from "@angular/common";
import * as i6 from "../context-menus/context-menus.component";
import * as i7 from "../modals/modals.component";
export class VisualiserGraphComponent {
    visualiserGraphService;
    contextMenuService;
    dagreNodesOnlyLayout;
    dexieService;
    graphElement;
    contextMenu;
    saveGraphDataEvent = new EventEmitter();
    selectedNodesArray;
    selectedNodeId;
    selectedLinkArray;
    saveGraphData;
    width;
    showSearch = false;
    savedGraphData;
    showConfirmation = false;
    buttonBarRightPosition;
    editLinksData = null;
    editNodeData = null;
    readOnly = true;
    zoom = true;
    controls = false;
    zoomToFit = false;
    modalsComponent;
    constructor(visualiserGraphService, contextMenuService, dagreNodesOnlyLayout, dexieService) {
        this.visualiserGraphService = visualiserGraphService;
        this.contextMenuService = contextMenuService;
        this.dagreNodesOnlyLayout = dagreNodesOnlyLayout;
        this.dexieService = dexieService;
    }
    set data(data) {
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
            this.visualiserGraphService.update(data, this.graphElement.nativeElement, this.zoom, this.zoomToFit);
        }, 500);
    }
    ngOnInit() {
        this.buttonBarRightPosition = '0';
        this.updateWidth();
        // Initialize with default empty data if no data is provided
        if (!this.savedGraphData) {
            console.warn('No data provided, using empty data set');
            this.data = {
                dataId: '1',
                nodes: [],
                links: [],
            };
        }
        // Subscribe to the link selections in d3
        this.visualiserGraphService.selectedNodesArray.subscribe((selectedNodesArray) => {
            this.selectedNodesArray = selectedNodesArray;
        });
        // Subscribe to the double-click node payload
        this.visualiserGraphService.dblClickNodePayload.subscribe((dblClickNodePayload) => {
            this.selectedNodeId = dblClickNodePayload[0].id;
            if (!this.readOnly) {
                this.handleEditNodesEvent(true);
            }
        });
        // Subscribe to the double-click Link payload
        this.visualiserGraphService.dblClickLinkPayload.subscribe((dblClickLinkPayload) => {
            this.selectedLinkArray = dblClickLinkPayload;
            if (!this.readOnly) {
                this.onEditLinkLabel();
            }
        });
        this.visualiserGraphService.selectedLinkArray.subscribe((selectedLinkArray) => {
            this.selectedLinkArray = selectedLinkArray;
        });
    }
    toggleSearch() {
        this.showSearch = !this.showSearch;
        if (this.showSearch) {
            setTimeout(() => {
                const field = document.querySelector('#searchInput');
                if (field) {
                    field.focus();
                    field.setSelectionRange(0, 0);
                }
                else {
                    console.error('Search input not found.');
                }
            }, 0);
        }
    }
    onResize(event) {
        this.updateWidth();
    }
    updateWidth() {
        this.width = document.getElementById('pageId').offsetWidth;
    }
    async visualiserContextMenus(event) {
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
        }
        else {
            if (localName === 'text' || localName === 'image' || parentNodeId === 'nodeText') {
                contextMenu = this.contextMenu.editNodeContextMenu;
                item = this.selectedNodeId;
            }
            else if (localName === 'textPath') {
                contextMenu = this.contextMenu.editLinkLabelContextMenu;
                item = this.selectedLinkArray;
            }
            else if (localName === 'svg') {
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
    findCreateNodesEvent(action) {
        if (action === 'findNodes') {
            this.toggleSearch();
        }
        else if (action === 'createNode') {
            this.opencreateNodeModal();
        }
    }
    opencreateNodeModal() {
        this.modalsComponent.openModal(this.modalsComponent.createNodeModal);
    }
    async onConfirmSave() {
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
    async onCreateNode(nodeData) {
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
                    }
                    else {
                        // Add the new node
                        data.nodes.push(nodeData);
                    }
                    this.data = data;
                    this.saveGraphDataEvent.emit(data);
                }
            }
        });
    }
    async onCreateLink(linkData) {
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
            // Find the next available labelIndex
            const allIndexes = data.links.reduce((acc, link) => {
                return acc.concat(link.relationships.map(rel => rel.labelIndex));
            }, []);
            let nextIndex = Math.max(...allIndexes, 0) + 1;
            // Map over the labels and linkIcon values, assuming each label has a corresponding linkIcon
            const relationships = linkData.label.map((item) => ({
                labelIndex: item.labelIndex !== undefined ? item.labelIndex : nextIndex++,
                label: item.label,
                source: sourceNode.id,
                target: targetNode.id,
                linkIcon: item.linkIcon
            }));
            const newLink = {
                source: sourceNode.id,
                target: targetNode.id,
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
                        const existingLinkIndex = data.links.findIndex(link => link.linkId === `${sourceNode.id}_${targetNode.id}` || link.linkId === `${targetNode.id}_${sourceNode.id}`);
                        if (existingLinkIndex !== -1) {
                            data.links[existingLinkIndex] = newLink;
                        }
                        else {
                            data.links.push(newLink);
                        }
                        this.data = data;
                        this.saveGraphDataEvent.emit(data);
                    }
                }
            });
        }
        else {
            console.error('Please select exactly two nodes to create a link.');
        }
    }
    async onDeleteNode() {
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
    async onDeleteLink(linkId) {
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
    async onEditLinkLabel() {
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
                    const link = data.links.find(link => (link.source === this.selectedLinkArray[0].source.id && link.target === this.selectedLinkArray[0].target.id) ||
                        (link.source === this.selectedLinkArray[0].target.id && link.target === this.selectedLinkArray[0].source.id));
                    if (link) {
                        // Find the relationship with the same labelIndex
                        const relationship = link.relationships.find(rel => rel.labelIndex === this.selectedLinkArray[0].labelIndex);
                        if (relationship) {
                            // Update the label in the matched object
                            relationship.label = result;
                        }
                        this.data = data;
                        this.saveGraphDataEvent.emit(data);
                    }
                    else {
                        console.error('Link not found.');
                    }
                }
            }
        });
    }
    handleEditLinksEvent(event) {
        if (event.open) {
            this.modalsComponent.openModal(this.modalsComponent.editLinksModal);
            this.editLinksData = event.data;
        }
    }
    async handleEditNodesEvent(event) {
        if (event) {
            this.modalsComponent.openModal(this.modalsComponent.editNodeModal);
            const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);
            this.editNodeData = data.nodes.find(node => node.id === this.selectedNodeId);
        }
    }
    async resetGraph() {
        if (!this.savedGraphData) {
            console.error('savedGraphData is not set');
            return;
        }
        const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);
        this.disableButtons(true);
        this.visualiserGraphService.resetGraph(data, this.graphElement.nativeElement, this.zoom, this.zoomToFit);
    }
    async applyLayout() {
        if (!this.savedGraphData) {
            console.error('savedGraphData is not set');
            return;
        }
        const data = await this.dexieService.getGraphData(this.savedGraphData.dataId);
        const newDagreLayout = this.dagreNodesOnlyLayout.initRenderLayout(data);
        this.visualiserGraphService.resetGraph(newDagreLayout, this.graphElement.nativeElement, this.zoom, this.zoomToFit);
        this.enableButtons();
    }
    disableButtons(disabled) {
        document.querySelectorAll('#save_graph, #reset_graph').forEach(btn => {
            btn.setAttribute('disabled', String(disabled));
        });
    }
    showConfirmationMessage() {
        this.showConfirmation = true;
        setTimeout(() => {
            this.showConfirmation = false;
        }, 3000);
    }
    enableButtons() {
        const saveBtn = document.getElementById('save_graph');
        const resetBtn = document.getElementById('reset_graph');
        saveBtn.removeAttribute('disabled');
        resetBtn.removeAttribute('disabled');
    }
    ngAfterViewInit() {
        this.registerDragElement();
    }
    registerDragElement() {
        const elmnt = document.getElementById('draggable');
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const dragMouseDown = (e) => {
            // Prevent any default behavior
            e.preventDefault();
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Set up mouse event listeners
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };
        const elementDrag = (e) => {
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
        }
        else {
            /* otherwise, move the DIV from anywhere inside the DIV:*/
            elmnt.onmousedown = dragMouseDown;
        }
    }
    openModal(modal) {
        const modalTemplate = this.modalsComponent[modal];
        if (modalTemplate) {
            this.modalsComponent.openModal(modalTemplate);
        }
        else {
            console.error(`Modal template ${modal} is not available.`);
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, deps: [{ token: i1.VisualiserGraphService }, { token: i2.ContextMenuService }, { token: i3.DagreNodesOnlyLayout }, { token: i4.DexieService }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: VisualiserGraphComponent, selector: "visualiser-graph", inputs: { zoom: "zoom", zoomToFit: "zoomToFit", data: "data" }, outputs: { saveGraphDataEvent: "saveGraphDataEvent" }, viewQueries: [{ propertyName: "graphElement", first: true, predicate: ["svgId"], descendants: true }, { propertyName: "contextMenu", first: true, predicate: ContextMenusComponent, descendants: true }, { propertyName: "modalsComponent", first: true, predicate: ModalsComponent, descendants: true }], ngImport: i0, template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div id=\"draggable\" class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div *ngIf=\"controls\">\n      <div class=\"d-flex justify-content-end\">\n        <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n          <button type=\"button\" id=\"draggableHandle\" class=\"btn btn-light\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Move toolbar\">\n            <i class=\"bi bi-grip-vertical\"></i>\n          </button>\n\n          <button type=\"button\" id=\"dagre_layout\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Dagre layout\" (click)=\"applyLayout()\">\n            <i class=\"bi bi-diagram-3\"></i>\n          </button>\n          <button type=\"button\" id=\"save_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Save data\" (click)=\"onConfirmSave()\">\n            <i class=\"bi bi-save\"></i>\n          </button>\n          <button type=\"button\" id=\"reset_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Reset data\" (click)=\"resetGraph()\">\n            <i class=\"bi bi-skip-backward\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom in\" id=\"zoom_in\">\n            <i class=\"bi bi-zoom-in\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom out\" id=\"zoom_out\">\n            <i class=\"bi bi-zoom-out\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom reset\" id=\"zoom_reset\" disabled=\"true\">\n            <i class=\"bi bi-arrow-counterclockwise\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom to fit\" id=\"zoom_to_fit\">\n            <i class=\"bi bi-arrows-fullscreen\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Select all\" id=\"select_all\">\n            <i class=\"bi bi-grid-fill\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Invert selection\" id=\"toggle_selection\">\n            <i class=\"bi bi-ui-checks-grid\"></i>\n          </button>\n          <button type=\"button\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Toggle search\" id=\"toggle_search\"\n            [ngClass]=\"{'searchButtonActive': showSearch, 'searchButtonInactive': !showSearch}\"\n            (click)=\"toggleSearch()\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n      </div>\n      <div class=\"search float-right input-group mt-3 pr-0\" [hidden]=\"!showSearch\">\n        <div class=\"input-group-prepend\">\n          <button type=\"button\" id=\"prevButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Previous\" disabled>\n            <i class=\"bi bi-arrow-left-square\"></i>\n          </button>\n          <button type=\"button\" id=\"nextButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Next\" disabled>\n            <i class=\"bi bi-arrow-right-square\"></i>\n          </button>\n        </div>\n        <input type=\"text\" id=\"searchInput\" class=\"form-control\" placeholder=\"Search\" aria-label=\"Search\"\n          aria-describedby=\"search\" />\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"searchButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Search\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"clearButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Clear\" disabled>\n            clear\n          </button>\n        </div>\n      </div>\n    </div>\n    <div [hidden]=\"!showSearch\" id=\"noMatchesText\" class=\"noMatchesText float-right\">No matches found</div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n\n  <app-context-menus\n  (editNodeContextMenuEvent)=\"handleEditNodesEvent($event)\"\n  (findCreateNodesContextMenuEvent)=\"findCreateNodesEvent($event)\"\n  (createLinkContextMenuEvent)=\"openModal('createLinkModal')\"\n  (editLinkLabelContextMenuEvent)=\"onEditLinkLabel()\"\n  (editLinksContextMenuEvent)=\"handleEditLinksEvent($event)\">\n  </app-context-menus>\n\n  <app-modals\n  [editNodeData]=\"editNodeData\"\n  [editLinksData]=\"editLinksData\"\n  (createLinkEvent)=\"onCreateLink($event)\"\n  (createNodeEvent)=\"onCreateNode($event)\"\n  (deleteLinkEvent)=\"onDeleteLink($event)\"\n  (deleteNodeEvent)=\"onDeleteNode()\">\n  </app-modals>\n\n  <svg #svgId [attr.width]=\"width\" height=\"780\" (contextmenu)=\"visualiserContextMenus($event)\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.buttonBar{position:absolute;padding:10px}.zoomIndicator{position:absolute;left:0;padding:10px}.noMatchesText{opacity:0;transition:opacity .5s;color:red}.noMatchesText.show{opacity:1}@keyframes floatInFromTop{0%{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}.input-group{animation-name:floatInFromTop;animation-duration:.3s;animation-fill-mode:forwards;position:relative;width:407px}.searchButtonActive{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonActive:focus,.searchButtonActive:active{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonInactive{opacity:1;outline:none;box-shadow:none;background-color:#6c757d!important;border-color:#6c757d!important}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}#draggableHandle{cursor:move}\n"], dependencies: [{ kind: "directive", type: i5.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: i5.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "component", type: i6.ContextMenusComponent, selector: "app-context-menus", outputs: ["editNodeContextMenuEvent", "findCreateNodesContextMenuEvent", "createLinkContextMenuEvent", "editLinkLabelContextMenuEvent", "editLinksContextMenuEvent"] }, { kind: "component", type: i7.ModalsComponent, selector: "app-modals", inputs: ["editNodeData", "editLinksData"], outputs: ["closeModalEvent", "createLinkEvent", "createNodeEvent", "deleteLinkEvent", "deleteNodeEvent"] }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, decorators: [{
            type: Component,
            args: [{ selector: 'visualiser-graph', template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div id=\"draggable\" class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div *ngIf=\"controls\">\n      <div class=\"d-flex justify-content-end\">\n        <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n          <button type=\"button\" id=\"draggableHandle\" class=\"btn btn-light\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Move toolbar\">\n            <i class=\"bi bi-grip-vertical\"></i>\n          </button>\n\n          <button type=\"button\" id=\"dagre_layout\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Dagre layout\" (click)=\"applyLayout()\">\n            <i class=\"bi bi-diagram-3\"></i>\n          </button>\n          <button type=\"button\" id=\"save_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Save data\" (click)=\"onConfirmSave()\">\n            <i class=\"bi bi-save\"></i>\n          </button>\n          <button type=\"button\" id=\"reset_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Reset data\" (click)=\"resetGraph()\">\n            <i class=\"bi bi-skip-backward\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom in\" id=\"zoom_in\">\n            <i class=\"bi bi-zoom-in\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom out\" id=\"zoom_out\">\n            <i class=\"bi bi-zoom-out\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom reset\" id=\"zoom_reset\" disabled=\"true\">\n            <i class=\"bi bi-arrow-counterclockwise\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom to fit\" id=\"zoom_to_fit\">\n            <i class=\"bi bi-arrows-fullscreen\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Select all\" id=\"select_all\">\n            <i class=\"bi bi-grid-fill\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Invert selection\" id=\"toggle_selection\">\n            <i class=\"bi bi-ui-checks-grid\"></i>\n          </button>\n          <button type=\"button\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Toggle search\" id=\"toggle_search\"\n            [ngClass]=\"{'searchButtonActive': showSearch, 'searchButtonInactive': !showSearch}\"\n            (click)=\"toggleSearch()\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n      </div>\n      <div class=\"search float-right input-group mt-3 pr-0\" [hidden]=\"!showSearch\">\n        <div class=\"input-group-prepend\">\n          <button type=\"button\" id=\"prevButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Previous\" disabled>\n            <i class=\"bi bi-arrow-left-square\"></i>\n          </button>\n          <button type=\"button\" id=\"nextButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Next\" disabled>\n            <i class=\"bi bi-arrow-right-square\"></i>\n          </button>\n        </div>\n        <input type=\"text\" id=\"searchInput\" class=\"form-control\" placeholder=\"Search\" aria-label=\"Search\"\n          aria-describedby=\"search\" />\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"searchButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Search\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"clearButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Clear\" disabled>\n            clear\n          </button>\n        </div>\n      </div>\n    </div>\n    <div [hidden]=\"!showSearch\" id=\"noMatchesText\" class=\"noMatchesText float-right\">No matches found</div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n\n  <app-context-menus\n  (editNodeContextMenuEvent)=\"handleEditNodesEvent($event)\"\n  (findCreateNodesContextMenuEvent)=\"findCreateNodesEvent($event)\"\n  (createLinkContextMenuEvent)=\"openModal('createLinkModal')\"\n  (editLinkLabelContextMenuEvent)=\"onEditLinkLabel()\"\n  (editLinksContextMenuEvent)=\"handleEditLinksEvent($event)\">\n  </app-context-menus>\n\n  <app-modals\n  [editNodeData]=\"editNodeData\"\n  [editLinksData]=\"editLinksData\"\n  (createLinkEvent)=\"onCreateLink($event)\"\n  (createNodeEvent)=\"onCreateNode($event)\"\n  (deleteLinkEvent)=\"onDeleteLink($event)\"\n  (deleteNodeEvent)=\"onDeleteNode()\">\n  </app-modals>\n\n  <svg #svgId [attr.width]=\"width\" height=\"780\" (contextmenu)=\"visualiserContextMenus($event)\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.buttonBar{position:absolute;padding:10px}.zoomIndicator{position:absolute;left:0;padding:10px}.noMatchesText{opacity:0;transition:opacity .5s;color:red}.noMatchesText.show{opacity:1}@keyframes floatInFromTop{0%{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}.input-group{animation-name:floatInFromTop;animation-duration:.3s;animation-fill-mode:forwards;position:relative;width:407px}.searchButtonActive{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonActive:focus,.searchButtonActive:active{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonInactive{opacity:1;outline:none;box-shadow:none;background-color:#6c757d!important;border-color:#6c757d!important}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}#draggableHandle{cursor:move}\n"] }]
        }], ctorParameters: () => [{ type: i1.VisualiserGraphService }, { type: i2.ContextMenuService }, { type: i3.DagreNodesOnlyLayout }, { type: i4.DexieService }], propDecorators: { graphElement: [{
                type: ViewChild,
                args: ['svgId']
            }], contextMenu: [{
                type: ViewChild,
                args: [ContextMenusComponent]
            }], saveGraphDataEvent: [{
                type: Output
            }], zoom: [{
                type: Input
            }], zoomToFit: [{
                type: Input
            }], modalsComponent: [{
                type: ViewChild,
                args: [ModalsComponent]
            }], data: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFNBQVMsRUFFVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLFlBQVksRUFJYixNQUFNLGVBQWUsQ0FBQztBQUl2QixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7Ozs7Ozs7OztBQVM3RCxNQUFNLE9BQU8sd0JBQXdCO0lBcUJ4QjtJQUNBO0lBQ0E7SUFDRDtJQXZCVSxZQUFZLENBQWE7SUFDSixXQUFXLENBQXdCO0lBQ2xFLGtCQUFrQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7SUFDaEQsa0JBQWtCLENBQUM7SUFDbkIsY0FBYyxDQUFDO0lBQ2YsaUJBQWlCLENBQUM7SUFDbEIsYUFBYSxDQUFDO0lBQ2QsS0FBSyxDQUFDO0lBQ04sVUFBVSxHQUFZLEtBQUssQ0FBQztJQUM1QixjQUFjLENBQU87SUFDckIsZ0JBQWdCLEdBQVksS0FBSyxDQUFDO0lBQ2xDLHNCQUFzQixDQUFTO0lBQy9CLGFBQWEsR0FBUSxJQUFJLENBQUM7SUFDMUIsWUFBWSxHQUFRLElBQUksQ0FBQztJQUN4QixRQUFRLEdBQVksSUFBSSxDQUFDO0lBQ3hC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cG9ydCB7XG4gIENvbXBvbmVudCxcbiAgVmlld0NoaWxkLFxuICBFbGVtZW50UmVmLFxuICBJbnB1dCxcbiAgT3V0cHV0LFxuICBFdmVudEVtaXR0ZXIsXG4gIE9uSW5pdCxcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgVGVtcGxhdGVSZWZcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBWaXN1YWxpc2VyR3JhcGhTZXJ2aWNlIH0gZnJvbSAnLi4vc2VydmljZXMvdmlzdWFsaXNlci1ncmFwaC5zZXJ2aWNlJztcbmltcG9ydCB7IERhZ3JlTm9kZXNPbmx5TGF5b3V0IH0gZnJvbSAnLi4vc2VydmljZXMvZGFncmUtbGF5b3V0LnNlcnZpY2UnO1xuaW1wb3J0IHsgQ29udGV4dE1lbnVTZXJ2aWNlIH0gZnJvbSAnQGtyZWFzaC9uZ3gtY29udGV4dG1lbnUnO1xuaW1wb3J0IHsgQ29udGV4dE1lbnVzQ29tcG9uZW50IH0gZnJvbSAnLi4vY29udGV4dC1tZW51cy9jb250ZXh0LW1lbnVzLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBEYXRhLCBMaW5rLCBSZWxhdGlvbnNoaXAgfSBmcm9tICcuLi8uLi9tb2RlbHMvZGF0YS5pbnRlcmZhY2UnO1xuaW1wb3J0IHsgTW9kYWxzQ29tcG9uZW50IH0gZnJvbSAnLi4vbW9kYWxzL21vZGFscy5jb21wb25lbnQnO1xuaW1wb3J0IHsgRGV4aWVTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vZGIvZ3JhcGhEYXRhYmFzZSc7XG5kZWNsYXJlIHZhciBib290Ym94OiBhbnk7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ3Zpc3VhbGlzZXItZ3JhcGgnLFxuICB0ZW1wbGF0ZVVybDogXCIuL3Zpc3VhbGlzZXItZ3JhcGguY29tcG9uZW50Lmh0bWxcIixcbiAgc3R5bGVVcmxzOiBbXCIuL3Zpc3VhbGlzZXItZ3JhcGguY29tcG9uZW50LnNjc3NcIl0sXG59KVxuZXhwb3J0IGNsYXNzIFZpc3VhbGlzZXJHcmFwaENvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgQWZ0ZXJWaWV3SW5pdCB7XG4gIEBWaWV3Q2hpbGQoJ3N2Z0lkJykgZ3JhcGhFbGVtZW50OiBFbGVtZW50UmVmO1xuICBAVmlld0NoaWxkKENvbnRleHRNZW51c0NvbXBvbmVudCkgcHVibGljIGNvbnRleHRNZW51OiBDb250ZXh0TWVudXNDb21wb25lbnQ7XG4gIEBPdXRwdXQoKSBzYXZlR3JhcGhEYXRhRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgcHVibGljIHNlbGVjdGVkTm9kZXNBcnJheTtcbiAgcHVibGljIHNlbGVjdGVkTm9kZUlkO1xuICBwdWJsaWMgc2VsZWN0ZWRMaW5rQXJyYXk7XG4gIHB1YmxpYyBzYXZlR3JhcGhEYXRhO1xuICBwdWJsaWMgd2lkdGg7XG4gIHB1YmxpYyBzaG93U2VhcmNoOiBib29sZWFuID0gZmFsc2U7XG4gIHB1YmxpYyBzYXZlZEdyYXBoRGF0YTogRGF0YTtcbiAgcHVibGljIHNob3dDb25maXJtYXRpb246IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHVibGljIGJ1dHRvbkJhclJpZ2h0UG9zaXRpb246IHN0cmluZztcbiAgcHVibGljIGVkaXRMaW5rc0RhdGE6IGFueSA9IG51bGw7XG4gIHB1YmxpYyBlZGl0Tm9kZURhdGE6IGFueSA9IG51bGw7XG4gIHByaXZhdGUgcmVhZE9ubHk6IGJvb2xlYW4gPSB0cnVlO1xuICBASW5wdXQoKSB6b29tOiBib29sZWFuID0gdHJ1ZTtcbiAgcHVibGljIGNvbnRyb2xzOiBib29sZWFuID0gZmFsc2U7XG4gIEBJbnB1dCgpIHpvb21Ub0ZpdDogYm9vbGVhbiA9IGZhbHNlO1xuICBAVmlld0NoaWxkKE1vZGFsc0NvbXBvbmVudCkgcHVibGljIG1vZGFsc0NvbXBvbmVudDogTW9kYWxzQ29tcG9uZW50O1xuICBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSB2aXN1YWxpc2VyR3JhcGhTZXJ2aWNlOiBWaXN1YWxpc2VyR3JhcGhTZXJ2aWNlLFxuICAgIHJlYWRvbmx5IGNvbnRleHRNZW51U2VydmljZTogQ29udGV4dE1lbnVTZXJ2aWNlLFxuICAgIHJlYWRvbmx5IGRhZ3JlTm9kZXNPbmx5TGF5b3V0OiBEYWdyZU5vZGVzT25seUxheW91dCxcbiAgICBwcml2YXRlIGRleGllU2VydmljZTogRGV4aWVTZXJ2aWNlXG4gICkgeyB9XG5cbiAgQElucHV0KClcbiAgc2V0IGRhdGEoZGF0YTogRGF0YSkge1xuICAgIGlmICghZGF0YSB8fCAhZGF0YS5kYXRhSWQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgZGF0YSBpbnB1dCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2F2ZWRHcmFwaERhdGEgPSBkYXRhO1xuXG4gICAgLy8gVGltZW91dDogVGhlIGlucHV0IGFycml2ZXMgYmVmb3JlIHRoZSBzdmcgaXMgcmVuZGVyZWQsIHRoZXJlZm9yZSB0aGUgbmF0aXZlRWxlbWVudCBkb2VzIG5vdCBleGlzdFxuICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5kYWdyZU5vZGVzT25seUxheW91dC5yZW5kZXJMYXlvdXQoZGF0YSk7XG4gICAgICAvLyBUYWtlIGEgY29weSBvZiBpbnB1dCBmb3IgcmVzZXRcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoZGF0YSk7XG5cbiAgICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS51cGRhdGUoXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHRoaXMuZ3JhcGhFbGVtZW50Lm5hdGl2ZUVsZW1lbnQsXG4gICAgICAgIHRoaXMuem9vbSxcbiAgICAgICAgdGhpcy56b29tVG9GaXRcbiAgICAgICk7XG4gICAgfSwgNTAwKTtcbiAgfVxuXG4gIHB1YmxpYyBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmJ1dHRvbkJhclJpZ2h0UG9zaXRpb24gPSAnMCc7XG4gICAgdGhpcy51cGRhdGVXaWR0aCgpO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSB3aXRoIGRlZmF1bHQgZW1wdHkgZGF0YSBpZiBubyBkYXRhIGlzIHByb3ZpZGVkXG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ05vIGRhdGEgcHJvdmlkZWQsIHVzaW5nIGVtcHR5IGRhdGEgc2V0Jyk7XG4gICAgICB0aGlzLmRhdGEgPSB7XG4gICAgICAgIGRhdGFJZDogJzEnLFxuICAgICAgICBub2RlczogW10sXG4gICAgICAgIGxpbmtzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gU3Vic2NyaWJlIHRvIHRoZSBsaW5rIHNlbGVjdGlvbnMgaW4gZDNcbiAgICB0aGlzLnZpc3VhbGlzZXJHcmFwaFNlcnZpY2Uuc2VsZWN0ZWROb2Rlc0FycmF5LnN1YnNjcmliZShcbiAgICAgIChzZWxlY3RlZE5vZGVzQXJyYXkpID0+IHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZE5vZGVzQXJyYXkgPSBzZWxlY3RlZE5vZGVzQXJyYXk7XG4gICAgICB9XG4gICAgKTtcblxuICAgIC8vIFN1YnNjcmliZSB0byB0aGUgZG91YmxlLWNsaWNrIG5vZGUgcGF5bG9hZFxuICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5kYmxDbGlja05vZGVQYXlsb2FkLnN1YnNjcmliZShcbiAgICAgIChkYmxDbGlja05vZGVQYXlsb2FkKSA9PiB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWROb2RlSWQgPSBkYmxDbGlja05vZGVQYXlsb2FkWzBdLmlkO1xuICAgICAgICBpZighdGhpcy5yZWFkT25seSkge1xuICAgICAgICB0aGlzLmhhbmRsZUVkaXROb2Rlc0V2ZW50KHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcblxuICAgIC8vIFN1YnNjcmliZSB0byB0aGUgZG91YmxlLWNsaWNrIExpbmsgcGF5bG9hZFxuICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5kYmxDbGlja0xpbmtQYXlsb2FkLnN1YnNjcmliZShcbiAgICAgIChkYmxDbGlja0xpbmtQYXlsb2FkKSA9PiB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXkgPSBkYmxDbGlja0xpbmtQYXlsb2FkO1xuICAgICAgICBpZighdGhpcy5yZWFkT25seSkge1xuICAgICAgICB0aGlzLm9uRWRpdExpbmtMYWJlbCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5zZWxlY3RlZExpbmtBcnJheS5zdWJzY3JpYmUoXG4gICAgICAoc2VsZWN0ZWRMaW5rQXJyYXkpID0+IHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZExpbmtBcnJheSA9IHNlbGVjdGVkTGlua0FycmF5O1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgdG9nZ2xlU2VhcmNoKCkge1xuICAgIHRoaXMuc2hvd1NlYXJjaCA9ICF0aGlzLnNob3dTZWFyY2g7XG5cbiAgICBpZiAodGhpcy5zaG93U2VhcmNoKSB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgY29uc3QgZmllbGQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VhcmNoSW5wdXQnKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICBmaWVsZC5mb2N1cygpO1xuICAgICAgICAgIGZpZWxkLnNldFNlbGVjdGlvblJhbmdlKDAsIDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NlYXJjaCBpbnB1dCBub3QgZm91bmQuJyk7XG4gICAgICAgIH1cbiAgICAgIH0sIDApO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBvblJlc2l6ZShldmVudCk6IHZvaWQge1xuICAgIHRoaXMudXBkYXRlV2lkdGgoKTtcbiAgfVxuXG4gIHB1YmxpYyB1cGRhdGVXaWR0aCgpOiB2b2lkIHtcbiAgICB0aGlzLndpZHRoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhZ2VJZCcpLm9mZnNldFdpZHRoO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHZpc3VhbGlzZXJDb250ZXh0TWVudXMoZXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5yZWFkT25seSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBjb250ZXh0TWVudTtcbiAgICBsZXQgaXRlbTtcbiAgICBjb25zdCB0YXJnZXRFbCA9IGV2ZW50LnRhcmdldDtcbiAgICBjb25zdCBsb2NhbE5hbWUgPSB0YXJnZXRFbC5sb2NhbE5hbWU7XG4gICAgY29uc3QgcGFyZW50Tm9kZUlkID0gdGFyZ2V0RWwucGFyZW50Tm9kZS5pZDtcbiAgICBjb25zdCBkYXRhID0gdGFyZ2V0RWwucGFyZW50Tm9kZS5fX2RhdGFfXztcbiAgICB0aGlzLnNlbGVjdGVkTm9kZUlkID0gdGFyZ2V0RWwuaWQgfHwgKGRhdGEgJiYgZGF0YS5pZCk7XG5cbiAgICBpZiAodGhpcy5zZWxlY3RlZE5vZGVzQXJyYXk/Lmxlbmd0aCA9PT0gMikge1xuICAgICAgY29udGV4dE1lbnUgPSB0aGlzLmNvbnRleHRNZW51LmNyZWF0ZUVkaXRMaW5rQ29udGV4dE1lbnU7XG4gICAgICBpdGVtID0ge1xuICAgICAgICBncmFwaERhdGE6IHRoaXMuc2F2ZWRHcmFwaERhdGEsXG4gICAgICAgIHNlbGVjdGVkTm9kZXM6IHRoaXMuc2VsZWN0ZWROb2Rlc0FycmF5XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobG9jYWxOYW1lID09PSAndGV4dCcgfHwgbG9jYWxOYW1lID09PSAnaW1hZ2UnIHx8IHBhcmVudE5vZGVJZCA9PT0gJ25vZGVUZXh0Jykge1xuICAgICAgICBjb250ZXh0TWVudSA9IHRoaXMuY29udGV4dE1lbnUuZWRpdE5vZGVDb250ZXh0TWVudTtcbiAgICAgICAgaXRlbSA9IHRoaXMuc2VsZWN0ZWROb2RlSWQ7XG4gICAgICB9IGVsc2UgaWYgKGxvY2FsTmFtZSA9PT0gJ3RleHRQYXRoJykge1xuICAgICAgICBjb250ZXh0TWVudSA9IHRoaXMuY29udGV4dE1lbnUuZWRpdExpbmtMYWJlbENvbnRleHRNZW51O1xuICAgICAgICBpdGVtID0gdGhpcy5zZWxlY3RlZExpbmtBcnJheTtcbiAgICAgIH0gZWxzZSBpZiAobG9jYWxOYW1lID09PSAnc3ZnJykge1xuICAgICAgICBjb250ZXh0TWVudSA9IHRoaXMuY29udGV4dE1lbnUuZmluZENyZWF0ZU5vZGVzQ29udGV4dE1lbnU7XG4gICAgICAgIGl0ZW0gPSAnaXRlbSc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZXh0TWVudVNlcnZpY2Uuc2hvdy5uZXh0KHtcbiAgICAgIGNvbnRleHRNZW51LFxuICAgICAgZXZlbnQsXG4gICAgICBpdGVtLFxuICAgIH0pO1xuXG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgIC8vIFVwZGF0ZSBjb250ZXh0IG1lbnUgaXRlbXMgYmFzZWQgb24gZGF0YSBmcm9tIERleGllXG4gICAgY29uc3QgdXBkYXRlZERhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuICAgIGlmICh0aGlzLnNlbGVjdGVkTm9kZXNBcnJheT8ubGVuZ3RoID09PSAyKSB7XG4gICAgICBpdGVtLmdyYXBoRGF0YSA9IHVwZGF0ZWREYXRhO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBmaW5kQ3JlYXRlTm9kZXNFdmVudChhY3Rpb246IHN0cmluZyk6IHZvaWQge1xuICAgIGlmIChhY3Rpb24gPT09ICdmaW5kTm9kZXMnKSB7XG4gICAgICB0aGlzLnRvZ2dsZVNlYXJjaCgpO1xuICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAnY3JlYXRlTm9kZScpIHtcbiAgICAgIHRoaXMub3BlbmNyZWF0ZU5vZGVNb2RhbCgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgb3BlbmNyZWF0ZU5vZGVNb2RhbCgpOiB2b2lkIHtcbiAgICB0aGlzLm1vZGFsc0NvbXBvbmVudC5vcGVuTW9kYWwodGhpcy5tb2RhbHNDb21wb25lbnQuY3JlYXRlTm9kZU1vZGFsKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBvbkNvbmZpcm1TYXZlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGJvb3Rib3guY29uZmlybSh7XG4gICAgICB0aXRsZTogXCJTYXZlIEdyYXBoXCIsXG4gICAgICBjZW50ZXJWZXJ0aWNhbDogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHNhdmUgdGhlIGdyYXBoP1wiLFxuICAgICAgYnV0dG9uczoge1xuICAgICAgICBjb25maXJtOiB7XG4gICAgICAgICAgbGFiZWw6ICdZZXMnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1zdWNjZXNzJ1xuICAgICAgICB9LFxuICAgICAgICBjYW5jZWw6IHtcbiAgICAgICAgICBsYWJlbDogJ05vJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tZGFuZ2VyJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2FsbGJhY2s6IGFzeW5jIChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5zYXZlR3JhcGhEYXRhLnN1YnNjcmliZSgoc2F2ZUdyYXBoRGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zYXZlR3JhcGhEYXRhID0gc2F2ZUdyYXBoRGF0YTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YUV2ZW50LmVtaXQodGhpcy5zYXZlR3JhcGhEYXRhKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZUJ1dHRvbnModHJ1ZSk7XG4gICAgICAgICAgdGhpcy5kYXRhID0gdGhpcy5zYXZlR3JhcGhEYXRhO1xuICAgICAgICAgIHRoaXMuc2hvd0NvbmZpcm1hdGlvbk1lc3NhZ2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIG9uQ3JlYXRlTm9kZShub2RlRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIG5vZGUgYWxyZWFkeSBleGlzdHNcbiAgICBjb25zdCBleGlzdGluZ05vZGVJbmRleCA9IGRhdGEubm9kZXMuZmluZEluZGV4KG5vZGUgPT4gbm9kZS5pZCA9PT0gbm9kZURhdGEuaWQpO1xuXG4gICAgaWYgKGV4aXN0aW5nTm9kZUluZGV4ID09PSAtMSkge1xuICAgICAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgbnVtZXJpYyBJRCBmb3IgdGhlIG5ldyBub2RlXG4gICAgICBsZXQgbmV3SWQ7XG4gICAgICBkbyB7XG4gICAgICAgIG5ld0lkID0gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDMyQXJyYXkoMSkpWzBdO1xuICAgICAgfSB3aGlsZSAoZGF0YS5ub2Rlcy5zb21lKG5vZGUgPT4gbm9kZS5pZCA9PT0gbmV3SWQudG9TdHJpbmcoKSkpO1xuXG4gICAgICBub2RlRGF0YS5pZCA9IG5ld0lkLnRvU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgYm9vdGJveC5jb25maXJtKHtcbiAgICAgIHRpdGxlOiBcIkNyZWF0aW5nIG5vZGVcIixcbiAgICAgIGNlbnRlclZlcnRpY2FsOiB0cnVlLFxuICAgICAgbWVzc2FnZTogXCJDcmVhdGluZyBhIG5vZGUgd2lsbCBzYXZlIGdyYXBoIGRhdGEsIGFyZSB5b3Ugc3VyZT9cIixcbiAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgY29uZmlybToge1xuICAgICAgICAgIGxhYmVsOiAnWWVzJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tc3VjY2VzcydcbiAgICAgICAgfSxcbiAgICAgICAgY2FuY2VsOiB7XG4gICAgICAgICAgbGFiZWw6ICdObycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLWRhbmdlcidcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdOb2RlSW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGV4aXN0aW5nIG5vZGVcbiAgICAgICAgICAgIGRhdGEubm9kZXNbZXhpc3RpbmdOb2RlSW5kZXhdID0gbm9kZURhdGE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEFkZCB0aGUgbmV3IG5vZGVcbiAgICAgICAgICAgIGRhdGEubm9kZXMucHVzaChub2RlRGF0YSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgICB0aGlzLnNhdmVHcmFwaERhdGFFdmVudC5lbWl0KGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgb25DcmVhdGVMaW5rKGxpbmtEYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRoYXQgZXhhY3RseSB0d28gbm9kZXMgYXJlIHNlbGVjdGVkXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWROb2Rlc0FycmF5Lmxlbmd0aCA9PT0gMikge1xuICAgICAgY29uc3Qgc291cmNlTm9kZSA9IHRoaXMuc2VsZWN0ZWROb2Rlc0FycmF5WzBdO1xuICAgICAgY29uc3QgdGFyZ2V0Tm9kZSA9IHRoaXMuc2VsZWN0ZWROb2Rlc0FycmF5WzFdO1xuXG4gICAgICAvLyBSZXRyaWV2ZSB0aGUgc2F2ZWQgZ3JhcGggZGF0YSBmcm9tIERleGllXG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcblxuICAgICAgLy8gRmluZCB0aGUgbmV4dCBhdmFpbGFibGUgbGFiZWxJbmRleFxuICAgICAgY29uc3QgYWxsSW5kZXhlcyA9IGRhdGEubGlua3MucmVkdWNlKChhY2MsIGxpbmspID0+IHtcbiAgICAgICAgcmV0dXJuIGFjYy5jb25jYXQobGluay5yZWxhdGlvbnNoaXBzLm1hcChyZWwgPT4gcmVsLmxhYmVsSW5kZXgpKTtcbiAgICAgIH0sIFtdKTtcbiAgICAgIGxldCBuZXh0SW5kZXggPSBNYXRoLm1heCguLi5hbGxJbmRleGVzLCAwKSArIDE7XG5cbiAgICAgIC8vIE1hcCBvdmVyIHRoZSBsYWJlbHMgYW5kIGxpbmtJY29uIHZhbHVlcywgYXNzdW1pbmcgZWFjaCBsYWJlbCBoYXMgYSBjb3JyZXNwb25kaW5nIGxpbmtJY29uXG4gICAgICBjb25zdCByZWxhdGlvbnNoaXBzOiBSZWxhdGlvbnNoaXBbXSA9IGxpbmtEYXRhLmxhYmVsLm1hcCgoaXRlbSkgPT4gKHtcbiAgICAgICAgbGFiZWxJbmRleDogaXRlbS5sYWJlbEluZGV4ICE9PSB1bmRlZmluZWQgPyBpdGVtLmxhYmVsSW5kZXggOiBuZXh0SW5kZXgrKyxcbiAgICAgICAgbGFiZWw6IGl0ZW0ubGFiZWwsXG4gICAgICAgIHNvdXJjZTogc291cmNlTm9kZS5pZCxcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXROb2RlLmlkLFxuICAgICAgICBsaW5rSWNvbjogaXRlbS5saW5rSWNvblxuICAgICAgfSkpO1xuXG4gICAgICBjb25zdCBuZXdMaW5rOiBMaW5rID0ge1xuICAgICAgICBzb3VyY2U6IHNvdXJjZU5vZGUuaWQsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0Tm9kZS5pZCxcbiAgICAgICAgbGluZVN0eWxlOiBsaW5rRGF0YS5saW5lU3R5bGUsXG4gICAgICAgIHNvdXJjZUFycm93OiBsaW5rRGF0YS5zb3VyY2VBcnJvdyxcbiAgICAgICAgdGFyZ2V0QXJyb3c6IGxpbmtEYXRhLnRhcmdldEFycm93LFxuICAgICAgICBsaW5rSWQ6IGAke3NvdXJjZU5vZGUuaWR9XyR7dGFyZ2V0Tm9kZS5pZH1gLFxuICAgICAgICByZWxhdGlvbnNoaXBzLFxuICAgICAgfTtcblxuICAgICAgYm9vdGJveC5jb25maXJtKHtcbiAgICAgICAgdGl0bGU6IFwiQ3JlYXRpbmcgbGlua1wiLFxuICAgICAgICBjZW50ZXJWZXJ0aWNhbDogdHJ1ZSxcbiAgICAgICAgbWVzc2FnZTogXCJDcmVhdGluZyBhIGxpbmsgd2lsbCBzYXZlIGdyYXBoIGRhdGEsIGFyZSB5b3Ugc3VyZT9cIixcbiAgICAgICAgYnV0dG9uczoge1xuICAgICAgICAgIGNvbmZpcm06IHtcbiAgICAgICAgICAgIGxhYmVsOiAnWWVzJyxcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1zdWNjZXNzJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY2FuY2VsOiB7XG4gICAgICAgICAgICBsYWJlbDogJ05vJyxcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1kYW5nZXInXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjYWxsYmFjazogYXN5bmMgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTGlua0luZGV4ID0gZGF0YS5saW5rcy5maW5kSW5kZXgobGluayA9PlxuICAgICAgICAgICAgICBsaW5rLmxpbmtJZCA9PT0gYCR7c291cmNlTm9kZS5pZH1fJHt0YXJnZXROb2RlLmlkfWAgfHwgbGluay5saW5rSWQgPT09IGAke3RhcmdldE5vZGUuaWR9XyR7c291cmNlTm9kZS5pZH1gXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nTGlua0luZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICBkYXRhLmxpbmtzW2V4aXN0aW5nTGlua0luZGV4XSA9IG5ld0xpbms7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkYXRhLmxpbmtzLnB1c2gobmV3TGluayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICB0aGlzLnNhdmVHcmFwaERhdGFFdmVudC5lbWl0KGRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BsZWFzZSBzZWxlY3QgZXhhY3RseSB0d28gbm9kZXMgdG8gY3JlYXRlIGEgbGluay4nKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgb25EZWxldGVOb2RlKCkge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGJvb3Rib3guY29uZmlybSh7XG4gICAgICB0aXRsZTogXCJEZWxldGluZyBub2RlXCIsXG4gICAgICBjZW50ZXJWZXJ0aWNhbDogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6IFwiRGVsZXRpbmcgYSBub2RlIHdpbGwgc2F2ZSBncmFwaCBkYXRhLCBhcmUgeW91IHN1cmU/IFRoaXMgd2lsbCBhbHNvIGRlbGV0ZSBhbGwgbGlua3MgYXNzb2NpYXRlZCB3aXRoIHRoaXMgbm9kZS5cIixcbiAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgY29uZmlybToge1xuICAgICAgICAgIGxhYmVsOiAnWWVzJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tc3VjY2VzcydcbiAgICAgICAgfSxcbiAgICAgICAgY2FuY2VsOiB7XG4gICAgICAgICAgbGFiZWw6ICdObycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLWRhbmdlcidcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcblxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgbm9kZSB3aXRoIHRoZSBtYXRjaGluZyBpZFxuICAgICAgICAgIGRhdGEubm9kZXMgPSBkYXRhLm5vZGVzLmZpbHRlcihub2RlID0+IG5vZGUuaWQgIT09IHRoaXMuc2VsZWN0ZWROb2RlSWQpO1xuXG4gICAgICAgICAgLy8gUmVtb3ZlIGxpbmtzIHdpdGggbWF0Y2hpbmcgc291cmNlIG9yIHRhcmdldFxuICAgICAgICAgIGRhdGEubGlua3MgPSBkYXRhLmxpbmtzLmZpbHRlcihsaW5rID0+IGxpbmsuc291cmNlICE9PSB0aGlzLnNlbGVjdGVkTm9kZUlkICYmIGxpbmsudGFyZ2V0ICE9PSB0aGlzLnNlbGVjdGVkTm9kZUlkKTtcblxuICAgICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgdGhpcy5zYXZlR3JhcGhEYXRhRXZlbnQuZW1pdChkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIG9uRGVsZXRlTGluayhsaW5rSWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBib290Ym94LmNvbmZpcm0oe1xuICAgICAgdGl0bGU6IFwiRGVsZXRpbmcgbGlua1wiLFxuICAgICAgY2VudGVyVmVydGljYWw6IHRydWUsXG4gICAgICBtZXNzYWdlOiBcIkRlbGV0aW5nIGEgbGluayB3aWxsIHNhdmUgZ3JhcGggZGF0YSwgYXJlIHlvdSBzdXJlP1wiLFxuICAgICAgYnV0dG9uczoge1xuICAgICAgICBjb25maXJtOiB7XG4gICAgICAgICAgbGFiZWw6ICdZZXMnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1zdWNjZXNzJ1xuICAgICAgICB9LFxuICAgICAgICBjYW5jZWw6IHtcbiAgICAgICAgICBsYWJlbDogJ05vJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tZGFuZ2VyJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2FsbGJhY2s6IGFzeW5jIChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTGlua0luZGV4ID0gZGF0YS5saW5rcy5maW5kSW5kZXgobGluayA9PiBsaW5rLmxpbmtJZCA9PT0gbGlua0lkKTtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdMaW5rSW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBkYXRhLmxpbmtzLnNwbGljZShleGlzdGluZ0xpbmtJbmRleCwgMSk7XG5cbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICB0aGlzLnNhdmVHcmFwaERhdGFFdmVudC5lbWl0KGRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIG9uRWRpdExpbmtMYWJlbCgpIHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBib290Ym94LnByb21wdCh7XG4gICAgICB0aXRsZTogXCJFZGl0aW5nIGEgbGluayBsYWJlbCB3aWxsIHNhdmUgZ3JhcGggZGF0YSwgYXJlIHlvdSBzdXJlP1wiLFxuICAgICAgY2VudGVyVmVydGljYWw6IHRydWUsXG4gICAgICB2YWx1ZTogdGhpcy5zZWxlY3RlZExpbmtBcnJheVswXS5sYWJlbCxcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhYmVsIHByb3BlcnR5IHdpdGggdGhlIHJlc3VsdFxuICAgICAgICAgIHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXlbMF0ubGFiZWwgPSByZXN1bHQ7XG5cbiAgICAgICAgICAvLyBSZXRyaWV2ZSB0aGUgc2F2ZWQgZ3JhcGggZGF0YSBmcm9tIERleGllXG4gICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG5cbiAgICAgICAgICAvLyBGaW5kIHRoZSBsaW5rIGluIHRoZSBkYXRhIHVzaW5nIHNvdXJjZSBhbmQgdGFyZ2V0IElEc1xuICAgICAgICAgIGNvbnN0IGxpbmsgPSBkYXRhLmxpbmtzLmZpbmQobGluayA9PlxuICAgICAgICAgICAgKGxpbmsuc291cmNlID09PSB0aGlzLnNlbGVjdGVkTGlua0FycmF5WzBdLnNvdXJjZS5pZCAmJiBsaW5rLnRhcmdldCA9PT0gdGhpcy5zZWxlY3RlZExpbmtBcnJheVswXS50YXJnZXQuaWQpIHx8XG4gICAgICAgICAgICAobGluay5zb3VyY2UgPT09IHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXlbMF0udGFyZ2V0LmlkICYmIGxpbmsudGFyZ2V0ID09PSB0aGlzLnNlbGVjdGVkTGlua0FycmF5WzBdLnNvdXJjZS5pZClcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgaWYgKGxpbmspIHtcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIHJlbGF0aW9uc2hpcCB3aXRoIHRoZSBzYW1lIGxhYmVsSW5kZXhcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcCA9IGxpbmsucmVsYXRpb25zaGlwcy5maW5kKHJlbCA9PiByZWwubGFiZWxJbmRleCA9PT0gdGhpcy5zZWxlY3RlZExpbmtBcnJheVswXS5sYWJlbEluZGV4KTtcbiAgICAgICAgICAgIGlmIChyZWxhdGlvbnNoaXApIHtcbiAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYWJlbCBpbiB0aGUgbWF0Y2hlZCBvYmplY3RcbiAgICAgICAgICAgICAgcmVsYXRpb25zaGlwLmxhYmVsID0gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YUV2ZW50LmVtaXQoZGF0YSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0xpbmsgbm90IGZvdW5kLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGhhbmRsZUVkaXRMaW5rc0V2ZW50KGV2ZW50OiB7IG9wZW46IGJvb2xlYW47IGRhdGE6IGFueSB9KSB7XG4gICAgaWYgKGV2ZW50Lm9wZW4pIHtcbiAgICAgIHRoaXMubW9kYWxzQ29tcG9uZW50Lm9wZW5Nb2RhbCh0aGlzLm1vZGFsc0NvbXBvbmVudC5lZGl0TGlua3NNb2RhbCk7XG4gICAgICB0aGlzLmVkaXRMaW5rc0RhdGEgPSBldmVudC5kYXRhO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBoYW5kbGVFZGl0Tm9kZXNFdmVudChldmVudCkge1xuICAgIGlmIChldmVudCkge1xuICAgICAgdGhpcy5tb2RhbHNDb21wb25lbnQub3Blbk1vZGFsKHRoaXMubW9kYWxzQ29tcG9uZW50LmVkaXROb2RlTW9kYWwpO1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG4gICAgICB0aGlzLmVkaXROb2RlRGF0YSA9IGRhdGEubm9kZXMuZmluZChub2RlID0+IG5vZGUuaWQgPT09IHRoaXMuc2VsZWN0ZWROb2RlSWQpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZXNldEdyYXBoKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuICAgIHRoaXMuZGlzYWJsZUJ1dHRvbnModHJ1ZSk7XG4gICAgdGhpcy52aXN1YWxpc2VyR3JhcGhTZXJ2aWNlLnJlc2V0R3JhcGgoXG4gICAgICBkYXRhLFxuICAgICAgdGhpcy5ncmFwaEVsZW1lbnQubmF0aXZlRWxlbWVudCxcbiAgICAgIHRoaXMuem9vbSxcbiAgICAgIHRoaXMuem9vbVRvRml0XG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBhcHBseUxheW91dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcbiAgICBjb25zdCBuZXdEYWdyZUxheW91dCA9IHRoaXMuZGFncmVOb2Rlc09ubHlMYXlvdXQuaW5pdFJlbmRlckxheW91dChkYXRhKTtcblxuICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5yZXNldEdyYXBoKFxuICAgICAgbmV3RGFncmVMYXlvdXQsXG4gICAgICB0aGlzLmdyYXBoRWxlbWVudC5uYXRpdmVFbGVtZW50LFxuICAgICAgdGhpcy56b29tLFxuICAgICAgdGhpcy56b29tVG9GaXRcbiAgICApO1xuICAgIHRoaXMuZW5hYmxlQnV0dG9ucygpO1xuICB9XG5cbiAgcHJpdmF0ZSBkaXNhYmxlQnV0dG9ucyhkaXNhYmxlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyNzYXZlX2dyYXBoLCAjcmVzZXRfZ3JhcGgnKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgICBidG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsIFN0cmluZyhkaXNhYmxlZCkpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93Q29uZmlybWF0aW9uTWVzc2FnZSgpOiB2b2lkIHtcbiAgICB0aGlzLnNob3dDb25maXJtYXRpb24gPSB0cnVlO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5zaG93Q29uZmlybWF0aW9uID0gZmFsc2U7XG4gICAgfSwgMzAwMCk7XG4gIH1cblxuICBwcml2YXRlIGVuYWJsZUJ1dHRvbnMoKTogdm9pZCB7XG4gICAgY29uc3Qgc2F2ZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlX2dyYXBoJyk7XG4gICAgY29uc3QgcmVzZXRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzZXRfZ3JhcGgnKTtcbiAgICBzYXZlQnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICByZXNldEJ0bi5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gIH1cblxuICBwdWJsaWMgbmdBZnRlclZpZXdJbml0KCk6IHZvaWQge1xuICAgIHRoaXMucmVnaXN0ZXJEcmFnRWxlbWVudCgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlckRyYWdFbGVtZW50KCk6IHZvaWQge1xuICAgIGNvbnN0IGVsbW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RyYWdnYWJsZScpO1xuICAgIGxldCBwb3MxID0gMCxcbiAgICAgIHBvczIgPSAwLFxuICAgICAgcG9zMyA9IDAsXG4gICAgICBwb3M0ID0gMDtcblxuICAgIGNvbnN0IGRyYWdNb3VzZURvd24gPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgICAgLy8gUHJldmVudCBhbnkgZGVmYXVsdCBiZWhhdmlvclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAvLyBHZXQgdGhlIG1vdXNlIGN1cnNvciBwb3NpdGlvbiBhdCBzdGFydHVwXG4gICAgICBwb3MzID0gZS5jbGllbnRYO1xuICAgICAgcG9zNCA9IGUuY2xpZW50WTtcblxuICAgICAgLy8gU2V0IHVwIG1vdXNlIGV2ZW50IGxpc3RlbmVyc1xuICAgICAgZG9jdW1lbnQub25tb3VzZXVwID0gY2xvc2VEcmFnRWxlbWVudDtcbiAgICAgIGRvY3VtZW50Lm9ubW91c2Vtb3ZlID0gZWxlbWVudERyYWc7XG4gICAgfTtcblxuICAgIGNvbnN0IGVsZW1lbnREcmFnID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICAgIHRoaXMuYnV0dG9uQmFyUmlnaHRQb3NpdGlvbiA9IG51bGw7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSB0aGUgbmV3IGN1cnNvciBwb3NpdGlvblxuICAgICAgcG9zMSA9IHBvczMgLSBlLmNsaWVudFg7XG4gICAgICBwb3MyID0gcG9zNCAtIGUuY2xpZW50WTtcbiAgICAgIHBvczMgPSBlLmNsaWVudFg7XG4gICAgICBwb3M0ID0gZS5jbGllbnRZO1xuXG4gICAgICAvLyBMaW1pdCB0aGUgZWxlbWVudCdzIG1vdmVtZW50IHdpdGhpbiB0aGUgYm91bmRhcmllcyBvZiB0aGUgcGFnZVxuICAgICAgY29uc3QgbWF4V2lkdGggPSB0aGlzLndpZHRoIC0gZWxtbnQub2Zmc2V0V2lkdGg7XG4gICAgICBjb25zdCBtYXhIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBlbG1udC5vZmZzZXRIZWlnaHQ7XG5cbiAgICAgIGxldCBuZXdMZWZ0ID0gZWxtbnQub2Zmc2V0TGVmdCAtIHBvczE7XG4gICAgICBsZXQgbmV3VG9wID0gZWxtbnQub2Zmc2V0VG9wIC0gcG9zMjtcblxuICAgICAgbmV3TGVmdCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG5ld0xlZnQsIG1heFdpZHRoKSk7XG4gICAgICBuZXdUb3AgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihuZXdUb3AsIG1heEhlaWdodCkpO1xuXG4gICAgICAvLyBTZXQgdGhlIGVsZW1lbnQncyBuZXcgcG9zaXRpb25cbiAgICAgIGVsbW50LnN0eWxlLmxlZnQgPSBgJHtuZXdMZWZ0fXB4YDtcbiAgICAgIGVsbW50LnN0eWxlLnRvcCA9IGAke25ld1RvcH1weGA7XG4gICAgfTtcblxuICAgIGNvbnN0IGNsb3NlRHJhZ0VsZW1lbnQgPSAoKSA9PiB7XG4gICAgICAvKiBzdG9wIG1vdmluZyB3aGVuIG1vdXNlIGJ1dHRvbiBpcyByZWxlYXNlZDoqL1xuICAgICAgZG9jdW1lbnQub25tb3VzZXVwID0gbnVsbDtcbiAgICAgIGRvY3VtZW50Lm9ubW91c2Vtb3ZlID0gbnVsbDtcbiAgICB9O1xuXG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsbW50LmlkICsgJ0hhbmRsZScpKSB7XG4gICAgICAvKiBpZiBwcmVzZW50LCB0aGUgaGVhZGVyIGlzIHdoZXJlIHlvdSBtb3ZlIHRoZSBESVYgZnJvbToqL1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxtbnQuaWQgKyAnSGFuZGxlJykub25tb3VzZWRvd24gPSBkcmFnTW91c2VEb3duO1xuICAgIH0gZWxzZSB7XG4gICAgICAvKiBvdGhlcndpc2UsIG1vdmUgdGhlIERJViBmcm9tIGFueXdoZXJlIGluc2lkZSB0aGUgRElWOiovXG4gICAgICBlbG1udC5vbm1vdXNlZG93biA9IGRyYWdNb3VzZURvd247XG4gICAgfVxuICB9XG5cbiAgb3Blbk1vZGFsKG1vZGFsOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtb2RhbFRlbXBsYXRlID0gdGhpcy5tb2RhbHNDb21wb25lbnRbbW9kYWxdIGFzIFRlbXBsYXRlUmVmPGFueT47XG4gICAgaWYgKG1vZGFsVGVtcGxhdGUpIHtcbiAgICAgIHRoaXMubW9kYWxzQ29tcG9uZW50Lm9wZW5Nb2RhbChtb2RhbFRlbXBsYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcihgTW9kYWwgdGVtcGxhdGUgJHttb2RhbH0gaXMgbm90IGF2YWlsYWJsZS5gKTtcbiAgICB9XG4gIH1cbn0iLCI8ZGl2IGNsYXNzPVwicGFnZVwiIGlkPVwicGFnZUlkXCIgKHdpbmRvdzpyZXNpemUpPVwib25SZXNpemUoJGV2ZW50KVwiPlxuICA8ZGl2IGlkPVwiZHJhZ2dhYmxlXCIgY2xhc3M9XCJidXR0b25CYXJcIiBbc3R5bGUucmlnaHRdPVwiYnV0dG9uQmFyUmlnaHRQb3NpdGlvblwiPlxuICAgIDxkaXYgKm5nSWY9XCJjb250cm9sc1wiPlxuICAgICAgPGRpdiBjbGFzcz1cImQtZmxleCBqdXN0aWZ5LWNvbnRlbnQtZW5kXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJidG4tZ3JvdXBcIiByb2xlPVwiZ3JvdXBcIiBhcmlhLWxhYmVsPVwiQ29udHJvbHNcIj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cImRyYWdnYWJsZUhhbmRsZVwiIGNsYXNzPVwiYnRuIGJ0bi1saWdodFwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiTW92ZSB0b29sYmFyXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLWdyaXAtdmVydGljYWxcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cImRhZ3JlX2xheW91dFwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIkRhZ3JlIGxheW91dFwiIChjbGljayk9XCJhcHBseUxheW91dCgpXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLWRpYWdyYW0tM1wiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cInNhdmVfZ3JhcGhcIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJTYXZlIGRhdGFcIiAoY2xpY2spPVwib25Db25maXJtU2F2ZSgpXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLXNhdmVcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJyZXNldF9ncmFwaFwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlJlc2V0IGRhdGFcIiAoY2xpY2spPVwicmVzZXRHcmFwaCgpXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLXNraXAtYmFja3dhcmRcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgKm5nSWY9XCJ6b29tXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiWm9vbSBpblwiIGlkPVwiem9vbV9pblwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS16b29tLWluXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiICpuZ0lmPVwiem9vbVwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlpvb20gb3V0XCIgaWQ9XCJ6b29tX291dFwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS16b29tLW91dFwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiAqbmdJZj1cInpvb21cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJab29tIHJlc2V0XCIgaWQ9XCJ6b29tX3Jlc2V0XCIgZGlzYWJsZWQ9XCJ0cnVlXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLWFycm93LWNvdW50ZXJjbG9ja3dpc2VcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgKm5nSWY9XCJ6b29tXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiWm9vbSB0byBmaXRcIiBpZD1cInpvb21fdG9fZml0XCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLWFycm93cy1mdWxsc2NyZWVuXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiICpuZ0lmPVwiem9vbVwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlNlbGVjdCBhbGxcIiBpZD1cInNlbGVjdF9hbGxcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktZ3JpZC1maWxsXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiICpuZ0lmPVwiem9vbVwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIkludmVydCBzZWxlY3Rpb25cIiBpZD1cInRvZ2dsZV9zZWxlY3Rpb25cIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktdWktY2hlY2tzLWdyaWRcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiVG9nZ2xlIHNlYXJjaFwiIGlkPVwidG9nZ2xlX3NlYXJjaFwiXG4gICAgICAgICAgICBbbmdDbGFzc109XCJ7J3NlYXJjaEJ1dHRvbkFjdGl2ZSc6IHNob3dTZWFyY2gsICdzZWFyY2hCdXR0b25JbmFjdGl2ZSc6ICFzaG93U2VhcmNofVwiXG4gICAgICAgICAgICAoY2xpY2spPVwidG9nZ2xlU2VhcmNoKClcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktc2VhcmNoXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cInNlYXJjaCBmbG9hdC1yaWdodCBpbnB1dC1ncm91cCBtdC0zIHByLTBcIiBbaGlkZGVuXT1cIiFzaG93U2VhcmNoXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cC1wcmVwZW5kXCI+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJwcmV2QnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiUHJldmlvdXNcIiBkaXNhYmxlZD5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktYXJyb3ctbGVmdC1zcXVhcmVcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJuZXh0QnV0dG9uXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiTmV4dFwiIGRpc2FibGVkPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1hcnJvdy1yaWdodC1zcXVhcmVcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cInNlYXJjaElucHV0XCIgY2xhc3M9XCJmb3JtLWNvbnRyb2xcIiBwbGFjZWhvbGRlcj1cIlNlYXJjaFwiIGFyaWEtbGFiZWw9XCJTZWFyY2hcIlxuICAgICAgICAgIGFyaWEtZGVzY3JpYmVkYnk9XCJzZWFyY2hcIiAvPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYXBwZW5kXCI+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tb3V0bGluZS1zZWNvbmRhcnlcIiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJzZWFyY2hCdXR0b25cIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIlxuICAgICAgICAgICAgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIiB0aXRsZT1cIlNlYXJjaFwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1zZWFyY2hcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYXBwZW5kXCI+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tb3V0bGluZS1zZWNvbmRhcnlcIiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJjbGVhckJ1dHRvblwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiXG4gICAgICAgICAgICBkYXRhLXBsYWNlbWVudD1cInRvcFwiIHRpdGxlPVwiQ2xlYXJcIiBkaXNhYmxlZD5cbiAgICAgICAgICAgIGNsZWFyXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBbaGlkZGVuXT1cIiFzaG93U2VhcmNoXCIgaWQ9XCJub01hdGNoZXNUZXh0XCIgY2xhc3M9XCJub01hdGNoZXNUZXh0IGZsb2F0LXJpZ2h0XCI+Tm8gbWF0Y2hlcyBmb3VuZDwvZGl2PlxuICA8L2Rpdj5cbiAgPCEtLSBab29tIGluZGljYXRvci0tPlxuICA8ZGl2ICpuZ0lmPVwiem9vbVwiIGNsYXNzPVwiem9vbUluZGljYXRvclwiPlxuICAgIDxzcGFuIGlkPVwiem9vbV9sZXZlbFwiPjwvc3Bhbj5cbiAgPC9kaXY+XG4gIDwhLS0gU2F2ZSBjb25maXJtYXRpb24tLT5cbiAgPGRpdiAqbmdJZj1cInNob3dDb25maXJtYXRpb25cIiBjbGFzcz1cImNvbmZpcm1hdGlvbi1tZXNzYWdlLWNvbnRhaW5lclwiPlxuICAgIDxkaXYgY2xhc3M9XCJhbGVydCBhbGVydC1zdWNjZXNzIGNvbmZpcm1hdGlvbi1tZXNzYWdlXCIgcm9sZT1cImFsZXJ0XCIgW25nQ2xhc3NdPVwieyAnZmFkZS1vdXQnOiAhc2hvd0NvbmZpcm1hdGlvbiB9XCI+XG4gICAgICBTYXZlZCA8aSBjbGFzcz1cImJpIGJpLWNoZWNrLWNpcmNsZVwiPjwvaT5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG5cbiAgPGFwcC1jb250ZXh0LW1lbnVzXG4gIChlZGl0Tm9kZUNvbnRleHRNZW51RXZlbnQpPVwiaGFuZGxlRWRpdE5vZGVzRXZlbnQoJGV2ZW50KVwiXG4gIChmaW5kQ3JlYXRlTm9kZXNDb250ZXh0TWVudUV2ZW50KT1cImZpbmRDcmVhdGVOb2Rlc0V2ZW50KCRldmVudClcIlxuICAoY3JlYXRlTGlua0NvbnRleHRNZW51RXZlbnQpPVwib3Blbk1vZGFsKCdjcmVhdGVMaW5rTW9kYWwnKVwiXG4gIChlZGl0TGlua0xhYmVsQ29udGV4dE1lbnVFdmVudCk9XCJvbkVkaXRMaW5rTGFiZWwoKVwiXG4gIChlZGl0TGlua3NDb250ZXh0TWVudUV2ZW50KT1cImhhbmRsZUVkaXRMaW5rc0V2ZW50KCRldmVudClcIj5cbiAgPC9hcHAtY29udGV4dC1tZW51cz5cblxuICA8YXBwLW1vZGFsc1xuICBbZWRpdE5vZGVEYXRhXT1cImVkaXROb2RlRGF0YVwiXG4gIFtlZGl0TGlua3NEYXRhXT1cImVkaXRMaW5rc0RhdGFcIlxuICAoY3JlYXRlTGlua0V2ZW50KT1cIm9uQ3JlYXRlTGluaygkZXZlbnQpXCJcbiAgKGNyZWF0ZU5vZGVFdmVudCk9XCJvbkNyZWF0ZU5vZGUoJGV2ZW50KVwiXG4gIChkZWxldGVMaW5rRXZlbnQpPVwib25EZWxldGVMaW5rKCRldmVudClcIlxuICAoZGVsZXRlTm9kZUV2ZW50KT1cIm9uRGVsZXRlTm9kZSgpXCI+XG4gIDwvYXBwLW1vZGFscz5cblxuICA8c3ZnICNzdmdJZCBbYXR0ci53aWR0aF09XCJ3aWR0aFwiIGhlaWdodD1cIjc4MFwiIChjb250ZXh0bWVudSk9XCJ2aXN1YWxpc2VyQ29udGV4dE1lbnVzKCRldmVudClcIj48L3N2Zz5cbjwvZGl2PiJdfQ==