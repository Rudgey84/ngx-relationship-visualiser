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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItcHJlbWl1bS1saWIvbGliL3Zpc3VhbGlzZXIvdmlzdWFsaXNlci1ncmFwaC92aXN1YWxpc2VyLWdyYXBoLmNvbXBvbmVudC50cyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Byb2plY3RzL25neC1yZWxhdGlvbnNoaXAtdmlzdWFsaXNlci1wcmVtaXVtLWxpYi9saWIvdmlzdWFsaXNlci92aXN1YWxpc2VyLWdyYXBoL3Zpc3VhbGlzZXItZ3JhcGguY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBRVQsS0FBSyxFQUNMLE1BQU0sRUFDTixZQUFZLEVBSWIsTUFBTSxlQUFlLENBQUM7QUFJdkIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDOzs7Ozs7Ozs7QUFTN0QsTUFBTSxPQUFPLHdCQUF3QjtJQXFCeEI7SUFDQTtJQUNBO0lBQ0Q7SUF2QlUsWUFBWSxDQUFhO0lBQ0osV0FBVyxDQUF3QjtJQUNsRSxrQkFBa0IsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO0lBQ2hELGtCQUFrQixDQUFDO0lBQ25CLGNBQWMsQ0FBQztJQUNmLGlCQUFpQixDQUFDO0lBQ2xCLGFBQWEsQ0FBQztJQUNkLEtBQUssQ0FBQztJQUNOLFVBQVUsR0FBWSxLQUFLLENBQUM7SUFDNUIsY0FBYyxDQUFPO0lBQ3JCLGdCQUFnQixHQUFZLEtBQUssQ0FBQztJQUNsQyxzQkFBc0IsQ0FBUztJQUMvQixhQUFhLEdBQVEsSUFBSSxDQUFDO0lBQzFCLFlBQVksR0FBUSxJQUFJLENBQUM7SUFDdkIsUUFBUSxHQUFZ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ZW50UmVmLFxuICBJbnB1dCxcbiAgT3V0cHV0LFxuICBFdmVudEVtaXR0ZXIsXG4gIE9uSW5pdCxcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgVGVtcGxhdGVSZWZcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBWaXN1YWxpc2VyR3JhcGhTZXJ2aWNlIH0gZnJvbSAnLi4vc2VydmljZXMvdmlzdWFsaXNlci1ncmFwaC5zZXJ2aWNlJztcbmltcG9ydCB7IERhZ3JlTm9kZXNPbmx5TGF5b3V0IH0gZnJvbSAnLi4vc2VydmljZXMvZGFncmUtbGF5b3V0LnNlcnZpY2UnO1xuaW1wb3J0IHsgQ29udGV4dE1lbnVTZXJ2aWNlIH0gZnJvbSAnQGtyZWFzaC9uZ3gtY29udGV4dG1lbnUnO1xuaW1wb3J0IHsgQ29udGV4dE1lbnVzQ29tcG9uZW50IH0gZnJvbSAnLi4vY29udGV4dC1tZW51cy9jb250ZXh0LW1lbnVzLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBEYXRhLCBMaW5rLCBSZWxhdGlvbnNoaXAgfSBmcm9tICcuLi8uLi9tb2RlbHMvZGF0YS5pbnRlcmZhY2UnO1xuaW1wb3J0IHsgTW9kYWxzQ29tcG9uZW50IH0gZnJvbSAnLi4vbW9kYWxzL21vZGFscy5jb21wb25lbnQnO1xuaW1wb3J0IHsgRGV4aWVTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vZGIvZ3JhcGhEYXRhYmFzZSc7XG5kZWNsYXJlIHZhciBib290Ym94OiBhbnk7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ3Zpc3VhbGlzZXItZ3JhcGgnLFxuICB0ZW1wbGF0ZVVybDogXCIuL3Zpc3VhbGlzZXItZ3JhcGguY29tcG9uZW50Lmh0bWxcIixcbiAgc3R5bGVVcmxzOiBbXCIuL3Zpc3VhbGlzZXItZ3JhcGguY29tcG9uZW50LnNjc3NcIl0sXG59KVxuZXhwb3J0IGNsYXNzIFZpc3VhbGlzZXJHcmFwaENvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgQWZ0ZXJWaWV3SW5pdCB7XG4gIEBWaWV3Q2hpbGQoJ3N2Z0lkJykgZ3JhcGhFbGVtZW50OiBFbGVtZW50UmVmO1xuICBAVmlld0NoaWxkKENvbnRleHRNZW51c0NvbXBvbmVudCkgcHVibGljIGNvbnRleHRNZW51OiBDb250ZXh0TWVudXNDb21wb25lbnQ7XG4gIEBPdXRwdXQoKSBzYXZlR3JhcGhEYXRhRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgcHVibGljIHNlbGVjdGVkTm9kZXNBcnJheTtcbiAgcHVibGljIHNlbGVjdGVkTm9kZUlkO1xuICBwdWJsaWMgc2VsZWN0ZWRMaW5rQXJyYXk7XG4gIHB1YmxpYyBzYXZlR3JhcGhEYXRhO1xuICBwdWJsaWMgd2lkdGg7XG4gIHB1YmxpYyBzaG93U2VhcmNoOiBib29sZWFuID0gZmFsc2U7XG4gIHB1YmxpYyBzYXZlZEdyYXBoRGF0YTogRGF0YTtcbiAgcHVibGljIHNob3dDb25maXJtYXRpb246IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHVibGljIGJ1dHRvbkJhclJpZ2h0UG9zaXRpb246IHN0cmluZztcbiAgcHVibGljIGVkaXRMaW5rc0RhdGE6IGFueSA9IG51bGw7XG4gIHB1YmxpYyBlZGl0Tm9kZURhdGE6IGFueSA9IG51bGw7XG4gIEBJbnB1dCgpIHJlYWRPbmx5OiBib29sZWFuID0gZmFsc2U7XG4gIEBJbnB1dCgpIHpvb206IGJvb2xlYW4gPSB0cnVlO1xuICBASW5wdXQoKSBjb250cm9sczogYm9vbGVhbiA9IHRydWU7XG4gIEBJbnB1dCgpIHpvb21Ub0ZpdDogYm9vbGVhbiA9IGZhbHNlO1xuICBAVmlld0NoaWxkKE1vZGFsc0NvbXBvbmVudCkgcHVibGljIG1vZGFsc0NvbXBvbmVudDogTW9kYWxzQ29tcG9uZW50O1xuICBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSB2aXN1YWxpc2VyR3JhcGhTZXJ2aWNlOiBWaXN1YWxpc2VyR3JhcGhTZXJ2aWNlLFxuICAgIHJlYWRvbmx5IGNvbnRleHRNZW51U2VydmljZTogQ29udGV4dE1lbnVTZXJ2aWNlLFxuICAgIHJlYWRvbmx5IGRhZ3JlTm9kZXNPbmx5TGF5b3V0OiBEYWdyZU5vZGVzT25seUxheW91dCxcbiAgICBwcml2YXRlIGRleGllU2VydmljZTogRGV4aWVTZXJ2aWNlXG4gICkgeyB9XG5cbiAgQElucHV0KClcbiAgc2V0IGRhdGEoZGF0YTogRGF0YSkge1xuICAgIGlmICghZGF0YSB8fCAhZGF0YS5kYXRhSWQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgZGF0YSBpbnB1dCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2F2ZWRHcmFwaERhdGEgPSBkYXRhO1xuXG4gICAgLy8gVGltZW91dDogVGhlIGlucHV0IGFycml2ZXMgYmVmb3JlIHRoZSBzdmcgaXMgcmVuZGVyZWQsIHRoZXJlZm9yZSB0aGUgbmF0aXZlRWxlbWVudCBkb2VzIG5vdCBleGlzdFxuICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5kYWdyZU5vZGVzT25seUxheW91dC5yZW5kZXJMYXlvdXQoZGF0YSk7XG4gICAgICAvLyBUYWtlIGEgY29weSBvZiBpbnB1dCBmb3IgcmVzZXRcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoZGF0YSk7XG5cbiAgICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS51cGRhdGUoXG4gICAgICAgIGRhdGEsXG4gICAgICAgIHRoaXMuZ3JhcGhFbGVtZW50Lm5hdGl2ZUVsZW1lbnQsXG4gICAgICAgIHRoaXMuem9vbSxcbiAgICAgICAgdGhpcy56b29tVG9GaXRcbiAgICAgICk7XG4gICAgfSwgNTAwKTtcbiAgfVxuXG4gIHB1YmxpYyBuZ09uSW5pdCgpIHtcbiAgICB0aGlzLmJ1dHRvbkJhclJpZ2h0UG9zaXRpb24gPSAnMCc7XG4gICAgdGhpcy51cGRhdGVXaWR0aCgpO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSB3aXRoIGRlZmF1bHQgZW1wdHkgZGF0YSBpZiBubyBkYXRhIGlzIHByb3ZpZGVkXG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ05vIGRhdGEgcHJvdmlkZWQsIHVzaW5nIGVtcHR5IGRhdGEgc2V0Jyk7XG4gICAgICB0aGlzLmRhdGEgPSB7XG4gICAgICAgIGRhdGFJZDogJzEnLFxuICAgICAgICBub2RlczogW10sXG4gICAgICAgIGxpbmtzOiBbXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gU3Vic2NyaWJlIHRvIHRoZSBsaW5rIHNlbGVjdGlvbnMgaW4gZDNcbiAgICB0aGlzLnZpc3VhbGlzZXJHcmFwaFNlcnZpY2Uuc2VsZWN0ZWROb2Rlc0FycmF5LnN1YnNjcmliZShcbiAgICAgIChzZWxlY3RlZE5vZGVzQXJyYXkpID0+IHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZE5vZGVzQXJyYXkgPSBzZWxlY3RlZE5vZGVzQXJyYXk7XG4gICAgICB9XG4gICAgKTtcblxuICAgIC8vIFN1YnNjcmliZSB0byB0aGUgZG91YmxlLWNsaWNrIG5vZGUgcGF5bG9hZFxuICAgIHRoaXMudmlzdWFsaXNlckdyYXBoU2VydmljZS5kYmxDbGlja05vZGVQYXlsb2FkLnN1YnNjcmliZShcbiAgICAgIChkYmxDbGlja05vZGVQYXlsb2FkKSA9PiB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWROb2RlSWQgPSBkYmxDbGlja05vZGVQYXlsb2FkWzBdLmlkO1xuICAgICAgICB0aGlzLmhhbmRsZUVkaXROb2Rlc0V2ZW50KHRydWUpO1xuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBTdWJzY3JpYmUgdG8gdGhlIGRvdWJsZS1jbGljayBMaW5rIHBheWxvYWRcbiAgICB0aGlzLnZpc3VhbGlzZXJHcmFwaFNlcnZpY2UuZGJsQ2xpY2tMaW5rUGF5bG9hZC5zdWJzY3JpYmUoXG4gICAgICAoZGJsQ2xpY2tMaW5rUGF5bG9hZCkgPT4ge1xuICAgICAgICB0aGlzLnNlbGVjdGVkTGlua0FycmF5ID0gZGJsQ2xpY2tMaW5rUGF5bG9hZDtcbiAgICAgICAgdGhpcy5vbkVkaXRMaW5rTGFiZWwoKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgdGhpcy52aXN1YWxpc2VyR3JhcGhTZXJ2aWNlLnNlbGVjdGVkTGlua0FycmF5LnN1YnNjcmliZShcbiAgICAgIChzZWxlY3RlZExpbmtBcnJheSkgPT4ge1xuICAgICAgICB0aGlzLnNlbGVjdGVkTGlua0FycmF5ID0gc2VsZWN0ZWRMaW5rQXJyYXk7XG4gICAgICB9XG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyB0b2dnbGVTZWFyY2goKSB7XG4gICAgdGhpcy5zaG93U2VhcmNoID0gIXRoaXMuc2hvd1NlYXJjaDtcblxuICAgIGlmICh0aGlzLnNob3dTZWFyY2gpIHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjb25zdCBmaWVsZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWFyY2hJbnB1dCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgIGZpZWxkLmZvY3VzKCk7XG4gICAgICAgICAgZmllbGQuc2V0U2VsZWN0aW9uUmFuZ2UoMCwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignU2VhcmNoIGlucHV0IG5vdCBmb3VuZC4nKTtcbiAgICAgICAgfVxuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIG9uUmVzaXplKGV2ZW50KTogdm9pZCB7XG4gICAgdGhpcy51cGRhdGVXaWR0aCgpO1xuICB9XG5cbiAgcHVibGljIHVwZGF0ZVdpZHRoKCk6IHZvaWQge1xuICAgIHRoaXMud2lkdGggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGFnZUlkJykub2Zmc2V0V2lkdGg7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgdmlzdWFsaXNlckNvbnRleHRNZW51cyhldmVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnJlYWRPbmx5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGNvbnRleHRNZW51O1xuICAgIGxldCBpdGVtO1xuICAgIGNvbnN0IHRhcmdldEVsID0gZXZlbnQudGFyZ2V0O1xuICAgIGNvbnN0IGxvY2FsTmFtZSA9IHRhcmdldEVsLmxvY2FsTmFtZTtcbiAgICBjb25zdCBwYXJlbnROb2RlSWQgPSB0YXJnZXRFbC5wYXJlbnROb2RlLmlkO1xuICAgIGNvbnN0IGRhdGEgPSB0YXJnZXRFbC5wYXJlbnROb2RlLl9fZGF0YV9fO1xuICAgIHRoaXMuc2VsZWN0ZWROb2RlSWQgPSB0YXJnZXRFbC5pZCB8fCAoZGF0YSAmJiBkYXRhLmlkKTtcblxuICAgIGlmICh0aGlzLnNlbGVjdGVkTm9kZXNBcnJheT8ubGVuZ3RoID09PSAyKSB7XG4gICAgICBjb250ZXh0TWVudSA9IHRoaXMuY29udGV4dE1lbnUuY3JlYXRlRWRpdExpbmtDb250ZXh0TWVudTtcbiAgICAgIGl0ZW0gPSB7XG4gICAgICAgIGdyYXBoRGF0YTogdGhpcy5zYXZlZEdyYXBoRGF0YSxcbiAgICAgICAgc2VsZWN0ZWROb2RlczogdGhpcy5zZWxlY3RlZE5vZGVzQXJyYXlcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChsb2NhbE5hbWUgPT09ICd0ZXh0JyB8fCBsb2NhbE5hbWUgPT09ICdpbWFnZScgfHwgcGFyZW50Tm9kZUlkID09PSAnbm9kZVRleHQnKSB7XG4gICAgICAgIGNvbnRleHRNZW51ID0gdGhpcy5jb250ZXh0TWVudS5lZGl0Tm9kZUNvbnRleHRNZW51O1xuICAgICAgICBpdGVtID0gdGhpcy5zZWxlY3RlZE5vZGVJZDtcbiAgICAgIH0gZWxzZSBpZiAobG9jYWxOYW1lID09PSAndGV4dFBhdGgnKSB7XG4gICAgICAgIGNvbnRleHRNZW51ID0gdGhpcy5jb250ZXh0TWVudS5lZGl0TGlua0xhYmVsQ29udGV4dE1lbnU7XG4gICAgICAgIGl0ZW0gPSB0aGlzLnNlbGVjdGVkTGlua0FycmF5O1xuICAgICAgfSBlbHNlIGlmIChsb2NhbE5hbWUgPT09ICdzdmcnKSB7XG4gICAgICAgIGNvbnRleHRNZW51ID0gdGhpcy5jb250ZXh0TWVudS5maW5kQ3JlYXRlTm9kZXNDb250ZXh0TWVudTtcbiAgICAgICAgaXRlbSA9ICdpdGVtJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHRNZW51U2VydmljZS5zaG93Lm5leHQoe1xuICAgICAgY29udGV4dE1lbnUsXG4gICAgICBldmVudCxcbiAgICAgIGl0ZW0sXG4gICAgfSk7XG5cbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgLy8gVXBkYXRlIGNvbnRleHQgbWVudSBpdGVtcyBiYXNlZCBvbiBkYXRhIGZyb20gRGV4aWVcbiAgICBjb25zdCB1cGRhdGVkRGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWROb2Rlc0FycmF5Py5sZW5ndGggPT09IDIpIHtcbiAgICAgIGl0ZW0uZ3JhcGhEYXRhID0gdXBkYXRlZERhdGE7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGZpbmRDcmVhdGVOb2Rlc0V2ZW50KGFjdGlvbjogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKGFjdGlvbiA9PT0gJ2ZpbmROb2RlcycpIHtcbiAgICAgIHRoaXMudG9nZ2xlU2VhcmNoKCk7XG4gICAgfSBlbHNlIGlmIChhY3Rpb24gPT09ICdjcmVhdGVOb2RlJykge1xuICAgICAgdGhpcy5vcGVuY3JlYXRlTm9kZU1vZGFsKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBvcGVuY3JlYXRlTm9kZU1vZGFsKCk6IHZvaWQge1xuICAgIHRoaXMubW9kYWxzQ29tcG9uZW50Lm9wZW5Nb2RhbCh0aGlzLm1vZGFsc0NvbXBvbmVudC5jcmVhdGVOb2RlTW9kYWwpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIG9uQ29uZmlybVNhdmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYm9vdGJveC5jb25maXJtKHtcbiAgICAgIHRpdGxlOiBcIlNhdmUgR3JhcGhcIixcbiAgICAgIGNlbnRlclZlcnRpY2FsOiB0cnVlLFxuICAgICAgbWVzc2FnZTogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gc2F2ZSB0aGUgZ3JhcGg/XCIsXG4gICAgICBidXR0b25zOiB7XG4gICAgICAgIGNvbmZpcm06IHtcbiAgICAgICAgICBsYWJlbDogJ1llcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLXN1Y2Nlc3MnXG4gICAgICAgIH0sXG4gICAgICAgIGNhbmNlbDoge1xuICAgICAgICAgIGxhYmVsOiAnTm8nLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1kYW5nZXInXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjYWxsYmFjazogYXN5bmMgKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgdGhpcy52aXN1YWxpc2VyR3JhcGhTZXJ2aWNlLnNhdmVHcmFwaERhdGEuc3Vic2NyaWJlKChzYXZlR3JhcGhEYXRhKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNhdmVHcmFwaERhdGEgPSBzYXZlR3JhcGhEYXRhO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdGhpcy5zYXZlR3JhcGhEYXRhRXZlbnQuZW1pdCh0aGlzLnNhdmVHcmFwaERhdGEpO1xuXG4gICAgICAgICAgdGhpcy5kaXNhYmxlQnV0dG9ucyh0cnVlKTtcbiAgICAgICAgICB0aGlzLmRhdGEgPSB0aGlzLnNhdmVHcmFwaERhdGE7XG4gICAgICAgICAgdGhpcy5zaG93Q29uZmlybWF0aW9uTWVzc2FnZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgb25DcmVhdGVOb2RlKG5vZGVEYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgbm9kZSBhbHJlYWR5IGV4aXN0c1xuICAgIGNvbnN0IGV4aXN0aW5nTm9kZUluZGV4ID0gZGF0YS5ub2Rlcy5maW5kSW5kZXgobm9kZSA9PiBub2RlLmlkID09PSBub2RlRGF0YS5pZCk7XG5cbiAgICBpZiAoZXhpc3RpbmdOb2RlSW5kZXggPT09IC0xKSB7XG4gICAgICAvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBudW1lcmljIElEIGZvciB0aGUgbmV3IG5vZGVcbiAgICAgIGxldCBuZXdJZDtcbiAgICAgIGRvIHtcbiAgICAgICAgbmV3SWQgPSBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50MzJBcnJheSgxKSlbMF07XG4gICAgICB9IHdoaWxlIChkYXRhLm5vZGVzLnNvbWUobm9kZSA9PiBub2RlLmlkID09PSBuZXdJZC50b1N0cmluZygpKSk7XG5cbiAgICAgIG5vZGVEYXRhLmlkID0gbmV3SWQudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICBib290Ym94LmNvbmZpcm0oe1xuICAgICAgdGl0bGU6IFwiQ3JlYXRpbmcgbm9kZVwiLFxuICAgICAgY2VudGVyVmVydGljYWw6IHRydWUsXG4gICAgICBtZXNzYWdlOiBcIkNyZWF0aW5nIGEgbm9kZSB3aWxsIHNhdmUgZ3JhcGggZGF0YSwgYXJlIHlvdSBzdXJlP1wiLFxuICAgICAgYnV0dG9uczoge1xuICAgICAgICBjb25maXJtOiB7XG4gICAgICAgICAgbGFiZWw6ICdZZXMnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1zdWNjZXNzJ1xuICAgICAgICB9LFxuICAgICAgICBjYW5jZWw6IHtcbiAgICAgICAgICBsYWJlbDogJ05vJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tZGFuZ2VyJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2FsbGJhY2s6IGFzeW5jIChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIGlmIChleGlzdGluZ05vZGVJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgZXhpc3Rpbmcgbm9kZVxuICAgICAgICAgICAgZGF0YS5ub2Rlc1tleGlzdGluZ05vZGVJbmRleF0gPSBub2RlRGF0YTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQWRkIHRoZSBuZXcgbm9kZVxuICAgICAgICAgICAgZGF0YS5ub2Rlcy5wdXNoKG5vZGVEYXRhKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YUV2ZW50LmVtaXQoZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBvbkNyZWF0ZUxpbmsobGlua0RhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuc2F2ZWRHcmFwaERhdGEpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3NhdmVkR3JhcGhEYXRhIGlzIG5vdCBzZXQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGhhdCBleGFjdGx5IHR3byBub2RlcyBhcmUgc2VsZWN0ZWRcbiAgICBpZiAodGhpcy5zZWxlY3RlZE5vZGVzQXJyYXkubGVuZ3RoID09PSAyKSB7XG4gICAgICBjb25zdCBzb3VyY2VOb2RlID0gdGhpcy5zZWxlY3RlZE5vZGVzQXJyYXlbMF07XG4gICAgICBjb25zdCB0YXJnZXROb2RlID0gdGhpcy5zZWxlY3RlZE5vZGVzQXJyYXlbMV07XG5cbiAgICAgIC8vIFJldHJpZXZlIHRoZSBzYXZlZCBncmFwaCBkYXRhIGZyb20gRGV4aWVcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuXG4gICAgICAvLyBGaW5kIHRoZSBuZXh0IGF2YWlsYWJsZSBsYWJlbEluZGV4XG4gICAgICBjb25zdCBhbGxJbmRleGVzID0gZGF0YS5saW5rcy5yZWR1Y2UoKGFjYywgbGluaykgPT4ge1xuICAgICAgICByZXR1cm4gYWNjLmNvbmNhdChsaW5rLnJlbGF0aW9uc2hpcHMubWFwKHJlbCA9PiByZWwubGFiZWxJbmRleCkpO1xuICAgICAgfSwgW10pO1xuICAgICAgbGV0IG5leHRJbmRleCA9IE1hdGgubWF4KC4uLmFsbEluZGV4ZXMsIDApICsgMTtcblxuICAgICAgLy8gTWFwIG92ZXIgdGhlIGxhYmVscyBhbmQgbGlua0ljb24gdmFsdWVzLCBhc3N1bWluZyBlYWNoIGxhYmVsIGhhcyBhIGNvcnJlc3BvbmRpbmcgbGlua0ljb25cbiAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcHM6IFJlbGF0aW9uc2hpcFtdID0gbGlua0RhdGEubGFiZWwubWFwKChpdGVtKSA9PiAoe1xuICAgICAgICBsYWJlbEluZGV4OiBpdGVtLmxhYmVsSW5kZXggIT09IHVuZGVmaW5lZCA/IGl0ZW0ubGFiZWxJbmRleCA6IG5leHRJbmRleCsrLFxuICAgICAgICBsYWJlbDogaXRlbS5sYWJlbCxcbiAgICAgICAgc291cmNlOiBzb3VyY2VOb2RlLmlkLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldE5vZGUuaWQsXG4gICAgICAgIGxpbmtJY29uOiBpdGVtLmxpbmtJY29uXG4gICAgICB9KSk7XG5cbiAgICAgIGNvbnN0IG5ld0xpbms6IExpbmsgPSB7XG4gICAgICAgIHNvdXJjZTogc291cmNlTm9kZS5pZCxcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXROb2RlLmlkLFxuICAgICAgICBsaW5lU3R5bGU6IGxpbmtEYXRhLmxpbmVTdHlsZSxcbiAgICAgICAgc291cmNlQXJyb3c6IGxpbmtEYXRhLnNvdXJjZUFycm93LFxuICAgICAgICB0YXJnZXRBcnJvdzogbGlua0RhdGEudGFyZ2V0QXJyb3csXG4gICAgICAgIGxpbmtJZDogYCR7c291cmNlTm9kZS5pZH1fJHt0YXJnZXROb2RlLmlkfWAsXG4gICAgICAgIHJlbGF0aW9uc2hpcHMsXG4gICAgICB9O1xuXG4gICAgICBib290Ym94LmNvbmZpcm0oe1xuICAgICAgICB0aXRsZTogXCJDcmVhdGluZyBsaW5rXCIsXG4gICAgICAgIGNlbnRlclZlcnRpY2FsOiB0cnVlLFxuICAgICAgICBtZXNzYWdlOiBcIkNyZWF0aW5nIGEgbGluayB3aWxsIHNhdmUgZ3JhcGggZGF0YSwgYXJlIHlvdSBzdXJlP1wiLFxuICAgICAgICBidXR0b25zOiB7XG4gICAgICAgICAgY29uZmlybToge1xuICAgICAgICAgICAgbGFiZWw6ICdZZXMnLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLXN1Y2Nlc3MnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjYW5jZWw6IHtcbiAgICAgICAgICAgIGxhYmVsOiAnTm8nLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLWRhbmdlcidcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNhbGxiYWNrOiBhc3luYyAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdMaW5rSW5kZXggPSBkYXRhLmxpbmtzLmZpbmRJbmRleChsaW5rID0+XG4gICAgICAgICAgICAgIGxpbmsubGlua0lkID09PSBgJHtzb3VyY2VOb2RlLmlkfV8ke3RhcmdldE5vZGUuaWR9YCB8fCBsaW5rLmxpbmtJZCA9PT0gYCR7dGFyZ2V0Tm9kZS5pZH1fJHtzb3VyY2VOb2RlLmlkfWBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmdMaW5rSW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgIGRhdGEubGlua3NbZXhpc3RpbmdMaW5rSW5kZXhdID0gbmV3TGluaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRhdGEubGlua3MucHVzaChuZXdMaW5rKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YUV2ZW50LmVtaXQoZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5lcnJvcignUGxlYXNlIHNlbGVjdCBleGFjdGx5IHR3byBub2RlcyB0byBjcmVhdGUgYSBsaW5rLicpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBvbkRlbGV0ZU5vZGUoKSB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYm9vdGJveC5jb25maXJtKHtcbiAgICAgIHRpdGxlOiBcIkRlbGV0aW5nIG5vZGVcIixcbiAgICAgIGNlbnRlclZlcnRpY2FsOiB0cnVlLFxuICAgICAgbWVzc2FnZTogXCJEZWxldGluZyBhIG5vZGUgd2lsbCBzYXZlIGdyYXBoIGRhdGEsIGFyZSB5b3Ugc3VyZT8gVGhpcyB3aWxsIGFsc28gZGVsZXRlIGFsbCBsaW5rcyBhc3NvY2lhdGVkIHdpdGggdGhpcyBub2RlLlwiLFxuICAgICAgYnV0dG9uczoge1xuICAgICAgICBjb25maXJtOiB7XG4gICAgICAgICAgbGFiZWw6ICdZZXMnLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1zdWNjZXNzJ1xuICAgICAgICB9LFxuICAgICAgICBjYW5jZWw6IHtcbiAgICAgICAgICBsYWJlbDogJ05vJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICdidG4tZGFuZ2VyJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2FsbGJhY2s6IGFzeW5jIChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSBub2RlIHdpdGggdGhlIG1hdGNoaW5nIGlkXG4gICAgICAgICAgZGF0YS5ub2RlcyA9IGRhdGEubm9kZXMuZmlsdGVyKG5vZGUgPT4gbm9kZS5pZCAhPT0gdGhpcy5zZWxlY3RlZE5vZGVJZCk7XG5cbiAgICAgICAgICAvLyBSZW1vdmUgbGlua3Mgd2l0aCBtYXRjaGluZyBzb3VyY2Ugb3IgdGFyZ2V0XG4gICAgICAgICAgZGF0YS5saW5rcyA9IGRhdGEubGlua3MuZmlsdGVyKGxpbmsgPT4gbGluay5zb3VyY2UgIT09IHRoaXMuc2VsZWN0ZWROb2RlSWQgJiYgbGluay50YXJnZXQgIT09IHRoaXMuc2VsZWN0ZWROb2RlSWQpO1xuXG4gICAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgICB0aGlzLnNhdmVHcmFwaERhdGFFdmVudC5lbWl0KGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgb25EZWxldGVMaW5rKGxpbmtJZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGJvb3Rib3guY29uZmlybSh7XG4gICAgICB0aXRsZTogXCJEZWxldGluZyBsaW5rXCIsXG4gICAgICBjZW50ZXJWZXJ0aWNhbDogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6IFwiRGVsZXRpbmcgYSBsaW5rIHdpbGwgc2F2ZSBncmFwaCBkYXRhLCBhcmUgeW91IHN1cmU/XCIsXG4gICAgICBidXR0b25zOiB7XG4gICAgICAgIGNvbmZpcm06IHtcbiAgICAgICAgICBsYWJlbDogJ1llcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnYnRuLXN1Y2Nlc3MnXG4gICAgICAgIH0sXG4gICAgICAgIGNhbmNlbDoge1xuICAgICAgICAgIGxhYmVsOiAnTm8nLFxuICAgICAgICAgIGNsYXNzTmFtZTogJ2J0bi1kYW5nZXInXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjYWxsYmFjazogYXN5bmMgKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG4gICAgICAgICAgY29uc3QgZXhpc3RpbmdMaW5rSW5kZXggPSBkYXRhLmxpbmtzLmZpbmRJbmRleChsaW5rID0+IGxpbmsubGlua0lkID09PSBsaW5rSWQpO1xuICAgICAgICAgIGlmIChleGlzdGluZ0xpbmtJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGRhdGEubGlua3Muc3BsaWNlKGV4aXN0aW5nTGlua0luZGV4LCAxKTtcblxuICAgICAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHRoaXMuc2F2ZUdyYXBoRGF0YUV2ZW50LmVtaXQoZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgb25FZGl0TGlua0xhYmVsKCkge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGJvb3Rib3gucHJvbXB0KHtcbiAgICAgIHRpdGxlOiBcIkVkaXRpbmcgYSBsaW5rIGxhYmVsIHdpbGwgc2F2ZSBncmFwaCBkYXRhLCBhcmUgeW91IHN1cmU/XCIsXG4gICAgICBjZW50ZXJWZXJ0aWNhbDogdHJ1ZSxcbiAgICAgIHZhbHVlOiB0aGlzLnNlbGVjdGVkTGlua0FycmF5WzBdLmxhYmVsLFxuICAgICAgY2FsbGJhY2s6IGFzeW5jIChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgbGFiZWwgcHJvcGVydHkgd2l0aCB0aGUgcmVzdWx0XG4gICAgICAgICAgdGhpcy5zZWxlY3RlZExpbmtBcnJheVswXS5sYWJlbCA9IHJlc3VsdDtcblxuICAgICAgICAgIC8vIFJldHJpZXZlIHRoZSBzYXZlZCBncmFwaCBkYXRhIGZyb20gRGV4aWVcbiAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcblxuICAgICAgICAgIC8vIEZpbmQgdGhlIGxpbmsgaW4gdGhlIGRhdGEgdXNpbmcgc291cmNlIGFuZCB0YXJnZXQgSURzXG4gICAgICAgICAgY29uc3QgbGluayA9IGRhdGEubGlua3MuZmluZChsaW5rID0+XG4gICAgICAgICAgICAobGluay5zb3VyY2UgPT09IHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXlbMF0uc291cmNlLmlkICYmIGxpbmsudGFyZ2V0ID09PSB0aGlzLnNlbGVjdGVkTGlua0FycmF5WzBdLnRhcmdldC5pZCkgfHxcbiAgICAgICAgICAgIChsaW5rLnNvdXJjZSA9PT0gdGhpcy5zZWxlY3RlZExpbmtBcnJheVswXS50YXJnZXQuaWQgJiYgbGluay50YXJnZXQgPT09IHRoaXMuc2VsZWN0ZWRMaW5rQXJyYXlbMF0uc291cmNlLmlkKVxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAobGluaykge1xuICAgICAgICAgICAgLy8gRmluZCB0aGUgcmVsYXRpb25zaGlwIHdpdGggdGhlIHNhbWUgbGFiZWxJbmRleFxuICAgICAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwID0gbGluay5yZWxhdGlvbnNoaXBzLmZpbmQocmVsID0+IHJlbC5sYWJlbEluZGV4ID09PSB0aGlzLnNlbGVjdGVkTGlua0FycmF5WzBdLmxhYmVsSW5kZXgpO1xuICAgICAgICAgICAgaWYgKHJlbGF0aW9uc2hpcCkge1xuICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhYmVsIGluIHRoZSBtYXRjaGVkIG9iamVjdFxuICAgICAgICAgICAgICByZWxhdGlvbnNoaXAubGFiZWwgPSByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgdGhpcy5zYXZlR3JhcGhEYXRhRXZlbnQuZW1pdChkYXRhKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTGluayBub3QgZm91bmQuJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgaGFuZGxlRWRpdExpbmtzRXZlbnQoZXZlbnQ6IHsgb3BlbjogYm9vbGVhbjsgZGF0YTogYW55IH0pIHtcbiAgICBpZiAoZXZlbnQub3Blbikge1xuICAgICAgdGhpcy5tb2RhbHNDb21wb25lbnQub3Blbk1vZGFsKHRoaXMubW9kYWxzQ29tcG9uZW50LmVkaXRMaW5rc01vZGFsKTtcbiAgICAgIHRoaXMuZWRpdExpbmtzRGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIGhhbmRsZUVkaXROb2Rlc0V2ZW50KGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50KSB7XG4gICAgICB0aGlzLm1vZGFsc0NvbXBvbmVudC5vcGVuTW9kYWwodGhpcy5tb2RhbHNDb21wb25lbnQuZWRpdE5vZGVNb2RhbCk7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKHRoaXMuc2F2ZWRHcmFwaERhdGEuZGF0YUlkKTtcbiAgICAgIHRoaXMuZWRpdE5vZGVEYXRhID0gZGF0YS5ub2Rlcy5maW5kKG5vZGUgPT4gbm9kZS5pZCA9PT0gdGhpcy5zZWxlY3RlZE5vZGVJZCk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlc2V0R3JhcGgoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnNhdmVkR3JhcGhEYXRhKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzYXZlZEdyYXBoRGF0YSBpcyBub3Qgc2V0Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSh0aGlzLnNhdmVkR3JhcGhEYXRhLmRhdGFJZCk7XG4gICAgdGhpcy5kaXNhYmxlQnV0dG9ucyh0cnVlKTtcbiAgICB0aGlzLnZpc3VhbGlzZXJHcmFwaFNlcnZpY2UucmVzZXRHcmFwaChcbiAgICAgIGRhdGEsXG4gICAgICB0aGlzLmdyYXBoRWxlbWVudC5uYXRpdmVFbGVtZW50LFxuICAgICAgdGhpcy56b29tLFxuICAgICAgdGhpcy56b29tVG9GaXRcbiAgICApO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGFwcGx5TGF5b3V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5zYXZlZEdyYXBoRGF0YSkge1xuICAgICAgY29uc29sZS5lcnJvcignc2F2ZWRHcmFwaERhdGEgaXMgbm90IHNldCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmRleGllU2VydmljZS5nZXRHcmFwaERhdGEodGhpcy5zYXZlZEdyYXBoRGF0YS5kYXRhSWQpO1xuICAgIGNvbnN0IG5ld0RhZ3JlTGF5b3V0ID0gdGhpcy5kYWdyZU5vZGVzT25seUxheW91dC5pbml0UmVuZGVyTGF5b3V0KGRhdGEpO1xuXG4gICAgdGhpcy52aXN1YWxpc2VyR3JhcGhTZXJ2aWNlLnJlc2V0R3JhcGgoXG4gICAgICBuZXdEYWdyZUxheW91dCxcbiAgICAgIHRoaXMuZ3JhcGhFbGVtZW50Lm5hdGl2ZUVsZW1lbnQsXG4gICAgICB0aGlzLnpvb20sXG4gICAgICB0aGlzLnpvb21Ub0ZpdFxuICAgICk7XG4gICAgdGhpcy5lbmFibGVCdXR0b25zKCk7XG4gIH1cblxuICBwcml2YXRlIGRpc2FibGVCdXR0b25zKGRpc2FibGVkOiBib29sZWFuKTogdm9pZCB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnI3NhdmVfZ3JhcGgsICNyZXNldF9ncmFwaCcpLmZvckVhY2goYnRuID0+IHtcbiAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgU3RyaW5nKGRpc2FibGVkKSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNob3dDb25maXJtYXRpb25NZXNzYWdlKCk6IHZvaWQge1xuICAgIHRoaXMuc2hvd0NvbmZpcm1hdGlvbiA9IHRydWU7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnNob3dDb25maXJtYXRpb24gPSBmYWxzZTtcbiAgICB9LCAzMDAwKTtcbiAgfVxuXG4gIHByaXZhdGUgZW5hYmxlQnV0dG9ucygpOiB2b2lkIHtcbiAgICBjb25zdCBzYXZlQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmVfZ3JhcGgnKTtcbiAgICBjb25zdCByZXNldEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXNldF9ncmFwaCcpO1xuICAgIHNhdmVCdG4ucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xuICAgIHJlc2V0QnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgfVxuXG4gIHB1YmxpYyBuZ0FmdGVyVmlld0luaXQoKTogdm9pZCB7XG4gICAgdGhpcy5yZWdpc3RlckRyYWdFbGVtZW50KCk7XG4gIH1cblxuICBwcml2YXRlIHJlZ2lzdGVyRHJhZ0VsZW1lbnQoKTogdm9pZCB7XG4gICAgY29uc3QgZWxtbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZHJhZ2dhYmxlJyk7XG4gICAgbGV0IHBvczEgPSAwLFxuICAgICAgcG9zMiA9IDAsXG4gICAgICBwb3MzID0gMCxcbiAgICAgIHBvczQgPSAwO1xuXG4gICAgY29uc3QgZHJhZ01vdXNlRG93biA9IChlOiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgICAvLyBQcmV2ZW50IGFueSBkZWZhdWx0IGJlaGF2aW9yXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIC8vIEdldCB0aGUgbW91c2UgY3Vyc29yIHBvc2l0aW9uIGF0IHN0YXJ0dXBcbiAgICAgIHBvczMgPSBlLmNsaWVudFg7XG4gICAgICBwb3M0ID0gZS5jbGllbnRZO1xuXG4gICAgICAvLyBTZXQgdXAgbW91c2UgZXZlbnQgbGlzdGVuZXJzXG4gICAgICBkb2N1bWVudC5vbm1vdXNldXAgPSBjbG9zZURyYWdFbGVtZW50O1xuICAgICAgZG9jdW1lbnQub25tb3VzZW1vdmUgPSBlbGVtZW50RHJhZztcbiAgICB9O1xuXG4gICAgY29uc3QgZWxlbWVudERyYWcgPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgICAgdGhpcy5idXR0b25CYXJSaWdodFBvc2l0aW9uID0gbnVsbDtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBuZXcgY3Vyc29yIHBvc2l0aW9uXG4gICAgICBwb3MxID0gcG9zMyAtIGUuY2xpZW50WDtcbiAgICAgIHBvczIgPSBwb3M0IC0gZS5jbGllbnRZO1xuICAgICAgcG9zMyA9IGUuY2xpZW50WDtcbiAgICAgIHBvczQgPSBlLmNsaWVudFk7XG5cbiAgICAgIC8vIExpbWl0IHRoZSBlbGVtZW50J3MgbW92ZW1lbnQgd2l0aGluIHRoZSBib3VuZGFyaWVzIG9mIHRoZSBwYWdlXG4gICAgICBjb25zdCBtYXhXaWR0aCA9IHRoaXMud2lkdGggLSBlbG1udC5vZmZzZXRXaWR0aDtcbiAgICAgIGNvbnN0IG1heEhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIGVsbW50Lm9mZnNldEhlaWdodDtcblxuICAgICAgbGV0IG5ld0xlZnQgPSBlbG1udC5vZmZzZXRMZWZ0IC0gcG9zMTtcbiAgICAgIGxldCBuZXdUb3AgPSBlbG1udC5vZmZzZXRUb3AgLSBwb3MyO1xuXG4gICAgICBuZXdMZWZ0ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4obmV3TGVmdCwgbWF4V2lkdGgpKTtcbiAgICAgIG5ld1RvcCA9IE1hdGgubWF4KDAsIE1hdGgubWluKG5ld1RvcCwgbWF4SGVpZ2h0KSk7XG5cbiAgICAgIC8vIFNldCB0aGUgZWxlbWVudCdzIG5ldyBwb3NpdGlvblxuICAgICAgZWxtbnQuc3R5bGUubGVmdCA9IGAke25ld0xlZnR9cHhgO1xuICAgICAgZWxtbnQuc3R5bGUudG9wID0gYCR7bmV3VG9wfXB4YDtcbiAgICB9O1xuXG4gICAgY29uc3QgY2xvc2VEcmFnRWxlbWVudCA9ICgpID0+IHtcbiAgICAgIC8qIHN0b3AgbW92aW5nIHdoZW4gbW91c2UgYnV0dG9uIGlzIHJlbGVhc2VkOiovXG4gICAgICBkb2N1bWVudC5vbm1vdXNldXAgPSBudWxsO1xuICAgICAgZG9jdW1lbnQub25tb3VzZW1vdmUgPSBudWxsO1xuICAgIH07XG5cbiAgICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxtbnQuaWQgKyAnSGFuZGxlJykpIHtcbiAgICAgIC8qIGlmIHByZXNlbnQsIHRoZSBoZWFkZXIgaXMgd2hlcmUgeW91IG1vdmUgdGhlIERJViBmcm9tOiovXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbG1udC5pZCArICdIYW5kbGUnKS5vbm1vdXNlZG93biA9IGRyYWdNb3VzZURvd247XG4gICAgfSBlbHNlIHtcbiAgICAgIC8qIG90aGVyd2lzZSwgbW92ZSB0aGUgRElWIGZyb20gYW55d2hlcmUgaW5zaWRlIHRoZSBESVY6Ki9cbiAgICAgIGVsbW50Lm9ubW91c2Vkb3duID0gZHJhZ01vdXNlRG93bjtcbiAgICB9XG4gIH1cblxuICBvcGVuTW9kYWwobW9kYWw6IHN0cmluZykge1xuICAgIGNvbnN0IG1vZGFsVGVtcGxhdGUgPSB0aGlzLm1vZGFsc0NvbXBvbmVudFttb2RhbF0gYXMgVGVtcGxhdGVSZWY8YW55PjtcbiAgICBpZiAobW9kYWxUZW1wbGF0ZSkge1xuICAgICAgdGhpcy5tb2RhbHNDb21wb25lbnQub3Blbk1vZGFsKG1vZGFsVGVtcGxhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBNb2RhbCB0ZW1wbGF0ZSAke21vZGFsfSBpcyBub3QgYXZhaWxhYmxlLmApO1xuICAgIH1cbiAgfVxufSIsIjxkaXYgY2xhc3M9XCJwYWdlXCIgaWQ9XCJwYWdlSWRcIiAod2luZG93OnJlc2l6ZSk9XCJvblJlc2l6ZSgkZXZlbnQpXCI+XG4gIDxkaXYgaWQ9XCJkcmFnZ2FibGVcIiBjbGFzcz1cImJ1dHRvbkJhclwiIFtzdHlsZS5yaWdodF09XCJidXR0b25CYXJSaWdodFBvc2l0aW9uXCI+XG4gICAgPGRpdiAqbmdJZj1cImNvbnRyb2xzXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwiZC1mbGV4IGp1c3RpZnktY29udGVudC1lbmRcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImJ0bi1ncm91cFwiIHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWw9XCJDb250cm9sc1wiPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwiZHJhZ2dhYmxlSGFuZGxlXCIgY2xhc3M9XCJidG4gYnRuLWxpZ2h0XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJNb3ZlIHRvb2xiYXJcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktZ3JpcC12ZXJ0aWNhbFwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwiZGFncmVfbGF5b3V0XCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiRGFncmUgbGF5b3V0XCIgKGNsaWNrKT1cImFwcGx5TGF5b3V0KClcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktZGlhZ3JhbS0zXCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwic2F2ZV9ncmFwaFwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlNhdmUgZGF0YVwiIChjbGljayk9XCJvbkNvbmZpcm1TYXZlKClcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktc2F2ZVwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cInJlc2V0X2dyYXBoXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiUmVzZXQgZGF0YVwiIChjbGljayk9XCJyZXNldEdyYXBoKClcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktc2tpcC1iYWNrd2FyZFwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiAqbmdJZj1cInpvb21cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJab29tIGluXCIgaWQ9XCJ6b29tX2luXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLXpvb20taW5cIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgKm5nSWY9XCJ6b29tXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiWm9vbSBvdXRcIiBpZD1cInpvb21fb3V0XCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLXpvb20tb3V0XCI+PC9pPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiICpuZ0lmPVwiem9vbVwiIGNsYXNzPVwiYnRuIGJ0bi1zZWNvbmRhcnlcIiBkYXRhLXRvZ2dsZT1cInRvb2x0aXBcIiBkYXRhLXBsYWNlbWVudD1cInRvcFwiXG4gICAgICAgICAgICB0aXRsZT1cIlpvb20gcmVzZXRcIiBpZD1cInpvb21fcmVzZXRcIiBkaXNhYmxlZD1cInRydWVcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktYXJyb3ctY291bnRlcmNsb2Nrd2lzZVwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiAqbmdJZj1cInpvb21cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJab29tIHRvIGZpdFwiIGlkPVwiem9vbV90b19maXRcIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiYmkgYmktYXJyb3dzLWZ1bGxzY3JlZW5cIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgKm5nSWY9XCJ6b29tXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiU2VsZWN0IGFsbFwiIGlkPVwic2VsZWN0X2FsbFwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgKm5nSWY9XCJ6b29tXCIgY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiIGRhdGEtcGxhY2VtZW50PVwidG9wXCJcbiAgICAgICAgICAgIHRpdGxlPVwiSW52ZXJ0IHNlbGVjdGlvblwiIGlkPVwidG9nZ2xlX3NlbGVjdGlvblwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS11aS1jaGVja3MtZ3JpZFwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJUb2dnbGUgc2VhcmNoXCIgaWQ9XCJ0b2dnbGVfc2VhcmNoXCJcbiAgICAgICAgICAgIFtuZ0NsYXNzXT1cInsnc2VhcmNoQnV0dG9uQWN0aXZlJzogc2hvd1NlYXJjaCwgJ3NlYXJjaEJ1dHRvbkluYWN0aXZlJzogIXNob3dTZWFyY2h9XCJcbiAgICAgICAgICAgIChjbGljayk9XCJ0b2dnbGVTZWFyY2goKVwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1zZWFyY2hcIj48L2k+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwic2VhcmNoIGZsb2F0LXJpZ2h0IGlucHV0LWdyb3VwIG10LTMgcHItMFwiIFtoaWRkZW5dPVwiIXNob3dTZWFyY2hcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwLXByZXBlbmRcIj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cInByZXZCdXR0b25cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJQcmV2aW91c1wiIGRpc2FibGVkPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJiaSBiaS1hcnJvdy1sZWZ0LXNxdWFyZVwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cIm5leHRCdXR0b25cIiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCIgZGF0YS1wbGFjZW1lbnQ9XCJ0b3BcIlxuICAgICAgICAgICAgdGl0bGU9XCJOZXh0XCIgZGlzYWJsZWQ+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLWFycm93LXJpZ2h0LXNxdWFyZVwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwic2VhcmNoSW5wdXRcIiBjbGFzcz1cImZvcm0tY29udHJvbFwiIHBsYWNlaG9sZGVyPVwiU2VhcmNoXCIgYXJpYS1sYWJlbD1cIlNlYXJjaFwiXG4gICAgICAgICAgYXJpYS1kZXNjcmliZWRieT1cInNlYXJjaFwiIC8+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cC1hcHBlbmRcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1vdXRsaW5lLXNlY29uZGFyeVwiIHR5cGU9XCJidXR0b25cIiBpZD1cInNlYXJjaEJ1dHRvblwiIGRhdGEtdG9nZ2xlPVwidG9vbHRpcFwiXG4gICAgICAgICAgICBkYXRhLXBsYWNlbWVudD1cInRvcFwiIHRpdGxlPVwiU2VhcmNoXCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImJpIGJpLXNlYXJjaFwiPjwvaT5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJpbnB1dC1ncm91cC1hcHBlbmRcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1vdXRsaW5lLXNlY29uZGFyeVwiIHR5cGU9XCJidXR0b25cIiBpZD1cImNsZWFyQnV0dG9uXCIgZGF0YS10b2dnbGU9XCJ0b29sdGlwXCJcbiAgICAgICAgICAgIGRhdGEtcGxhY2VtZW50PVwidG9wXCIgdGl0bGU9XCJDbGVhclwiIGRpc2FibGVkPlxuICAgICAgICAgICAgY2xlYXJcbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IFtoaWRkZW5dPVwiIXNob3dTZWFyY2hcIiBpZD1cIm5vTWF0Y2hlc1RleHRcIiBjbGFzcz1cIm5vTWF0Y2hlc1RleHQgZmxvYXQtcmlnaHRcIj5ObyBtYXRjaGVzIGZvdW5kPC9kaXY+XG4gIDwvZGl2PlxuICA8IS0tIFpvb20gaW5kaWNhdG9yLS0+XG4gIDxkaXYgKm5nSWY9XCJ6b29tXCIgY2xhc3M9XCJ6b29tSW5kaWNhdG9yXCI+XG4gICAgPHNwYW4gaWQ9XCJ6b29tX2xldmVsXCI+PC9zcGFuPlxuICA8L2Rpdj5cbiAgPCEtLSBTYXZlIGNvbmZpcm1hdGlvbi0tPlxuICA8ZGl2ICpuZ0lmPVwic2hvd0NvbmZpcm1hdGlvblwiIGNsYXNzPVwiY29uZmlybWF0aW9uLW1lc3NhZ2UtY29udGFpbmVyXCI+XG4gICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LXN1Y2Nlc3MgY29uZmlybWF0aW9uLW1lc3NhZ2VcIiByb2xlPVwiYWxlcnRcIiBbbmdDbGFzc109XCJ7ICdmYWRlLW91dCc6ICFzaG93Q29uZmlybWF0aW9uIH1cIj5cbiAgICAgIFNhdmVkIDxpIGNsYXNzPVwiYmkgYmktY2hlY2stY2lyY2xlXCI+PC9pPlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cblxuICA8YXBwLWNvbnRleHQtbWVudXNcbiAgKGVkaXROb2RlQ29udGV4dE1lbnVFdmVudCk9XCJoYW5kbGVFZGl0Tm9kZXNFdmVudCgkZXZlbnQpXCJcbiAgKGZpbmRDcmVhdGVOb2Rlc0NvbnRleHRNZW51RXZlbnQpPVwiZmluZENyZWF0ZU5vZGVzRXZlbnQoJGV2ZW50KVwiXG4gIChjcmVhdGVMaW5rQ29udGV4dE1lbnVFdmVudCk9XCJvcGVuTW9kYWwoJ2NyZWF0ZUxpbmtNb2RhbCcpXCJcbiAgKGVkaXRMaW5rTGFiZWxDb250ZXh0TWVudUV2ZW50KT1cIm9uRWRpdExpbmtMYWJlbCgpXCJcbiAgKGVkaXRMaW5rc0NvbnRleHRNZW51RXZlbnQpPVwiaGFuZGxlRWRpdExpbmtzRXZlbnQoJGV2ZW50KVwiPlxuICA8L2FwcC1jb250ZXh0LW1lbnVzPlxuXG4gIDxhcHAtbW9kYWxzXG4gIFtlZGl0Tm9kZURhdGFdPVwiZWRpdE5vZGVEYXRhXCJcbiAgW2VkaXRMaW5rc0RhdGFdPVwiZWRpdExpbmtzRGF0YVwiXG4gIChjcmVhdGVMaW5rRXZlbnQpPVwib25DcmVhdGVMaW5rKCRldmVudClcIlxuICAoY3JlYXRlTm9kZUV2ZW50KT1cIm9uQ3JlYXRlTm9kZSgkZXZlbnQpXCJcbiAgKGRlbGV0ZUxpbmtFdmVudCk9XCJvbkRlbGV0ZUxpbmsoJGV2ZW50KVwiXG4gIChkZWxldGVOb2RlRXZlbnQpPVwib25EZWxldGVOb2RlKClcIj5cbiAgPC9hcHAtbW9kYWxzPlxuXG4gIDxzdmcgI3N2Z0lkIFthdHRyLndpZHRoXT1cIndpZHRoXCIgaGVpZ2h0PVwiNzgwXCIgKGNvbnRleHRtZW51KT1cInZpc3VhbGlzZXJDb250ZXh0TWVudXMoJGV2ZW50KVwiPjwvc3ZnPlxuPC9kaXY+Il19