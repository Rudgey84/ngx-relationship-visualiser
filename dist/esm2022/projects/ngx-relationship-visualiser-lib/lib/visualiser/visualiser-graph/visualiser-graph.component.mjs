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
    readOnly = false;
    zoom = true;
    controls = true;
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
            this.handleEditNodesEvent(true);
        });
        // Subscribe to the double-click Link payload
        this.visualiserGraphService.dblClickLinkPayload.subscribe((dblClickLinkPayload) => {
            this.selectedLinkArray = dblClickLinkPayload;
            this.onEditLinkLabel();
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
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: VisualiserGraphComponent, selector: "visualiser-graph", inputs: { readOnly: "readOnly", zoom: "zoom", controls: "controls", zoomToFit: "zoomToFit", data: "data" }, outputs: { saveGraphDataEvent: "saveGraphDataEvent" }, viewQueries: [{ propertyName: "graphElement", first: true, predicate: ["svgId"], descendants: true }, { propertyName: "contextMenu", first: true, predicate: ContextMenusComponent, descendants: true }, { propertyName: "modalsComponent", first: true, predicate: ModalsComponent, descendants: true }], ngImport: i0, template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div id=\"draggable\" class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div *ngIf=\"controls\">\n      <div class=\"d-flex justify-content-end\">\n        <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n          <button type=\"button\" id=\"draggableHandle\" class=\"btn btn-light\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Move toolbar\">\n            <i class=\"bi bi-grip-vertical\"></i>\n          </button>\n\n          <button type=\"button\" id=\"dagre_layout\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Dagre layout\" (click)=\"applyLayout()\">\n            <i class=\"bi bi-diagram-3\"></i>\n          </button>\n          <button type=\"button\" id=\"save_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Save data\" (click)=\"onConfirmSave()\">\n            <i class=\"bi bi-save\"></i>\n          </button>\n          <button type=\"button\" id=\"reset_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Reset data\" (click)=\"resetGraph()\">\n            <i class=\"bi bi-skip-backward\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom in\" id=\"zoom_in\">\n            <i class=\"bi bi-zoom-in\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom out\" id=\"zoom_out\">\n            <i class=\"bi bi-zoom-out\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom reset\" id=\"zoom_reset\" disabled=\"true\">\n            <i class=\"bi bi-arrow-counterclockwise\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom to fit\" id=\"zoom_to_fit\">\n            <i class=\"bi bi-arrows-fullscreen\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Select all\" id=\"select_all\">\n            <i class=\"bi bi-grid-fill\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Invert selection\" id=\"toggle_selection\">\n            <i class=\"bi bi-ui-checks-grid\"></i>\n          </button>\n          <button type=\"button\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Toggle search\" id=\"toggle_search\"\n            [ngClass]=\"{'searchButtonActive': showSearch, 'searchButtonInactive': !showSearch}\"\n            (click)=\"toggleSearch()\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n      </div>\n      <div class=\"search float-right input-group mt-3 pr-0\" [hidden]=\"!showSearch\">\n        <div class=\"input-group-prepend\">\n          <button type=\"button\" id=\"prevButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Previous\" disabled>\n            <i class=\"bi bi-arrow-left-square\"></i>\n          </button>\n          <button type=\"button\" id=\"nextButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Next\" disabled>\n            <i class=\"bi bi-arrow-right-square\"></i>\n          </button>\n        </div>\n        <input type=\"text\" id=\"searchInput\" class=\"form-control\" placeholder=\"Search\" aria-label=\"Search\"\n          aria-describedby=\"search\" />\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"searchButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Search\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"clearButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Clear\" disabled>\n            clear\n          </button>\n        </div>\n      </div>\n    </div>\n    <div [hidden]=\"!showSearch\" id=\"noMatchesText\" class=\"noMatchesText float-right\">No matches found</div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n\n  <app-context-menus\n  (editNodeContextMenuEvent)=\"handleEditNodesEvent($event)\"\n  (findCreateNodesContextMenuEvent)=\"findCreateNodesEvent($event)\"\n  (createLinkContextMenuEvent)=\"openModal('createLinkModal')\"\n  (editLinkLabelContextMenuEvent)=\"onEditLinkLabel()\"\n  (editLinksContextMenuEvent)=\"handleEditLinksEvent($event)\">\n  </app-context-menus>\n\n  <app-modals\n  [editNodeData]=\"editNodeData\"\n  [editLinksData]=\"editLinksData\"\n  (createLinkEvent)=\"onCreateLink($event)\"\n  (createNodeEvent)=\"onCreateNode($event)\"\n  (deleteLinkEvent)=\"onDeleteLink($event)\"\n  (deleteNodeEvent)=\"onDeleteNode()\">\n  </app-modals>\n\n  <svg #svgId [attr.width]=\"width\" height=\"780\" (contextmenu)=\"visualiserContextMenus($event)\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.buttonBar{position:absolute;padding:10px}.zoomIndicator{position:absolute;left:0;padding:10px}.noMatchesText{opacity:0;transition:opacity .5s;color:red}.noMatchesText.show{opacity:1}@keyframes floatInFromTop{0%{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}.input-group{animation-name:floatInFromTop;animation-duration:.3s;animation-fill-mode:forwards;position:relative;width:407px}.searchButtonActive{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonActive:focus,.searchButtonActive:active{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonInactive{opacity:1;outline:none;box-shadow:none;background-color:#6c757d!important;border-color:#6c757d!important}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}#draggableHandle{cursor:move}\n"], dependencies: [{ kind: "directive", type: i5.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: i5.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "component", type: i6.ContextMenusComponent, selector: "app-context-menus", outputs: ["editNodeContextMenuEvent", "findCreateNodesContextMenuEvent", "createLinkContextMenuEvent", "editLinkLabelContextMenuEvent", "editLinksContextMenuEvent"] }, { kind: "component", type: i7.ModalsComponent, selector: "app-modals", inputs: ["editNodeData", "editLinksData"], outputs: ["closeModalEvent", "createLinkEvent", "createNodeEvent", "deleteLinkEvent", "deleteNodeEvent"] }] });
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
            }], readOnly: [{
                type: Input
            }], zoom: [{
                type: Input
            }], controls: [{
                type: Input
            }], zoomToFit: [{
                type: Input
            }], modalsComponent: [{
                type: ViewChild,
                args: [ModalsComponent]
            }], data: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL3Zpc3VhbGlzZXItZ3JhcGgvdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFNBQVMsRUFFVCxLQUFLLEVBQ0wsTUFBTSxFQUNOLFlBQVksRUFJYixNQUFNLGVBQWUsQ0FBQztBQUl2QixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7Ozs7Ozs7OztBQVM3RCxNQUFNLE9BQU8sd0JBQXdCO0lBcUJ4QjtJQUNBO0lBQ0E7SUFDRDtJQXZCVSxZQUFZLENBQWE7SUFDSixXQUFXLENBQXdCO0lBQ2xFLGtCQUFrQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7SUFDaEQsa0JBQWtCLENBQUM7SUFDbkIsY0FBYyxDQUFDO0lBQ2YsaUJBQWlCLENBQUM7SUFDbEIsYUFBYSxDQUFDO0lBQ2QsS0FBSyxDQUFDO0lBQ04sVUFBVSxHQUFZLEtBQUssQ0FBQztJQUM1QixjQUFjLENBQU87SUFDckIsZ0JBQWdCLEdBQVksS0FBSyxDQUFDO0lBQ2xDLHNCQUFzQixDQUFTO0lBQy9CLGFBQWEsR0FBUSxJQUFJLENBQUM7SUFDMUIsWUFBWSxHQUFRLElBQUksQ0FBQztJQUN2QixRQUFRLEdBQVksS0FBSyxDQUFDO0lBQzFC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QUUsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELDJEQUEyRDtZQUMzRCxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQztRQUMzRSxDQUFDO2FBQU0sQ0FBQztZQUNOLDBEQUEwRDtZQUMxRCxLQUFLLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQztRQUNwQyxDQUFDO0lBQ0gsQ0FBQztJQUVELFNBQVMsQ0FBQyxLQUFhO1FBQ3JCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFxQixDQUFDO1FBQ3RFLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDaEQsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLENBQUMsS0FBSyxDQUFDLGtCQUFrQixLQUFLLG9CQUFvQixDQUFDLENBQUM7UUFDN0QsQ0FBQztJQUNILENBQUM7d0dBdGxCVSx3QkFBd0I7NEZBQXhCLHdCQUF3QixnV0FFeEIscUJBQXFCLGtGQWlCckIsZUFBZSxnREM1QzVCLGcxTEFnSE07OzRGRHZGTyx3QkFBd0I7a0JBTHBDLFNBQVM7K0JBQ0Usa0JBQWtCOzBMQUtSLFlBQVk7c0JBQS9CLFNBQVM7dUJBQUMsT0FBTztnQkFDdUIsV0FBVztzQkFBbkQsU0FBUzt1QkFBQyxxQkFBcUI7Z0JBQ3RCLGtCQUFrQjtzQkFBM0IsTUFBTTtnQkFZRSxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQzZCLGVBQWU7c0JBQWpELFNBQVM7dUJBQUMsZUFBZTtnQkFTdEIsSUFBSTtzQkFEUCxLQUFLIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9uZW50LFxuICBWaWV3Q2hpbGQsXG4gIEVsZW1lbnRSZWYsXG4gIElucHV0LFxuICBPdXRwdXQsXG4gIEV2ZW50RW1pdHRlcixcbiAgT25Jbml0LFxuICBBZnRlclZpZXdJbml0LFxuICBUZW1wbGF0ZVJlZlxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFZpc3VhbGlzZXJHcmFwaFNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlcy92aXN1YWxpc2VyLWdyYXBoLnNlcnZpY2UnO1xuaW1wb3J0IHsgRGFncmVOb2Rlc09ubHlMYXlvdXQgfSBmcm9tICcuLi9zZXJ2aWNlcy9kYWdyZS1sYXlvdXQuc2VydmljZSc7XG5pbXBvcnQgeyBDb250ZXh0TWVudVNlcnZpY2UgfSBmcm9tICdAa3JlYXNoL25neC1jb250ZXh0bWVudSc7XG5pbXBvcnQgeyBDb250ZXh0TWVudXNDb21wb25lbnQgfSBmcm9tICcuLi9jb250ZXh0LW1lbnVzL2NvbnRleHQtbWVudXMuY29tcG9uZW50JztcbmltcG9ydCB7IERhdGEsIExpbmssIFJlbGF0aW9uc2hpcCB9IGZyb20gJy4uLy4uL21vZGVscy9kYXRhLmludGVyZmFjZSc7XG5pbXBvcnQgeyBNb2RhbHNDb21wb25lbnQgfSBmcm9tICcuLi9tb2RhbHMvbW9kYWxzLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBEZXhpZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9kYi9ncmFwaERhdGFiYXNlJztcbmRlY2xhcmUgdmFyIGJvb3Rib3g6IGFueTtcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAndmlzdWFsaXNlci1ncmFwaCcsXG4gIHRlbXBsYXRlVXJsOiBcIi4vdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuaHRtbFwiLFxuICBzdHlsZVVybHM6IFtcIi4vdmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuc2Nzc1wiXSxcbn0pXG5leHBvcnQgY2xhc3MgVmlzdWFsaXNlckdyYXBoQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBBZnRlclZpZXdJbml0IHtcbiAgQFZpZXdDaGlsZCgnc3ZnSWQnKSBncmFwaEVsZW1lbnQ6IEVsZW1lbnRSZWY7XG4gIEBWaWV3Q2hpbGQoQ29udGV4dE1lbnVzQ29tcG9uZW50KSBwdWJsaWMgY29udGV4dE1lbnU6IENvbnRleHRNZW51c0NvbXBvbmVudDtcbiAgQE91dHB1dCgpIHNhdmVHcmFwaERhdGFFdmVudCA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBwdWJsaWMgc2VsZWN0ZWROb2Rlc0FycmF5O1xuICBwdWJsaWMgc2VsZWN0ZWROb2RlSWQ7XG4gIHB1YmxpYyBzZWxlY3RlZExpbmtBcnJheTtcbiAgcHVibGljIHNhdmVHcmFwaERhdGE7XG4gIHB1YmxpYyB3aWR0aDtcbiAgcHVibGljIHNob3dTZWFyY2g6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHVibGljIHNhdmVkR3JhcGhEYXRhOiBEYXRhO1xuICBwdWJsaWMgc2hvd0NvbmZpcm1hdGlvbjogYm9vbGVhbiA9IGZhbHNlO1xuICBwdWJsaWMgYnV0dG9uQmFyUmlnaHRQb3NpdGlvbjogc3RyaW5nO1xuICBwdWJsaWMgZWRpdExpbmtzRGF0YTogYW55ID0gbnVsbDtcbiAgcHVibGljIGVkaXROb2RlRGF0YTogYW55ID0gbnVsbDtcbiAgQElucHV0KCkgcmVhZE9ubHk6IGJvb2xlYW4gPSBmYWxzZTtcbiAgQElucHV0KCkgem9vbTogYm9vbGVhbiA9IHRydWU7XG4gIEBJbnB1dCgpIGNvbnRyb2xzOiBib29sZWFuID0gdHJ1ZTtcbiAgQElucHV0KCkgem9vbVRvRml0OiBib29sZWFuID0gZmFsc2U7XG4gIEBWaWV3Q2hpbGQoTW9kYWxzQ29tcG9uZW50KSBwdWJsaWMgbW9kYWxzQ29tcG9uZW50OiBNb2RhbHNDb21wb25lbnQ7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHJlYWRvbmx5IHZpc3VhbGlzZXJHcmFwaFNlcnZpY2U6IFZpc3VhbGlzZXJHcmFwaFNlcnZpY2UsXG4gICAgcmVhZG9ubHkgY29udGV4dE1lbnVTZXJ2aWNlOiBDb250ZXh0TWVudVNlcnZpY2UsXG4gICAgcmVhZG9ubHkgZGFncmVOb2Rlc09ubHlMYXlvdXQ6IERhZ3JlTm9kZXNPbmx5TGF5b3V0LFxuICAgIHByaXZhdGUgZGV4aWVTZXJ2aWNlOiBEZXhpZVNlcnZpY2VcbiAgKSB7IH1cblxuICBASW5wdXQoKVxuICBzZXQgZGF0YShkYXRhOiBEYXRhKSB7XG4gICAgaWYgKCFkYXRhIHx8ICFkYXRhLmRhdGFJZCkge1xuICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBkYXRhIGlucHV0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zYXZlZEdyYXBoRGF0YSA9IGRhdGE7XG5cbiAgICAvLyBUaW1lb3V0OiBUaGUgaW5wdXQgYXJyaXZlcyBiZWZvcmUgdGhlIHN2ZyBpcyByZW5kZXJlZCwgdGhlcmVmb3JlIHRoZSBuYXRpdmVFbGVtZW50IGRvZXMgbm90IGV4aXN0XG4gICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmRhZ3JlTm9kZXNPbmx5TGF5b3V0LnJlbmRlckxheW91dChkYXRhKTtcbiAgICAgIC8vIFRha2UgYSBjb3B5IG9mIGlucHV0IGZvciByZXNldFxuICAgICAgYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2Uuc2F2ZUdyYXBoRGF0YShkYXRhKTtcblxuICAgICAgdGhpcy52aXN1YWxpc2VyR3JhcGhTZXJ2aWNlLnVwZGF0ZShcbiAgICAgICAgZGF0YSxcbiAgICAgICAgdGhpcy5ncmFwaEVsZW1lbnQubmF0aXZlRWxlbWVudCxcbiAgICAgICAgdGhpcy56b29tLFxuICAgICAgICB0aGlzLnpvb21Ub0ZpdFxuICAgICAgKTtcbiAgICB9LCA1MDApO1xuICB9XG5cbiAgcHVibGljIG5nT25Jbml0KCkge1xuICAgIHRoaXMuYnV0dG9uQmFyUmlnaHRQb3NpdGlvbiA9ICcwJztcbiAgICB0aGlzLnVwZGF0ZVdpZHRoKCk7XG5cbiAgICAvLyBJbml0aWFsaXplIHdpdGggZGVmYXVsdCBlbXB0eSBkYXRhIGlmIG5vIGRhdGEgaXMgcHJvdmlkZWRcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gZGF0YSBwcm92aWRlZCwgdXNpbmcgZW1wdHkgZGF0YSBzZXQnKTtcbiAgICAgIHRoaXMuZGF0YSA9IHtcbiAgICAgICAgZGF0YUlkOiAnMScsXG4gICAgICAgIG5vZGVzOiBbXSxcbiAgICAgICAgbGlua3M6IFtdLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBTdWJzY3JpYmUgdG8gdGhlIGxpbmsgc2VsZWN0aW9ucyBpbiBkM1xuICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5zZWxlY3RlZE5vZGVzQXJyYXkuc3Vic2NyaWJlKFxuICAgICAgKHNlbGVjdGVkTm9kZXNBcnJheSkgPT4ge1xuICAgICAgICB0aGlzLnNlbGVjdGVkTm9kZXNBcnJheSA9IHNlbGVjdGVkTm9kZXNBcnJheTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgLy8gU3Vic2NyaWJlIHRvIHRoZSBkb3VibGUtY2xpY2sgbm9kZSBwYXlsb2FkXG4gICAgdGhpcy52aXN1YWxpc2VyR3JhcGhTZXJ2aWNlLmRibENsaWNrTm9kZVBheWxvYWQuc3Vic2NyaWJlKFxuICAgICAgKGRibENsaWNrTm9kZVBheWxvYWQpID0+IHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZE5vZGVJZCA9IGRibENsaWNrTm9kZVBheWxvYWRbMF0uaWQ7XG4gICAgICAgIHRoaXMuaGFuZGxlRWRpdE5vZGVzRXZlbnQodHJ1ZSk7XG4gICAgICB9XG4gICAgKTtcblxuICAgIC8vIFN1YnNjcmliZSB0byB0aGUgZG91YmxlLWNsaWNrIExpbmsgcGF5bG9hZFxuICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5kYmxDbGlja0xpbmtQYXlsb2FkLnN1YnNjcmliZShcbiAgICAgIChkYmxDbGlja0xpbmtQYXlsb2FkKSA9PiB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXkgPSBkYmxDbGlja0xpbmtQYXlsb2FkO1xuICAgICAgICB0aGlzLm9uRWRpdExpbmtMYWJlbCgpO1xuICAgICAgfVxuICAgICk7XG5cbiAgICB0aGlzLnZpc3VhbGlzZXJHcmFwaFNlcnZpY2Uuc2VsZWN0ZWRMaW5rQXJyYXkuc3Vic2NyaWJlKFxuICAgICAgKHNlbGVjdGVkTGlua0FycmF5KSA9PiB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXkgPSBzZWxlY3RlZExpbmtBcnJheTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgcHVibGljIHRvZ2dsZVNlYXJjaCgpIHtcbiAgICB0aGlzLnNob3dTZWFyY2ggPSAhdGhpcy5zaG93U2VhcmNoO1xuXG4gICAgaWYgKHRoaXMuc2hvd1NlYXJjaCkge1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpZWxkID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlYXJjaElucHV0JykgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgICAgZmllbGQuZm9jdXMoKTtcbiAgICAgICAgICBmaWVsZC5zZXRTZWxlY3Rpb25SYW5nZSgwLCAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdTZWFyY2ggaW5wdXQgbm90IGZvdW5kLicpO1xuICAgICAgICB9XG4gICAgICB9LCAwKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgb25SZXNpemUoZXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLnVwZGF0ZVdpZHRoKCk7XG4gIH1cblxuICBwdWJsaWMgdXBkYXRlV2lkdGgoKTogdm9pZCB7XG4gICAgdGhpcy53aWR0aCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYWdlSWQnKS5vZmZzZXRXaWR0aDtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB2aXN1YWxpc2VyQ29udGV4dE1lbnVzKGV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMucmVhZE9ubHkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgY29udGV4dE1lbnU7XG4gICAgbGV0IGl0ZW07XG4gICAgY29uc3QgdGFyZ2V0RWwgPSBldmVudC50YXJnZXQ7XG4gICAgY29uc3QgbG9jYWxOYW1lID0gdGFyZ2V0RWwubG9jYWxOYW1lO1xuICAgIGNvbnN0IHBhcmVudE5vZGVJZCA9IHRhcmdldEVsLnBhcmVudE5vZGUuaWQ7XG4gICAgY29uc3QgZGF0YSA9IHRhcmdldEVsLnBhcmVudE5vZGUuX19kYXRhX187XG4gICAgdGhpcy5zZWxlY3RlZE5vZGVJZCA9IHRhcmdldEVsLmlkIHx8IChkYXRhICYmIGRhdGEuaWQpO1xuXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWROb2Rlc0FycmF5Py5sZW5ndGggPT09IDIpIHtcbiAgICAgIGNvbnRleHRNZW51ID0gdGhpcy5jb250ZXh0TWVudS5jcmVhdGVFZGl0TGlua0NvbnRleHRNZW51O1xuICAgICAgaXRlbSA9IHtcbiAgICAgICAgZ3JhcGhEYXRhOiB0aGlzLnNhdmVkR3JhcGhEYXRhLFxuICAgICAgICBzZWxlY3RlZE5vZGVzOiB0aGlzLnNlbGVjdGVkTm9kZXNBcnJheVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGxvY2FsTmFtZSA9PT0gJ3RleHQnIHx8IGxvY2FsTmFtZSA9PT0gJ2ltYWdlJyB8fCBwYXJlbnROb2RlSWQgPT09ICdub2RlVGV4dCcpIHtcbiAgICAgICAgY29udGV4dE1lbnUgPSB0aGlzLmNvbnRleHRNZW51LmVkaXROb2RlQ29udGV4dE1lbnU7XG4gICAgICAgIGl0ZW0gPSB0aGlzLnNlbGVjdGVkTm9kZUlkO1xuICAgICAgfSBlbHNlIGlmIChsb2NhbE5hbWUgPT09ICd0ZXh0UGF0aCcpIHtcbiAgICAgICAgY29udGV4dE1lbnUgPSB0aGlzLmNvbnRleHRNZW51LmVkaXRMaW5rTGFiZWxDb250ZXh0TWVudTtcbiAgICAgICAgaXRlbSA9IHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXk7XG4gICAgICB9IGVsc2UgaWYgKGxvY2FsTmFtZSA9PT0gJ3N2ZycpIHtcbiAgICAgICAgY29udGV4dE1lbnUgPSB0aGlzLmNvbnRleHRNZW51LmZpbmRDcmVhdGVOb2Rlc0NvbnRleHRNZW51O1xuICAgICAgICBpdGVtID0gJ2l0ZW0nO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29udGV4dE1lbnVTZXJ2aWNlLnNob3cubmV4dCh7XG4gICAgICBjb250ZXh0TWVudSxcbiAgICAgIGV2ZW50LFxuICAgICAgaXRlbSxcbiAgICB9KTtcblxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAvLyBVcGRhdGUgY29udGV4dCBtZW51IGl0ZW1zIGJhc2VkIG9uIGRhdGEgZnJvbSBEZXhpZVxuICAgIGNvbnN0IHVwZGF0ZWREYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcbiAgICBpZiAodGhpcy5zZWxlY3RlZE5vZGVzQXJyYXk/Lmxlbmd0aCA9PT0gMikge1xuICAgICAgaXRlbS5ncmFwaERhdGEgPSB1cGRhdGVkRGF0YTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZmluZENyZWF0ZU5vZGVzRXZlbnQoYWN0aW9uOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoYWN0aW9uID09PSAnZmluZE5vZGVzJykge1xuICAgICAgdGhpcy50b2dnbGVTZWFyY2goKTtcbiAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ2NyZWF0ZU5vZGUnKSB7XG4gICAgICB0aGlzLm9wZW5jcmVhdGVOb2RlTW9kYWwoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG9wZW5jcmVhdGVOb2RlTW9kYWwoKTogdm9pZCB7XG4gICAgdGhpcy5tb2RhbHNDb21wb25lbnQub3Blbk1vZGFsKHRoaXMubW9kYWxzQ29tcG9uZW50LmNyZWF0ZU5vZGVNb2RhbCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgb25Db25maXJtU2F2ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBib290Ym94LmNvbmZpcm0oe1xuICAgICAgdGl0bGU6IFwiU2F2ZSBHcmFwaFwiLFxuICAgICAgY2VudGVyVmVydGljYWw6IHRydWUsXG4gICAgICBtZXNzYWdlOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBzYXZlIHRoZSBncmFwaD9cIixcbiAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgY29uZmlybToge1xuICAgICAgICAgIGxhYmVsOiAnWWVzJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tc3VjY2VzcydcbiAgICAgICAgfSxcbiAgICAgICAgY2FuY2VsOiB7XG4gICAgICAgICAgbGFiZWw6ICdObycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLWRhbmdlcidcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICB0aGlzLnZpc3VhbGlzZXJHcmFwaFNlcnZpY2Uuc2F2ZUdyYXBoRGF0YS5zdWJzY3JpYmUoKHNhdmVHcmFwaERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YSA9IHNhdmVHcmFwaERhdGE7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB0aGlzLnNhdmVHcmFwaERhdGFFdmVudC5lbWl0KHRoaXMuc2F2ZUdyYXBoRGF0YSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVCdXR0b25zKHRydWUpO1xuICAgICAgICAgIHRoaXMuZGF0YSA9IHRoaXMuc2F2ZUdyYXBoRGF0YTtcbiAgICAgICAgICB0aGlzLnNob3dDb25maXJtYXRpb25NZXNzYWdlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBvbkNyZWF0ZU5vZGUobm9kZURhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcblxuICAgIC8vIENoZWNrIGlmIHRoZSBub2RlIGFscmVhZHkgZXhpc3RzXG4gICAgY29uc3QgZXhpc3RpbmdOb2RlSW5kZXggPSBkYXRhLm5vZGVzLmZpbmRJbmRleChub2RlID0+IG5vZGUuaWQgPT09IG5vZGVEYXRhLmlkKTtcblxuICAgIGlmIChleGlzdGluZ05vZGVJbmRleCA9PT0gLTEpIHtcbiAgICAgIC8vIEdlbmVyYXRlIGEgdW5pcXVlIG51bWVyaWMgSUQgZm9yIHRoZSBuZXcgbm9kZVxuICAgICAgbGV0IG5ld0lkO1xuICAgICAgZG8ge1xuICAgICAgICBuZXdJZCA9IGNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQzMkFycmF5KDEpKVswXTtcbiAgICAgIH0gd2hpbGUgKGRhdGEubm9kZXMuc29tZShub2RlID0+IG5vZGUuaWQgPT09IG5ld0lkLnRvU3RyaW5nKCkpKTtcblxuICAgICAgbm9kZURhdGEuaWQgPSBuZXdJZC50b1N0cmluZygpO1xuICAgIH1cblxuICAgIGJvb3Rib3guY29uZmlybSh7XG4gICAgICB0aXRsZTogXCJDcmVhdGluZyBub2RlXCIsXG4gICAgICBjZW50ZXJWZXJ0aWNhbDogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6IFwiQ3JlYXRpbmcgYSBub2RlIHdpbGwgc2F2ZSBncmFwaCBkYXRhLCBhcmUgeW91IHN1cmU/XCIsXG4gICAgICBidXR0b25zOiB7XG4gICAgICAgIGNvbmZpcm06IHtcbiAgICAgICAgICBsYWJlbDogJ1llcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLXN1Y2Nlc3MnXG4gICAgICAgIH0sXG4gICAgICAgIGNhbmNlbDoge1xuICAgICAgICAgIGxhYmVsOiAnTm8nLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1kYW5nZXInXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjYWxsYmFjazogYXN5bmMgKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgaWYgKGV4aXN0aW5nTm9kZUluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBleGlzdGluZyBub2RlXG4gICAgICAgICAgICBkYXRhLm5vZGVzW2V4aXN0aW5nTm9kZUluZGV4XSA9IG5vZGVEYXRhO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBZGQgdGhlIG5ldyBub2RlXG4gICAgICAgICAgICBkYXRhLm5vZGVzLnB1c2gobm9kZURhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgdGhpcy5zYXZlR3JhcGhEYXRhRXZlbnQuZW1pdChkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIG9uQ3JlYXRlTGluayhsaW5rRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0aGF0IGV4YWN0bHkgdHdvIG5vZGVzIGFyZSBzZWxlY3RlZFxuICAgIGlmICh0aGlzLnNlbGVjdGVkTm9kZXNBcnJheS5sZW5ndGggPT09IDIpIHtcbiAgICAgIGNvbnN0IHNvdXJjZU5vZGUgPSB0aGlzLnNlbGVjdGVkTm9kZXNBcnJheVswXTtcbiAgICAgIGNvbnN0IHRhcmdldE5vZGUgPSB0aGlzLnNlbGVjdGVkTm9kZXNBcnJheVsxXTtcblxuICAgICAgLy8gUmV0cmlldmUgdGhlIHNhdmVkIGdyYXBoIGRhdGEgZnJvbSBEZXhpZVxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIG5leHQgYXZhaWxhYmxlIGxhYmVsSW5kZXhcbiAgICAgIGNvbnN0IGFsbEluZGV4ZXMgPSBkYXRhLmxpbmtzLnJlZHVjZSgoYWNjLCBsaW5rKSA9PiB7XG4gICAgICAgIHJldHVybiBhY2MuY29uY2F0KGxpbmsucmVsYXRpb25zaGlwcy5tYXAocmVsID0+IHJlbC5sYWJlbEluZGV4KSk7XG4gICAgICB9LCBbXSk7XG4gICAgICBsZXQgbmV4dEluZGV4ID0gTWF0aC5tYXgoLi4uYWxsSW5kZXhlcywgMCkgKyAxO1xuXG4gICAgICAvLyBNYXAgb3ZlciB0aGUgbGFiZWxzIGFuZCBsaW5rSWNvbiB2YWx1ZXMsIGFzc3VtaW5nIGVhY2ggbGFiZWwgaGFzIGEgY29ycmVzcG9uZGluZyBsaW5rSWNvblxuICAgICAgY29uc3QgcmVsYXRpb25zaGlwczogUmVsYXRpb25zaGlwW10gPSBsaW5rRGF0YS5sYWJlbC5tYXAoKGl0ZW0pID0+ICh7XG4gICAgICAgIGxhYmVsSW5kZXg6IGl0ZW0ubGFiZWxJbmRleCAhPT0gdW5kZWZpbmVkID8gaXRlbS5sYWJlbEluZGV4IDogbmV4dEluZGV4KyssXG4gICAgICAgIGxhYmVsOiBpdGVtLmxhYmVsLFxuICAgICAgICBzb3VyY2U6IHNvdXJjZU5vZGUuaWQsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0Tm9kZS5pZCxcbiAgICAgICAgbGlua0ljb246IGl0ZW0ubGlua0ljb25cbiAgICAgIH0pKTtcblxuICAgICAgY29uc3QgbmV3TGluazogTGluayA9IHtcbiAgICAgICAgc291cmNlOiBzb3VyY2VOb2RlLmlkLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldE5vZGUuaWQsXG4gICAgICAgIGxpbmVTdHlsZTogbGlua0RhdGEubGluZVN0eWxlLFxuICAgICAgICBzb3VyY2VBcnJvdzogbGlua0RhdGEuc291cmNlQXJyb3csXG4gICAgICAgIHRhcmdldEFycm93OiBsaW5rRGF0YS50YXJnZXRBcnJvdyxcbiAgICAgICAgbGlua0lkOiBgJHtzb3VyY2VOb2RlLmlkfV8ke3RhcmdldE5vZGUuaWR9YCxcbiAgICAgICAgcmVsYXRpb25zaGlwcyxcbiAgICAgIH07XG5cbiAgICAgIGJvb3Rib3guY29uZmlybSh7XG4gICAgICAgIHRpdGxlOiBcIkNyZWF0aW5nIGxpbmtcIixcbiAgICAgICAgY2VudGVyVmVydGljYWw6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IFwiQ3JlYXRpbmcgYSBsaW5rIHdpbGwgc2F2ZSBncmFwaCBkYXRhLCBhcmUgeW91IHN1cmU/XCIsXG4gICAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgICBjb25maXJtOiB7XG4gICAgICAgICAgICBsYWJlbDogJ1llcycsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdidG4tc3VjY2VzcydcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNhbmNlbDoge1xuICAgICAgICAgICAgbGFiZWw6ICdObycsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdidG4tZGFuZ2VyJ1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2FsbGJhY2s6IGFzeW5jIChyZXN1bHQpID0+IHtcbiAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0xpbmtJbmRleCA9IGRhdGEubGlua3MuZmluZEluZGV4KGxpbmsgPT5cbiAgICAgICAgICAgICAgbGluay5saW5rSWQgPT09IGAke3NvdXJjZU5vZGUuaWR9XyR7dGFyZ2V0Tm9kZS5pZH1gIHx8IGxpbmsubGlua0lkID09PSBgJHt0YXJnZXROb2RlLmlkfV8ke3NvdXJjZU5vZGUuaWR9YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0xpbmtJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgZGF0YS5saW5rc1tleGlzdGluZ0xpbmtJbmRleF0gPSBuZXdMaW5rO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGF0YS5saW5rcy5wdXNoKG5ld0xpbmspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgdGhpcy5zYXZlR3JhcGhEYXRhRXZlbnQuZW1pdChkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdQbGVhc2Ugc2VsZWN0IGV4YWN0bHkgdHdvIG5vZGVzIHRvIGNyZWF0ZSBhIGxpbmsuJyk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIG9uRGVsZXRlTm9kZSgpIHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBib290Ym94LmNvbmZpcm0oe1xuICAgICAgdGl0bGU6IFwiRGVsZXRpbmcgbm9kZVwiLFxuICAgICAgY2VudGVyVmVydGljYWw6IHRydWUsXG4gICAgICBtZXNzYWdlOiBcIkRlbGV0aW5nIGEgbm9kZSB3aWxsIHNhdmUgZ3JhcGggZGF0YSwgYXJlIHlvdSBzdXJlPyBUaGlzIHdpbGwgYWxzbyBkZWxldGUgYWxsIGxpbmtzIGFzc29jaWF0ZWQgd2l0aCB0aGlzIG5vZGUuXCIsXG4gICAgICBidXR0b25zOiB7XG4gICAgICAgIGNvbmZpcm06IHtcbiAgICAgICAgICBsYWJlbDogJ1llcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLXN1Y2Nlc3MnXG4gICAgICAgIH0sXG4gICAgICAgIGNhbmNlbDoge1xuICAgICAgICAgIGxhYmVsOiAnTm8nLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1kYW5nZXInXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjYWxsYmFjazogYXN5bmMgKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG5cbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIG5vZGUgd2l0aCB0aGUgbWF0Y2hpbmcgaWRcbiAgICAgICAgICBkYXRhLm5vZGVzID0gZGF0YS5ub2Rlcy5maWx0ZXIobm9kZSA9PiBub2RlLmlkICE9PSB0aGlzLnNlbGVjdGVkTm9kZUlkKTtcblxuICAgICAgICAgIC8vIFJlbW92ZSBsaW5rcyB3aXRoIG1hdGNoaW5nIHNvdXJjZSBvciB0YXJnZXRcbiAgICAgICAgICBkYXRhLmxpbmtzID0gZGF0YS5saW5rcy5maWx0ZXIobGluayA9PiBsaW5rLnNvdXJjZSAhPT0gdGhpcy5zZWxlY3RlZE5vZGVJZCAmJiBsaW5rLnRhcmdldCAhPT0gdGhpcy5zZWxlY3RlZE5vZGVJZCk7XG5cbiAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YUV2ZW50LmVtaXQoZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBvbkRlbGV0ZUxpbmsobGlua0lkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYm9vdGJveC5jb25maXJtKHtcbiAgICAgIHRpdGxlOiBcIkRlbGV0aW5nIGxpbmtcIixcbiAgICAgIGNlbnRlclZlcnRpY2FsOiB0cnVlLFxuICAgICAgbWVzc2FnZTogXCJEZWxldGluZyBhIGxpbmsgd2lsbCBzYXZlIGdyYXBoIGRhdGEsIGFyZSB5b3Ugc3VyZT9cIixcbiAgICAgIGJ1dHRvbnM6IHtcbiAgICAgICAgY29uZmlybToge1xuICAgICAgICAgIGxhYmVsOiAnWWVzJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tc3VjY2VzcydcbiAgICAgICAgfSxcbiAgICAgICAgY2FuY2VsOiB7XG4gICAgICAgICAgbGFiZWw6ICdObycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLWRhbmdlcidcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcbiAgICAgICAgICBjb25zdCBleGlzdGluZ0xpbmtJbmRleCA9IGRhdGEubGlua3MuZmluZEluZGV4KGxpbmsgPT4gbGluay5saW5rSWQgPT09IGxpbmtJZCk7XG4gICAgICAgICAgaWYgKGV4aXN0aW5nTGlua0luZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgZGF0YS5saW5rcy5zcGxpY2UoZXhpc3RpbmdMaW5rSW5kZXgsIDEpO1xuXG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgdGhpcy5zYXZlR3JhcGhEYXRhRXZlbnQuZW1pdChkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBvbkVkaXRMaW5rTGFiZWwoKSB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYm9vdGJveC5wcm9tcHQoe1xuICAgICAgdGl0bGU6IFwiRWRpdGluZyBhIGxpbmsgbGFiZWwgd2lsbCBzYXZlIGdyYXBoIGRhdGEsIGFyZSB5b3Ugc3VyZT9cIixcbiAgICAgIGNlbnRlclZlcnRpY2FsOiB0cnVlLFxuICAgICAgdmFsdWU6IHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXlbMF0ubGFiZWwsXG4gICAgICBjYWxsYmFjazogYXN5bmMgKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYWJlbCBwcm9wZXJ0eSB3aXRoIHRoZSByZXN1bHRcbiAgICAgICAgICB0aGlzLnNlbGVjdGVkTGlua0FycmF5WzBdLmxhYmVsID0gcmVzdWx0O1xuXG4gICAgICAgICAgLy8gUmV0cmlldmUgdGhlIHNhdmVkIGdyYXBoIGRhdGEgZnJvbSBEZXhpZVxuICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuXG4gICAgICAgICAgLy8gRmluZCB0aGUgbGluayBpbiB0aGUgZGF0YSB1c2luZyBzb3VyY2UgYW5kIHRhcmdldCBJRHNcbiAgICAgICAgICBjb25zdCBsaW5rID0gZGF0YS5saW5rcy5maW5kKGxpbmsgPT5cbiAgICAgICAgICAgIChsaW5rLnNvdXJjZSA9PT0gdGhpcy5zZWxlY3RlZExpbmtBcnJheVswXS5zb3VyY2UuaWQgJiYgbGluay50YXJnZXQgPT09IHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXlbMF0udGFyZ2V0LmlkKSB8fFxuICAgICAgICAgICAgKGxpbmsuc291cmNlID09PSB0aGlzLnNlbGVjdGVkTGlua0FycmF5WzBdLnRhcmdldC5pZCAmJiBsaW5rLnRhcmdldCA9PT0gdGhpcy5zZWxlY3RlZExpbmtBcnJheVswXS5zb3VyY2UuaWQpXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChsaW5rKSB7XG4gICAgICAgICAgICAvLyBGaW5kIHRoZSByZWxhdGlvbnNoaXAgd2l0aCB0aGUgc2FtZSBsYWJlbEluZGV4XG4gICAgICAgICAgICBjb25zdCByZWxhdGlvbnNoaXAgPSBsaW5rLnJlbGF0aW9uc2hpcHMuZmluZChyZWwgPT4gcmVsLmxhYmVsSW5kZXggPT09IHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXlbMF0ubGFiZWxJbmRleCk7XG4gICAgICAgICAgICBpZiAocmVsYXRpb25zaGlwKSB7XG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgbGFiZWwgaW4gdGhlIG1hdGNoZWQgb2JqZWN0XG4gICAgICAgICAgICAgIHJlbGF0aW9uc2hpcC5sYWJlbCA9IHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICB0aGlzLnNhdmVHcmFwaERhdGFFdmVudC5lbWl0KGRhdGEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdMaW5rIG5vdCBmb3VuZC4nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBoYW5kbGVFZGl0TGlua3NFdmVudChldmVudDogeyBvcGVuOiBib29sZWFuOyBkYXRhOiBhbnkgfSkge1xuICAgIGlmIChldmVudC5vcGVuKSB7XG4gICAgICB0aGlzLm1vZGFsc0NvbXBvbmVudC5vcGVuTW9kYWwodGhpcy5tb2RhbHNDb21wb25lbnQuZWRpdExpbmtzTW9kYWwpO1xuICAgICAgdGhpcy5lZGl0TGlua3NEYXRhID0gZXZlbnQuZGF0YTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgaGFuZGxlRWRpdE5vZGVzRXZlbnQoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQpIHtcbiAgICAgIHRoaXMubW9kYWxzQ29tcG9uZW50Lm9wZW5Nb2RhbCh0aGlzLm1vZGFsc0NvbXBvbmVudC5lZGl0Tm9kZU1vZGFsKTtcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuICAgICAgdGhpcy5lZGl0Tm9kZURhdGEgPSBkYXRhLm5vZGVzLmZpbmQobm9kZSA9PiBub2RlLmlkID09PSB0aGlzLnNlbGVjdGVkTm9kZUlkKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVzZXRHcmFwaCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcbiAgICB0aGlzLmRpc2FibGVCdXR0b25zKHRydWUpO1xuICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5yZXNldEdyYXBoKFxuICAgICAgZGF0YSxcbiAgICAgIHRoaXMuZ3JhcGhFbGVtZW50Lm5hdGl2ZUVsZW1lbnQsXG4gICAgICB0aGlzLnpvb20sXG4gICAgICB0aGlzLnpvb21Ub0ZpdFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgYXBwbHlMYXlvdXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG4gICAgY29uc3QgbmV3RGFncmVMYXlvdXQgPSB0aGlzLmRhZ3JlTm9kZXNPbmx5TGF5b3V0LmluaXRSZW5kZXJMYXlvdXQoZGF0YSk7XG5cbiAgICB0aGlzLnZpc3VhbGlzZXJHcmFwaFNlcnZpY2UucmVzZXRHcmFwaChcbiAgICAgIG5ld0RhZ3JlTGF5b3V0LFxuICAgICAgdGhpcy5ncmFwaEVsZW1lbnQubmF0aXZlRWxlbWVudCxcbiAgICAgIHRoaXMuem9vbSxcbiAgICAgIHRoaXMuem9vbVRvRml0XG4gICAgKTtcbiAgICB0aGlzLmVuYWJsZUJ1dHRvbnMoKTtcbiAgfVxuXG4gIHByaXZhdGUgZGlzYWJsZUJ1dHRvbnMoZGlzYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcjc2F2ZV9ncmFwaCwgI3Jlc2V0X2dyYXBoJykuZm9yRWFjaChidG4gPT4ge1xuICAgICAgYnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCBTdHJpbmcoZGlzYWJsZWQpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2hvd0NvbmZpcm1hdGlvbk1lc3NhZ2UoKTogdm9pZCB7XG4gICAgdGhpcy5zaG93Q29uZmlybWF0aW9uID0gdHJ1ZTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuc2hvd0NvbmZpcm1hdGlvbiA9IGZhbHNlO1xuICAgIH0sIDMwMDApO1xuICB9XG5cbiAgcHJpdmF0ZSBlbmFibGVCdXR0b25zKCk6IHZvaWQge1xuICAgIGNvbnN0IHNhdmVCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZV9ncmFwaCcpO1xuICAgIGNvbnN0IHJlc2V0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc2V0X2dyYXBoJyk7XG4gICAgc2F2ZUJ0bi5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgcmVzZXRCdG4ucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xuICB9XG5cbiAgcHVibGljIG5nQWZ0ZXJWaWV3SW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLnJlZ2lzdGVyRHJhZ0VsZW1lbnQoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVnaXN0ZXJEcmFnRWxlbWVudCgpOiB2b2lkIHtcbiAgICBjb25zdCBlbG1udCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkcmFnZ2FibGUnKTtcbiAgICBsZXQgcG9zMSA9IDAsXG4gICAgICBwb3MyID0gMCxcbiAgICAgIHBvczMgPSAwLFxuICAgICAgcG9zNCA9IDA7XG5cbiAgICBjb25zdCBkcmFnTW91c2VEb3duID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICAgIC8vIFByZXZlbnQgYW55IGRlZmF1bHQgYmVoYXZpb3JcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgLy8gR2V0IHRoZSBtb3VzZSBjdXJzb3IgcG9zaXRpb24gYXQgc3RhcnR1cFxuICAgICAgcG9zMyA9IGUuY2xpZW50WDtcbiAgICAgIHBvczQgPSBlLmNsaWVudFk7XG5cbiAgICAgIC8vIFNldCB1cCBtb3VzZSBldmVudCBsaXN0ZW5lcnNcbiAgICAgIGRvY3VtZW50Lm9ubW91c2V1cCA9IGNsb3NlRHJhZ0VsZW1lbnQ7XG4gICAgICBkb2N1bWVudC5vbm1vdXNlbW92ZSA9IGVsZW1lbnREcmFnO1xuICAgIH07XG5cbiAgICBjb25zdCBlbGVtZW50RHJhZyA9IChlOiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgICB0aGlzLmJ1dHRvbkJhclJpZ2h0UG9zaXRpb24gPSBudWxsO1xuXG4gICAgICAvLyBDYWxjdWxhdGUgdGhlIG5ldyBjdXJzb3IgcG9zaXRpb25cbiAgICAgIHBvczEgPSBwb3MzIC0gZS5jbGllbnRYO1xuICAgICAgcG9zMiA9IHBvczQgLSBlLmNsaWVudFk7XG4gICAgICBwb3MzID0gZS5jbGllbnRYO1xuICAgICAgcG9zNCA9IGUuY2xpZW50WTtcblxuICAgICAgLy8gTGltaXQgdGhlIGVsZW1lbnQncyBtb3ZlbWVudCB3aXRoaW4gdGhlIGJvdW5kYXJpZXMgb2YgdGhlIHBhZ2VcbiAgICAgIGNvbnN0IG1heFdpZHRoID0gdGhpcy53aWR0aCAtIGVsbW50Lm9mZnNldFdpZHRoO1xuICAgICAgY29uc3QgbWF4SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gZWxtbnQub2Zmc2V0SGVpZ2h0O1xuXG4gICAgICBsZXQgbmV3TGVmdCA9IGVsbW50Lm9mZnNldExlZnQgLSBwb3MxO1xuICAgICAgbGV0IG5ld1RvcCA9IGVsbW50Lm9mZnNldFRvcCAtIHBvczI7XG5cbiAgICAgIG5ld0xlZnQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihuZXdMZWZ0LCBtYXhXaWR0aCkpO1xuICAgICAgbmV3VG9wID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obmV3VG9wLCBtYXhIZWlnaHQpKTtcblxuICAgICAgLy8gU2V0IHRoZSBlbGVtZW50J3MgbmV3IHBvc2l0aW9uXG4gICAgICBlbG1udC5zdHlsZS5sZWZ0ID0gYCR7bmV3TGVmdH1weGA7XG4gICAgICBlbG1udC5zdHlsZS50b3AgPSBgJHtuZXdUb3B9cHhgO1xuICAgIH07XG5cbiAgICBjb25zdCBjbG9zZURyYWdFbGVtZW50ID0gKCkgPT4ge1xuICAgICAgLyogc3RvcCBtb3Zpbmcgd2hlbiBtb3VzZSBidXR0b24gaXMgcmVsZWFzZWQ6Ki9cbiAgICAgIGRvY3VtZW50Lm9ubW91c2V1cCA9IG51bGw7XG4gICAgICBkb2N1bWVudC5vbm1vdXNlbW92ZSA9IG51bGw7XG4gICAgfTtcblxuICAgIGlmIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbG1udC5pZCArICdIYW5kbGUnKSkge1xuICAgICAgLyogaWYgcHJlc2VudCwgdGhlIGhlYWRlciBpcyB3aGVyZSB5b3UgbW92ZSB0aGUgRElWIGZyb206Ki9cbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsbW50LmlkICsgJ0hhbmRsZScpLm9ubW91c2Vkb3duID0gZHJhZ01vdXNlRG93bjtcbiAgICB9IGVsc2Uge1xuICAgICAgLyogb3RoZXJ3aXNlLCBtb3ZlIHRoZSBESVYgZnJvbSBhbnl3aGVyZSBpbnNpZGUgdGhlIERJVjoqL1xuICAgICAgZWxtbnQub25tb3VzZWRvd24gPSBkcmFnTW91c2VEb3duO1xuICAgIH1cbiAgfVxuXG4gIG9wZW5Nb2RhbChtb2RhbDogc3RyaW5nKSB7XG4gICAgY29uc3QgbW9kYWxUZW1wbGF0ZSA9IHRoaXMubW9kYWxzQ29tcG9uZW50W21vZGFsXSBhcyBUZW1wbGF0ZVJlZjxhbnk+O1xuICAgIGlmIChtb2RhbFRlbXBsYXRlKSB7XG4gICAgICB0aGlzLm1vZGFsc0NvbXBvbmVudC5vcGVuTW9kYWwobW9kYWxUZW1wbGF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYE1vZGFsIHRlbXBsYXRlICR7bW9kYWx9IGlzIG5vdCBhdmFpbGFibGUuYCk7XG4gICAgfVxuICB9XG59IiwiPGRpdiBjbGFzcz1cInBhZ2VcIiBpZD1cInBhZ2VJZFwiICh3aW5kb3c6cmVzaXplKT1cIm9uUmVzaXplKCRldmVudClcIj5cbiAgPGRpdiBpZD1cImRyYWdnYWJsZVwiIGNsYXNzPVwiYnV0dG9uQmFyXCIgW3N0eWxlLnJpZ2h0XT1cImJ1dHRvbkJhclJpZ2h0UG9zaXRpb25cIj5cbiAgICA8ZGl2ICpuZ0lmPVwiY29udHJvbHNcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJkLWZsZXgganVzdGlmeS1jb250ZW50LWVuZFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYnRuLWdyb3VwXCIgcm9sZT1cImdyb3VwXCIgYXJpYS1sYWJlbD1cIkNvbnRyb2xzXCI+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJkcmFnZ2FibGVIYW5kbGVcIiBjbGFzcz1cImJ0biBidG4tbGlnaHRcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIk1vdmUgdG9vbGJhclwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1ncmlwLXZlcnRpY2FsXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuXG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJkYWdyZV9sYXlvdXRcIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJEYWdyZSBsYXlvdXRcIiAoY2xpY2spPVwiYXBwbHlMYXlvdXQoKVwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1kaWFncmFtLTNcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJzYXZlX2dyYXBoXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiU2F2ZSBkYXRhXCIgKGNsaWNrKT1cIm9uQ29uZmlybVNhdmUoKVwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1zYXZlXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwicmVzZXRfZ3JhcGhcIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJSZXNldCBkYXRhXCIgKGNsaWNrKT1cInJlc2V0R3JhcGgoKVwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1za2lwLWJhY2t3YXJkXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiICpuZ0lmPVwiem9vbVwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlpvb20gaW5cIiBpZD1cInpvb21faW5cIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktem9vbS1pblwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiAqbmdJZj1cInpvb21cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJab29tIG91dFwiIGlkPVwiem9vbV9vdXRcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktem9vbS1vdXRcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgKm5nSWY9XCJ6b29tXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiWm9vbSByZXNldFwiIGlkPVwiem9vbV9yZXNldFwiIGRpc2FibGVkPVwidHJ1ZVwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1hcnJvdy1jb3VudGVyY2xvY2t3aXNlXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiICpuZ0lmPVwiem9vbVwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlpvb20gdG8gZml0XCIgaWQ9XCJ6b29tX3RvX2ZpdFwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1hcnJvd3MtZnVsbHNjcmVlblwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiAqbmdJZj1cInpvb21cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJTZWxlY3QgYWxsXCIgaWQ9XCJzZWxlY3RfYWxsXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLWdyaWQtZmlsbFwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiAqbmdJZj1cInpvb21cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJJbnZlcnQgc2VsZWN0aW9uXCIgaWQ9XCJ0b2dnbGVfc2VsZWN0aW9uXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLXVpLWNoZWNrcy1ncmlkXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlRvZ2dsZSBzZWFyY2hcIiBpZD1cInRvZ2dsZV9zZWFyY2hcIlxuICAgICAgICAgICAgW25nQ2xhc3NdPVwieydzZWFyY2hCdXR0b25BY3RpdmUnOiBzaG93U2VhcmNoLCAnc2VhcmNoQnV0dG9uSW5hY3RpdmUnOiAhc2hvd1NlYXJjaH1cIlxuICAgICAgICAgICAgKGNsaWNrKT1cInRvZ2dsZVNlYXJjaCgpXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLXNlYXJjaFwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJzZWFyY2ggZmxvYXQtcmlnaHQgaW5wdXQtZ3JvdXAgbXQtMyBwci0wXCIgW2hpZGRlbl09XCIhc2hvd1NlYXJjaFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtcHJlcGVuZFwiPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwicHJldkJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlByZXZpb3VzXCIgZGlzYWJsZWQ+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLWFycm93LWxlZnQtc3F1YXJlXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwibmV4dEJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIk5leHRcIiBkaXNhYmxlZD5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktYXJyb3ctcmlnaHQtc3F1YXJlXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJzZWFyY2hJbnB1dFwiIGNsYXNzPVwiZm9ybS1jb250cm9sXCIgcGxhY2Vob2xkZXI9XCJTZWFyY2hcIiBhcmlhLWxhYmVsPVwiU2VhcmNoXCJcbiAgICAgICAgICBhcmlhLWRlc2NyaWJlZGJ5PVwic2VhcmNoXCIgLz5cbiAgICAgICAgPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFwcGVuZFwiPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLW91dGxpbmUtc2Vjb25kYXJ5XCIgdHlwZT1cImJ1dHRvblwiIGlkPVwic2VhcmNoQnV0dG9uXCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCJcbiAgICAgICAgICAgIGRhdGEtcGxhY2VtZW50PVwidG9wXCIgdGl0bGU9XCJTZWFyY2hcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktc2VhcmNoXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLWFwcGVuZFwiPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLW91dGxpbmUtc2Vjb25kYXJ5XCIgdHlwZT1cImJ1dHRvblwiIGlkPVwiY2xlYXJCdXR0b25cIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIlxuICAgICAgICAgICAgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIiB0aXRsZT1cIkNsZWFyXCIgZGlzYWJsZWQ+XG4gICAgICAgICAgICBjbGVhclxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgW2hpZGRlbl09XCIhc2hvd1NlYXJjaFwiIGlkPVwibm9NYXRjaGVzVGV4dFwiIGNsYXNzPVwibm9NYXRjaGVzVGV4dCBmbG9hdC1yaWdodFwiPk5vIG1hdGNoZXMgZm91bmQ8L2Rpdj5cbiAgPC9kaXY+XG4gIDwhLS0gWm9vbSBpbmRpY2F0b3ItLT5cbiAgPGRpdiAqbmdJZj1cInpvb21cIiBjbGFzcz1cInpvb21JbmRpY2F0b3JcIj5cbiAgICA8c3BhbiBpZD1cInpvb21fbGV2ZWxcIj48L3NwYW4+XG4gIDwvZGl2PlxuICA8IS0tIFNhdmUgY29uZmlybWF0aW9uLS0+XG4gIDxkaXYgKm5nSWY9XCJzaG93Q29uZmlybWF0aW9uXCIgY2xhc3M9XCJjb25maXJtYXRpb24tbWVzc2FnZS1jb250YWluZXJcIj5cbiAgICA8ZGl2IGNsYXNzPVwiYWxlcnQgYWxlcnQtc3VjY2VzcyBjb25maXJtYXRpb24tbWVzc2FnZVwiIHJvbGU9XCJhbGVydFwiIFtuZ0NsYXNzXT1cInsgJ2ZhZGUtb3V0JzogIXNob3dDb25maXJtYXRpb24gfVwiPlxuICAgICAgU2F2ZWQgPGkgY2xhc3M9XCJiaSBiaS1jaGVjay1jaXJjbGVcIj48L2k+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuXG4gIDxhcHAtY29udGV4dC1tZW51c1xuICAoZWRpdE5vZGVDb250ZXh0TWVudUV2ZW50KT1cImhhbmRsZUVkaXROb2Rlc0V2ZW50KCRldmVudClcIlxuICAoZmluZENyZWF0ZU5vZGVzQ29udGV4dE1lbnVFdmVudCk9XCJmaW5kQ3JlYXRlTm9kZXNFdmVudCgkZXZlbnQpXCJcbiAgKGNyZWF0ZUxpbmtDb250ZXh0TWVudUV2ZW50KT1cIm9wZW5Nb2RhbCgnY3JlYXRlTGlua01vZGFsJylcIlxuICAoZWRpdExpbmtMYWJlbENvbnRleHRNZW51RXZlbnQpPVwib25FZGl0TGlua0xhYmVsKClcIlxuICAoZWRpdExpbmtzQ29udGV4dE1lbnVFdmVudCk9XCJoYW5kbGVFZGl0TGlua3NFdmVudCgkZXZlbnQpXCI+XG4gIDwvYXBwLWNvbnRleHQtbWVudXM+XG5cbiAgPGFwcC1tb2RhbHNcbiAgW2VkaXROb2RlRGF0YV09XCJlZGl0Tm9kZURhdGFcIlxuICBbZWRpdExpbmtzRGF0YV09XCJlZGl0TGlua3NEYXRhXCJcbiAgKGNyZWF0ZUxpbmtFdmVudCk9XCJvbkNyZWF0ZUxpbmsoJGV2ZW50KVwiXG4gIChjcmVhdGVOb2RlRXZlbnQpPVwib25DcmVhdGVOb2RlKCRldmVudClcIlxuICAoZGVsZXRlTGlua0V2ZW50KT1cIm9uRGVsZXRlTGluaygkZXZlbnQpXCJcbiAgKGRlbGV0ZU5vZGVFdmVudCk9XCJvbkRlbGV0ZU5vZGUoKVwiPlxuICA8L2FwcC1tb2RhbHM+XG5cbiAgPHN2ZyAjc3ZnSWQgW2F0dHIud2lkdGhdPVwid2lkdGhcIiBoZWlnaHQ9XCI3ODBcIiAoY29udGV4dG1lbnUpPVwidmlzdWFsaXNlckNvbnRleHRNZW51cygkZXZlbnQpXCI+PC9zdmc+XG48L2Rpdj4iXX0=