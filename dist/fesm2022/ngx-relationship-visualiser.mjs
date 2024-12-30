import * as i0 from '@angular/core';
import { EventEmitter, Component, ViewChild, Output, Input, Injectable, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import * as i2$1 from '@angular/forms';
import { Validators, FormArray, ReactiveFormsModule, FormsModule } from '@angular/forms';
import * as i1 from 'ngx-bootstrap/modal';
import { ModalModule } from 'ngx-bootstrap/modal';
import * as i2 from '@kreash/ngx-contextmenu';
import { ContextMenuModule } from '@kreash/ngx-contextmenu';
import * as i3 from '@angular/common';
import * as i4 from '@ng-select/ng-select';
import { NgSelectModule } from '@ng-select/ng-select';
import * as d3 from 'd3';
import { Subject, ReplaySubject } from 'rxjs';
import Dexie from 'dexie';
import * as dagre from '@dagrejs/dagre';

class ContextMenusComponent {
    editNodeContextMenu;
    findCreateNodesContextMenu;
    createEditLinkContextMenu;
    editLinkLabelContextMenu;
    editNodeContextMenuEvent = new EventEmitter();
    findCreateNodesContextMenuEvent = new EventEmitter();
    createLinkContextMenuEvent = new EventEmitter();
    editLinkLabelContextMenuEvent = new EventEmitter();
    editLinksContextMenuEvent = new EventEmitter();
    currentMatchingLink = null;
    editNode() {
        this.editNodeContextMenuEvent.emit(true);
    }
    findNodes() {
        this.findCreateNodesContextMenuEvent.emit('findNodes');
    }
    createNode() {
        this.findCreateNodesContextMenuEvent.emit('createNode');
    }
    createLink() {
        this.createLinkContextMenuEvent.emit(true);
    }
    editLinkLabel() {
        this.editLinkLabelContextMenuEvent.emit(true);
    }
    editLinks() {
        const payload = {
            open: true,
            data: this.currentMatchingLink
        };
        if (this.currentMatchingLink) {
            this.editLinksContextMenuEvent.emit(payload);
        }
        else {
            console.warn("No matching link to edit.");
        }
    }
    linksExist = (item) => {
        const matchingLink = this.checkLinkBetweenSelectedNodes(item);
        if (matchingLink) {
            this.currentMatchingLink = matchingLink;
            return true;
        }
        else {
            this.currentMatchingLink = null;
            return false;
        }
    };
    linksDoNotExist = (item) => {
        const matchingLink = this.checkLinkBetweenSelectedNodes(item);
        if (!matchingLink) {
            return true;
        }
        else {
            return false;
        }
    };
    checkLinkBetweenSelectedNodes(payload) {
        if (!payload || !payload.selectedNodes) {
            console.warn("Payload or selectedNodes is undefined.");
            return null;
        }
        const selectedNodes = payload.selectedNodes;
        const links = payload.graphData.links;
        const sourceId = selectedNodes[0].id;
        const targetId = selectedNodes[1].id;
        // Check for a link in both directions (source -> target or target -> source)
        const matchingLink = links.find((link) => (link.source === sourceId && link.target === targetId) ||
            (link.source === targetId && link.target === sourceId));
        if (matchingLink) {
            return matchingLink;
        }
        else {
            return null;
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: ContextMenusComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: ContextMenusComponent, selector: "app-context-menus", outputs: { editNodeContextMenuEvent: "editNodeContextMenuEvent", findCreateNodesContextMenuEvent: "findCreateNodesContextMenuEvent", createLinkContextMenuEvent: "createLinkContextMenuEvent", editLinkLabelContextMenuEvent: "editLinkLabelContextMenuEvent", editLinksContextMenuEvent: "editLinksContextMenuEvent" }, viewQueries: [{ propertyName: "editNodeContextMenu", first: true, predicate: ["editNodeContextMenu"], descendants: true }, { propertyName: "findCreateNodesContextMenu", first: true, predicate: ["findCreateNodesContextMenu"], descendants: true }, { propertyName: "createEditLinkContextMenu", first: true, predicate: ["createEditLinkContextMenu"], descendants: true }, { propertyName: "editLinkLabelContextMenu", first: true, predicate: ["editLinkLabelContextMenu"], descendants: true }], ngImport: i0, template: "<context-menu #editNodeContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"editNode()\">\n    Edit Node...\n  </ng-template>\n</context-menu>\n\n<context-menu #findCreateNodesContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"findNodes()\">\n    Search Nodes...\n  </ng-template>\n  <ng-template contextMenuItem let-item (execute)=\"createNode()\">\n    Create Node...\n  </ng-template>\n</context-menu>\n\n<context-menu #createEditLinkContextMenu>\n  <ng-template [visible]=\"linksDoNotExist\" contextMenuItem let-item (execute)=\"createLink()\">\n    Create Link...\n  </ng-template>\n  <ng-template [visible]=\"linksExist\" (execute)=\"editLinks()\" contextMenuItem let-item>\n    Edit Links...\n  </ng-template>\n</context-menu>\n\n<context-menu #editLinkLabelContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"editLinkLabel()\">\n    Edit Link label...\n  </ng-template>\n</context-menu>", dependencies: [{ kind: "component", type: i2.ContextMenuComponent, selector: "context-menu", inputs: ["menuClass", "autoFocus", "useBootstrap4", "disabled"], outputs: ["close", "open"] }, { kind: "directive", type: i2.ContextMenuItemDirective, selector: "[contextMenuItem]", inputs: ["subMenu", "divider", "enabled", "passive", "visible"], outputs: ["execute"] }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: ContextMenusComponent, decorators: [{
            type: Component,
            args: [{ selector: 'app-context-menus', template: "<context-menu #editNodeContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"editNode()\">\n    Edit Node...\n  </ng-template>\n</context-menu>\n\n<context-menu #findCreateNodesContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"findNodes()\">\n    Search Nodes...\n  </ng-template>\n  <ng-template contextMenuItem let-item (execute)=\"createNode()\">\n    Create Node...\n  </ng-template>\n</context-menu>\n\n<context-menu #createEditLinkContextMenu>\n  <ng-template [visible]=\"linksDoNotExist\" contextMenuItem let-item (execute)=\"createLink()\">\n    Create Link...\n  </ng-template>\n  <ng-template [visible]=\"linksExist\" (execute)=\"editLinks()\" contextMenuItem let-item>\n    Edit Links...\n  </ng-template>\n</context-menu>\n\n<context-menu #editLinkLabelContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"editLinkLabel()\">\n    Edit Link label...\n  </ng-template>\n</context-menu>" }]
        }], propDecorators: { editNodeContextMenu: [{
                type: ViewChild,
                args: ['editNodeContextMenu']
            }], findCreateNodesContextMenu: [{
                type: ViewChild,
                args: ['findCreateNodesContextMenu']
            }], createEditLinkContextMenu: [{
                type: ViewChild,
                args: ['createEditLinkContextMenu']
            }], editLinkLabelContextMenu: [{
                type: ViewChild,
                args: ['editLinkLabelContextMenu']
            }], editNodeContextMenuEvent: [{
                type: Output
            }], findCreateNodesContextMenuEvent: [{
                type: Output
            }], createLinkContextMenuEvent: [{
                type: Output
            }], editLinkLabelContextMenuEvent: [{
                type: Output
            }], editLinksContextMenuEvent: [{
                type: Output
            }] } });

var fontAwesomeIcons = [
    { id: 1, name: 'Address book', icon: '\uf2b9' },
    { id: 2, name: 'Address card', icon: '\uf2bb' },
    { id: 3, name: 'Anchor', icon: '\uf13d' },
    { id: 4, name: 'Apple Whole', icon: '\uf5d1' },
    { id: 5, name: 'Atom', icon: '\uf5d2' },
    { id: 6, name: 'Award', icon: '\uf559' },
    { id: 7, name: 'Baby', icon: '\uf77c' },
    { id: 8, name: 'Bacon', icon: '\uf7e5' },
    { id: 9, name: 'Balance Scale', icon: '\uf24e' },
    { id: 10, name: 'Bank', icon: '\uf19c' },
    { id: 11, name: 'Battery Full', icon: '\uf240' },
    { id: 12, name: 'Beer', icon: '\uf0fc' },
    { id: 13, name: 'Bell', icon: '\uf0f3' },
    { id: 14, name: 'Bell slash', icon: '\uf1f6' },
    { id: 15, name: 'Bicycle', icon: '\uf206' },
    { id: 16, name: 'Binoculars', icon: '\uf1e5' },
    { id: 17, name: 'Birthday Cake', icon: '\uf1fd' },
    { id: 18, name: 'Blender', icon: '\uf517' },
    { id: 19, name: 'Bolt', icon: '\uf0e7' },
    { id: 20, name: 'Bomb', icon: '\uf1e2' },
    { id: 21, name: 'Bone', icon: '\uf5d7' },
    { id: 22, name: 'Book', icon: '\uf02d' },
    { id: 23, name: 'Bookmark', icon: '\uf02e' },
    { id: 24, name: 'Bowling Ball', icon: '\uf436' },
    { id: 25, name: 'Box', icon: '\uf466' },
    { id: 26, name: 'Brain', icon: '\uf5dc' },
    { id: 27, name: 'Bread Slice', icon: '\uf7ec' },
    { id: 28, name: 'Briefcase', icon: '\uf0b1' },
    { id: 29, name: 'Bug', icon: '\uf188' },
    { id: 30, name: 'Building', icon: '\uf1ad' },
    { id: 31, name: 'Bus', icon: '\uf207' },
    { id: 32, name: 'Calculator', icon: '\uf1ec' },
    { id: 33, name: 'Calendar', icon: '\uf133' },
    { id: 34, name: 'Calendar check', icon: '\uf274' },
    { id: 35, name: 'Calendar days', icon: '\uf073' },
    { id: 36, name: 'Calendar minus', icon: '\uf272' },
    { id: 37, name: 'Calendar plus', icon: '\uf271' },
    { id: 38, name: 'Calendar xmark', icon: '\uf273' },
    { id: 39, name: 'Camera', icon: '\uf030' },
    { id: 40, name: 'Candy Cane', icon: '\uf786' },
    { id: 41, name: 'Car', icon: '\uf1b9' },
    { id: 42, name: 'Cat', icon: '\uf6be' },
    { id: 43, name: 'Chair', icon: '\uf6c0' },
    { id: 44, name: 'Charging Station', icon: '\uf5e7' },
    { id: 45, name: 'Chart bar', icon: '\uf080' },
    { id: 46, name: 'Chess', icon: '\uf439' },
    { id: 47, name: 'Chess bishop', icon: '\uf43a' },
    { id: 48, name: 'Chess king', icon: '\uf43f' },
    { id: 49, name: 'Chess knight', icon: '\uf441' },
    { id: 50, name: 'Chess pawn', icon: '\uf443' },
    { id: 51, name: 'Chess queen', icon: '\uf445' },
    { id: 52, name: 'Chess rook', icon: '\uf447' },
    { id: 53, name: 'Church', icon: '\uf51d' },
    { id: 54, name: 'Circle', icon: '\uf111' },
    { id: 55, name: 'Circle check', icon: '\uf058' },
    { id: 56, name: 'Circle dot', icon: '\uf192' },
    { id: 57, name: 'Circle down', icon: '\uf358' },
    { id: 58, name: 'Circle left', icon: '\uf359' },
    { id: 59, name: 'Circle pause', icon: '\uf28b' },
    { id: 60, name: 'Circle play', icon: '\uf144' },
    { id: 61, name: 'Circle question', icon: '\uf059' },
    { id: 62, name: 'Circle right', icon: '\uf35a' },
    { id: 63, name: 'Circle stop', icon: '\uf28d' },
    { id: 64, name: 'Circle up', icon: '\uf35b' },
    { id: 65, name: 'Circle user', icon: '\uf2bd' },
    { id: 66, name: 'Circle xmark', icon: '\uf057' },
    { id: 67, name: 'Clipboard', icon: '\uf328' },
    { id: 68, name: 'Clock', icon: '\uf017' },
    { id: 69, name: 'Clone', icon: '\uf24d' },
    { id: 70, name: 'Closed captioning', icon: '\uf20a' },
    { id: 71, name: 'Cloud', icon: '\uf0c2' },
    { id: 72, name: 'Cloud download', icon: '\uf0ed' },
    { id: 73, name: 'Cloud upload', icon: '\uf0ee' },
    { id: 74, name: 'Comment', icon: '\uf075' },
    { id: 75, name: 'Comment dots', icon: '\uf4ad' },
    { id: 76, name: 'Comments', icon: '\uf086' },
    { id: 77, name: 'Compass', icon: '\uf14e' },
    { id: 78, name: 'Copyright', icon: '\uf1f9' },
    { id: 79, name: 'Copy', icon: '\uf0c5' },
    { id: 80, name: 'Credit card', icon: '\uf09d' },
    { id: 81, name: 'Envelope', icon: '\uf0e0' },
    { id: 82, name: 'Envelope open', icon: '\uf2b6' },
    { id: 83, name: 'Eye', icon: '\uf06e' },
    { id: 84, name: 'Eye slash', icon: '\uf070' },
    { id: 85, name: 'Face angry', icon: '\uf556' },
    { id: 86, name: 'Face dizzy', icon: '\uf567' },
    { id: 87, name: 'Face flushed', icon: '\uf579' },
    { id: 88, name: 'Face frown', icon: '\uf119' },
    { id: 89, name: 'Face frown open', icon: '\uf57a' },
    { id: 90, name: 'Face grimace', icon: '\uf57f' },
    { id: 91, name: 'Face grin', icon: '\uf580' },
    { id: 92, name: 'Face grin beam', icon: '\uf582' },
    { id: 93, name: 'Face grin beam sweat', icon: '\uf583' },
    { id: 94, name: 'Face grin hearts', icon: '\uf584' },
    { id: 95, name: 'Face grin squint', icon: '\uf585' },
    { id: 96, name: 'Face grin squint tears', icon: '\uf586' },
    { id: 97, name: 'Face grin stars', icon: '\uf587' },
    { id: 98, name: 'Face grin tongue', icon: '\uf589' },
    { id: 99, name: 'Face grin tongue squint', icon: '\uf58a' },
    { id: 100, name: 'Face grin tongue wink', icon: '\uf58b' },
    { id: 101, name: 'Face grin wide', icon: '\uf581' },
    { id: 102, name: 'Face grin wink', icon: '\uf58c' },
    { id: 103, name: 'Face kiss', icon: '\uf596' },
    { id: 104, name: 'Face kiss beam', icon: '\uf597' },
    { id: 105, name: 'Face kiss wink heart', icon: '\uf598' },
    { id: 106, name: 'Face laugh', icon: '\uf599' },
    { id: 107, name: 'Face laugh beam', icon: '\uf59a' },
    { id: 108, name: 'Face laugh squint', icon: '\uf59b' },
    { id: 109, name: 'Face laugh wink', icon: '\uf59c' },
    { id: 110, name: 'Face meh', icon: '\uf11a' },
    { id: 111, name: 'Face meh blank', icon: '\uf5a4' },
    { id: 112, name: 'Face rolling eyes', icon: '\uf5a5' },
    { id: 113, name: 'Face sad cry', icon: '\uf5b3' },
    { id: 114, name: 'Face sad tear', icon: '\uf5b4' },
    { id: 115, name: 'Face smile', icon: '\uf118' },
    { id: 116, name: 'Face smile beam', icon: '\uf5b8' },
    { id: 117, name: 'Face smile wink', icon: '\uf4da' },
    { id: 118, name: 'Face surprise', icon: '\uf5c2' },
    { id: 119, name: 'Face tired', icon: '\uf5c8' },
    { id: 120, name: 'File', icon: '\uf15b' },
    { id: 121, name: 'File audio', icon: '\uf1c7' },
    { id: 122, name: 'File code', icon: '\uf1c9' },
    { id: 123, name: 'File excel', icon: '\uf1c3' },
    { id: 124, name: 'File image', icon: '\uf1c5' },
    { id: 125, name: 'File lines', icon: '\uf15c' },
    { id: 126, name: 'File pdf', icon: '\uf1c1' },
    { id: 127, name: 'File powerpoint', icon: '\uf1c4' },
    { id: 128, name: 'File video', icon: '\uf1c8' },
    { id: 129, name: 'File word', icon: '\uf1c2' },
    { id: 130, name: 'File zipper', icon: '\uf1c6' },
    { id: 131, name: 'Flag', icon: '\uf024' },
    { id: 132, name: 'Flask', icon: '\uf0c3' },
    { id: 133, name: 'Floppy disk', icon: '\uf0c7' },
    { id: 134, name: 'Folder', icon: '\uf07b' },
    { id: 135, name: 'Folder closed', icon: '\uf07b' },
    { id: 136, name: 'Folder open', icon: '\uf07c' },
    { id: 137, name: 'Font awesome', icon: '\uf2b4' },
    { id: 138, name: 'Futbol', icon: '\uf1e3' },
    { id: 139, name: 'Gem', icon: '\uf3a5' },
    { id: 140, name: 'Hand', icon: '\uf256' },
    { id: 141, name: 'Hand back fist', icon: '\uf255' },
    { id: 142, name: 'Hand lizard', icon: '\uf258' },
    { id: 143, name: 'Hand peace', icon: '\uf25b' },
    { id: 144, name: 'Hand point down', icon: '\uf0a7' },
    { id: 145, name: 'Hand point left', icon: '\uf0a5' },
    { id: 146, name: 'Hand point right', icon: '\uf0a4' },
    { id: 147, name: 'Hand point up', icon: '\uf0a6' },
    { id: 148, name: 'Hand pointer', icon: '\uf25a' },
    { id: 149, name: 'Hand rock', icon: '\uf255' },
    { id: 150, name: 'Hand scissors', icon: '\uf257' },
    { id: 151, name: 'Handshake', icon: '\uf2b5' },
    { id: 152, name: 'Hard drive', icon: '\uf0a0' },
    { id: 153, name: 'Heart', icon: '\uf004' },
    { id: 154, name: 'Hospital', icon: '\uf0f8' },
    { id: 155, name: 'Hourglass', icon: '\uf254' },
    { id: 156, name: 'Hourglass half', icon: '\uf252' },
    { id: 157, name: 'Id badge', icon: '\uf2c1' },
    { id: 158, name: 'Id card', icon: '\uf2c2' },
    { id: 159, name: 'Image', icon: '\uf03e' },
    { id: 160, name: 'Images', icon: '\uf302' },
    { id: 161, name: 'Keyboard', icon: '\uf11c' },
    { id: 162, name: 'Lemon', icon: '\uf094' },
    { id: 163, name: 'Life ring', icon: '\uf1cd' },
    { id: 164, name: 'Lightbulb', icon: '\uf0eb' },
    { id: 165, name: 'Map', icon: '\uf279' },
    { id: 166, name: 'Message', icon: '\uf27a' },
    { id: 167, name: 'Money bill 1', icon: '\uf3d1' },
    { id: 168, name: 'Moon', icon: '\uf186' },
    { id: 169, name: 'Music', icon: '\uf001' },
    { id: 170, name: 'Newspaper', icon: '\uf1ea' },
    { id: 171, name: 'Note sticky', icon: '\uf249' },
    { id: 172, name: 'Object group', icon: '\uf247' },
    { id: 173, name: 'Object ungroup', icon: '\uf248' },
    { id: 174, name: 'Paper plane', icon: '\uf1d8' },
    { id: 175, name: 'Paste', icon: '\uf0ea' },
    { id: 176, name: 'Pen to square', icon: '\uf044' },
    { id: 177, name: 'Phone', icon: '\uf095' },
    { id: 178, name: 'Phone flip', icon: '\uf879' },
    { id: 179, name: 'Phone slash', icon: '\uf3dd' },
    { id: 180, name: 'Procedures', icon: '\uf487' },
    { id: 181, name: 'Rectangle list', icon: '\uf022' },
    { id: 182, name: 'Rectangle xmark', icon: '\uf410' },
    { id: 183, name: 'Registered', icon: '\uf25d' },
    { id: 184, name: 'Share from square', icon: '\uf14d' },
    { id: 185, name: 'Snowflake', icon: '\uf2dc' },
    { id: 186, name: 'Square', icon: '\uf0c8' },
    { id: 187, name: 'Square caret down', icon: '\uf150' },
    { id: 188, name: 'Square caret left', icon: '\uf191' },
    { id: 189, name: 'Square caret right', icon: '\uf152' },
    { id: 190, name: 'Square caret up', icon: '\uf151' },
    { id: 191, name: 'Square check', icon: '\uf14a' },
    { id: 192, name: 'Square full', icon: '\uf45c' },
    { id: 193, name: 'Square minus', icon: '\uf146' },
    { id: 194, name: 'Square plus', icon: '\uf0fe' },
    { id: 195, name: 'Star', icon: '\uf005' },
    { id: 196, name: 'Star half', icon: '\uf089' },
    { id: 197, name: 'Star half stroke', icon: '\uf5c0' },
    { id: 198, name: 'Sun', icon: '\uf185' },
    { id: 199, name: 'Thumbs down', icon: '\uf165' },
    { id: 200, name: 'Thumbs up', icon: '\uf164' },
    { id: 201, name: 'Trash can', icon: '\uf2ed' },
    { id: 202, name: 'User', icon: '\uf007' },
    { id: 203, name: 'Window maximize', icon: '\uf2d0' },
    { id: 204, name: 'Window minimize', icon: '\uf2d1' },
    { id: 205, name: 'Window restore', icon: '\uf2d2' },
    { id: 206, name: 'Yin Yang', icon: '\uf6ad' },
];

class AbstractModalFormHandler {
    fb;
    createLinkForm;
    createNodeForm;
    fontAwesomeIcons = fontAwesomeIcons;
    constructor(fb) {
        this.fb = fb;
        this.createLinkForm = this.fb.group({
            lineStyle: ['Dotted', Validators.required],
            sourceArrow: [false],
            targetArrow: [false],
            label: this.fb.array([], Validators.required),
        });
        this.createNodeForm = this.fb.group({
            id: '',
            label: this.fb.array([], [Validators.required, this.minLengthArray(1)]),
            imageUrl: [''],
            icon: [''],
            fx: [null],
            fy: [null],
            additionalIcon: [''],
            iconType: ['select'],
        }, { validators: this.iconOrImageValidator });
    }
    get labelArray() {
        return this.createLinkForm.get('label');
    }
    get nodeLabelArray() {
        return this.createNodeForm.get('label');
    }
    addLabel() {
        const labelGroup = this.fb.group({
            label: ['', Validators.required],
            linkIcon: [false],
        });
        this.labelArray.push(labelGroup);
    }
    addNodeLabel() {
        const labelGroup = this.fb.group({
            label: ['', Validators.required],
        });
        this.nodeLabelArray.push(labelGroup);
    }
    removeLabel(index) {
        if (this.labelArray.length > 1) {
            this.labelArray.removeAt(index);
        }
    }
    removeNodeLabel(index) {
        if (this.nodeLabelArray.length > 1) {
            this.nodeLabelArray.removeAt(index);
        }
    }
    resetLinksForm() {
        this.createLinkForm.reset({
            lineStyle: 'Dotted',
            sourceArrow: false,
            targetArrow: false,
            label: this.fb.array([]),
        });
        this.labelArray.clear();
    }
    resetNodeForm() {
        this.createNodeForm.reset({
            label: this.fb.array([]),
            imageUrl: '',
            icon: '',
            additionalIcon: '',
            iconType: 'select',
        });
        this.nodeLabelArray.clear();
    }
    populateEditLinkForm(data) {
        this.createLinkForm.patchValue({
            lineStyle: data.lineStyle,
            sourceArrow: data.sourceArrow,
            targetArrow: data.targetArrow
        });
        if (data.relationships && Array.isArray(data.relationships)) {
            data.relationships.forEach((relationship) => {
                const labelGroup = this.fb.group({
                    labelIndex: [relationship.labelIndex, Validators.required],
                    label: [relationship.label, Validators.required],
                    linkIcon: [relationship.linkIcon]
                });
                this.labelArray.push(labelGroup);
            });
        }
    }
    populateEditNodeForm(data) {
        this.createNodeForm.patchValue({
            id: data.id,
            imageUrl: data.imageUrl,
            icon: data.icon,
            fx: data.fx,
            fy: data.fy,
            additionalIcon: data.additionalIcon,
            iconType: data.imageUrl ? 'url' : 'select'
        });
        this.createNodeForm.setControl('label', this.fb.array(data.label.map(label => this.fb.group({ label: [label, Validators.required] }))));
    }
    iconOrImageValidator(control) {
        const imageUrl = control.get('imageUrl').value;
        const icon = control.get('icon').value;
        if ((imageUrl && icon) || (!imageUrl && !icon)) {
            return { 'iconOrImage': true };
        }
        return null;
    }
    minLengthArray(min) {
        return (control) => {
            if (control instanceof FormArray) {
                return control.length >= min ? null : { minLengthArray: true };
            }
            return null;
        };
    }
}

class ModalsComponent extends AbstractModalFormHandler {
    modalService;
    editNodeData;
    editLinksData;
    closeModalEvent = new EventEmitter();
    createLinkEvent = new EventEmitter();
    createNodeEvent = new EventEmitter();
    deleteLinkEvent = new EventEmitter();
    deleteNodeEvent = new EventEmitter();
    editNodeModal;
    createNodeModal;
    createLinkModal;
    editLinksModal;
    modalRef;
    defaultModalConfig = { class: 'modal-xl' };
    fontAwesomeIcons = fontAwesomeIcons;
    // virtual scroll
    loading = false;
    iconsBuffer = [];
    numberOfItemsFromEndBeforeFetchingMore = 10;
    bufferSize = 50;
    constructor(modalService, fb) {
        super(fb);
        this.modalService = modalService;
    }
    ngOnChanges(changes) {
        if (changes.editLinksData && this.editLinksData) {
            this.resetLinksForm();
            this.populateEditLinkForm(this.editLinksData);
        }
        if (changes.editNodeData && this.editNodeData) {
            this.resetNodeForm();
            this.populateEditNodeForm(this.editNodeData);
        }
    }
    openModal(template) {
        if (!template) {
            console.error('Template is required to open a modal.');
            return null;
        }
        if (template === this.editLinksModal && this.editLinksData) {
            this.populateEditLinkForm(this.editLinksData);
        }
        this.resetLinksForm();
        this.resetNodeForm();
        this.modalRef = this.modalService.show(template, this.defaultModalConfig);
    }
    closeModal(modalRef) {
        if (this[modalRef]) {
            this[modalRef].hide();
        }
    }
    createLink() {
        if (this.createLinkForm.valid) {
            const createLinkData = this.createLinkForm.value;
            this.createLinkEvent.emit(createLinkData);
            this.resetLinksForm();
            this.closeModal('modalRef');
        }
    }
    createNode() {
        if (this.createNodeForm.valid) {
            const createNodeData = this.createNodeForm.value;
            const payload = {
                id: createNodeData.id,
                label: createNodeData.label.map((item) => item.label),
                imageUrl: createNodeData.imageUrl,
                icon: createNodeData.icon,
                fx: createNodeData.fx,
                fy: createNodeData.fy,
                additionalIcon: createNodeData.additionalIcon,
            };
            this.createNodeEvent.emit(payload);
            this.resetNodeForm();
            this.closeModal('modalRef');
        }
    }
    deleteNode() {
        this.deleteNodeEvent.emit(true);
        this.resetNodeForm();
        this.closeModal('modalRef');
    }
    deleteLink() {
        const linkId = this.editLinksData.linkId;
        this.deleteLinkEvent.emit(linkId);
        this.resetLinksForm();
        this.closeModal('modalRef');
    }
    clearImageUrl() {
        this.createNodeForm.get('imageUrl').setValue('');
    }
    trackByFn(item) {
        return item.id;
    }
    onScrollToEnd() {
        this.fetchMore();
    }
    onScroll({ end }) {
        if (this.loading || this.fontAwesomeIcons.length <= this.iconsBuffer.length) {
            return;
        }
        if (end + this.numberOfItemsFromEndBeforeFetchingMore >=
            this.iconsBuffer.length) {
            this.fetchMore();
        }
    }
    fetchMore() {
        const len = this.iconsBuffer.length;
        const more = this.fontAwesomeIcons.slice(len, this.bufferSize + len);
        this.loading = true;
        this.loading = false;
        this.iconsBuffer = this.iconsBuffer.concat(more);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: ModalsComponent, deps: [{ token: i1.BsModalService }, { token: i2$1.FormBuilder }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: ModalsComponent, selector: "app-modals", inputs: { editNodeData: "editNodeData", editLinksData: "editLinksData" }, outputs: { closeModalEvent: "closeModalEvent", createLinkEvent: "createLinkEvent", createNodeEvent: "createNodeEvent", deleteLinkEvent: "deleteLinkEvent", deleteNodeEvent: "deleteNodeEvent" }, viewQueries: [{ propertyName: "editNodeModal", first: true, predicate: ["editNodeModal"], descendants: true }, { propertyName: "createNodeModal", first: true, predicate: ["createNodeModal"], descendants: true }, { propertyName: "createLinkModal", first: true, predicate: ["createLinkModal"], descendants: true }, { propertyName: "editLinksModal", first: true, predicate: ["editLinksModal"], descendants: true }], usesInheritance: true, usesOnChanges: true, ngImport: i0, template: "<!--EDIT NODE MODAL-->\n<ng-template #editNodeModal>\n  <div class=\"modal-header\">\n    <h4 class=\"modal-title pull-left\">Edit Node</h4>\n    <button type=\"button\" class=\"btn-close close pull-right\" aria-label=\"Close\" (click)=\"closeModal('modalRef')\">\n      <span aria-hidden=\"true\" class=\"visually-hidden\">&times;</span>\n    </button>\n  </div>\n  <div class=\"modal-body\">\n    <form [formGroup]=\"createNodeForm\">\n      <div class=\"form-group\">\n        <label for=\"iconType\">Icon Type</label>\n        <div>\n          <input type=\"radio\" id=\"imageUrl\" formControlName=\"iconType\" value=\"url\"> Image URL\n          <input class=\"ml-5\" type=\"radio\" id=\"iconTypeSelect\" formControlName=\"iconType\" value=\"select\"> Choose Icon\n        </div>\n      </div>\n      <div class=\"form-group\" *ngIf=\"createNodeForm.get('iconType').value === 'url'\">\n        <label for=\"imageUrl\">Image URL</label>\n        <div class=\"input-group\">\n          <input type=\"text\" id=\"imageUrl\" formControlName=\"imageUrl\" class=\"form-control\" placeholder=\"Image URL\">\n          <button type=\"button\" class=\"btn btn-outline-secondary\" (click)=\"clearImageUrl()\">Clear</button>\n        </div>\n      </div>\n      <div class=\"form-group\" *ngIf=\"createNodeForm.get('iconType').value === 'select'\">\n        <label for=\"nodeIcon\">Choose Icon</label>\n        <ng-select\n        formControlName=\"icon\"\n        [items]=\"iconsBuffer\"\n        [virtualScroll]=\"true\"\n        [loading]=\"loading\"\n        bindLabel=\"name\"\n        bindValue=\"icon\"\n        [editableSearchTerm]=\"true\"\n        placeholder=\"Select icon\"\n        appendTo=\"body\"\n        [trackByFn]=\"trackByFn\"\n        (scroll)=\"onScroll($event)\"\n        (scrollToEnd)=\"onScrollToEnd()\"\n      >\n        <ng-template ng-header-tmp>\n          <small class=\"form-text text-muted\"\n            >Loaded {{ iconsBuffer.length }} of {{ fontAwesomeIcons.length }}</small\n          >\n        </ng-template>\n        <ng-template ng-option-tmp let-item=\"item\">\n          <i class=\"fa fa-light\">{{item.icon}}</i>\n          <span class=\"ml-3\">{{ item.name }}</span>\n        </ng-template>\n      </ng-select>\n      </div>\n      <div *ngIf=\"createNodeForm.errors?.iconOrImage\" class=\"text-danger\">\n        Please provide either an Image URL or choose an Icon, but not both.\n      </div>\n      <div class=\"form-group\">\n        <label for=\"label\">Labels</label>\n        <div formArrayName=\"label\">\n          <div *ngFor=\"let label of nodeLabelArray.controls; let i = index\" [formGroupName]=\"i\"\n            class=\"d-flex flex-column align-items-start\">\n            <div class=\"d-flex align-items-center w-100\">\n              <input formControlName=\"label\" class=\"form-control mb-2\" placeholder=\"Label\" [id]=\"'node-label-' + i\">\n              <button type=\"button\" class=\"btn btn-danger ml-2\" (click)=\"removeNodeLabel(i)\" [disabled]=\"nodeLabelArray.length <= 1\">Remove</button>\n            </div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"btn btn-secondary mt-2\" (click)=\"addNodeLabel()\">Add Label</button>\n      </div>\n      <div class=\"form-group\">\n        <label for=\"nodeAdditionalIcon\">Additional icon</label>\n        <ng-select\n        formControlName=\"additionalIcon\"\n        [items]=\"iconsBuffer\"\n        [virtualScroll]=\"true\"\n        [loading]=\"loading\"\n        bindLabel=\"name\"\n        bindValue=\"icon\"\n        [editableSearchTerm]=\"true\"\n        placeholder=\"Select icon\"\n        appendTo=\"body\"\n        [trackByFn]=\"trackByFn\"\n        (scroll)=\"onScroll($event)\"\n        (scrollToEnd)=\"onScrollToEnd()\"\n      >\n        <ng-template ng-header-tmp>\n          <small class=\"form-text text-muted\"\n            >Loaded {{ iconsBuffer.length }} of {{ fontAwesomeIcons.length }}</small\n          >\n        </ng-template>\n        <ng-template ng-option-tmp let-item=\"item\">\n          <i class=\"fa fa-light\">{{item.icon}}</i>\n          <span class=\"ml-3\">{{ item.name }}</span>\n        </ng-template>\n      </ng-select>\n      </div>\n    </form>\n  </div>\n  <div class=\"modal-footer\">\n    <button type=\"button\" class=\"btn btn-secondary\" (click)=\"closeModal('modalRef')\">Cancel</button>\n    <button type=\"button\" class=\"btn btn-primary\" (click)=\"createNode()\" [disabled]=\"!createNodeForm.valid\">Save Changes</button>\n    <button type=\"button\" class=\"btn btn-danger\" (click)=\"deleteNode()\">Delete Node</button>\n  </div>\n</ng-template>\n<!-- ./MODAL-->\n\n<!--CREATE NODE MODAL-->\n<ng-template #createNodeModal>\n  <div class=\"modal-header\">\n    <h4 class=\"modal-title pull-left\">Create Node</h4>\n    <button type=\"button\" class=\"btn-close close pull-right\" aria-label=\"Close\" (click)=\"closeModal('modalRef')\">\n      <span aria-hidden=\"true\" class=\"visually-hidden\">&times;</span>\n    </button>\n  </div>\n  <div class=\"modal-body\">\n    <form [formGroup]=\"createNodeForm\">\n      <div class=\"form-group\">\n        <label for=\"iconType\">Icon Type</label>\n        <div>\n          <input type=\"radio\" id=\"imageUrl\" formControlName=\"iconType\" value=\"url\"> Image URL\n          <input class=\"ml-5\" type=\"radio\" id=\"iconTypeSelect\" formControlName=\"iconType\" value=\"select\"> Choose Icon\n        </div>\n      </div>\n      <div class=\"form-group\" *ngIf=\"createNodeForm.get('iconType').value === 'url'\">\n        <label for=\"imageUrl\">Image URL</label>\n        <div class=\"input-group\">\n          <input type=\"text\" id=\"imageUrl\" formControlName=\"imageUrl\" class=\"form-control\" placeholder=\"Image URL\">\n          <button type=\"button\" class=\"btn btn-outline-secondary\" (click)=\"clearImageUrl()\">Clear</button>\n        </div>\n      </div>\n      <div class=\"form-group\" *ngIf=\"createNodeForm.get('iconType').value === 'select'\">\n        <label for=\"nodeIcon\">Choose Icon</label>\n        <ng-select\n        formControlName=\"icon\"\n        [items]=\"iconsBuffer\"\n        [virtualScroll]=\"true\"\n        [loading]=\"loading\"\n        bindLabel=\"name\"\n        bindValue=\"icon\"\n        [editableSearchTerm]=\"true\"\n        placeholder=\"Select icon\"\n        appendTo=\"body\"\n        [trackByFn]=\"trackByFn\"\n        (scroll)=\"onScroll($event)\"\n        (scrollToEnd)=\"onScrollToEnd()\"\n      >\n        <ng-template ng-header-tmp>\n          <small class=\"form-text text-muted\"\n            >Loaded {{ iconsBuffer.length }} of {{ fontAwesomeIcons.length }}</small\n          >\n        </ng-template>\n        <ng-template ng-option-tmp let-item=\"item\">\n          <i class=\"fa fa-light\">{{item.icon}}</i>\n          <span class=\"ml-3\">{{ item.name }}</span>\n        </ng-template>\n      </ng-select>\n      </div>\n      <div *ngIf=\"createNodeForm.errors?.iconOrImage\" class=\"text-danger\">\n        Please provide either an Image URL or choose an Icon, but not both.\n      </div>\n      <div class=\"form-group\">\n        <label for=\"label\">Labels</label>\n        <div formArrayName=\"label\">\n          <div *ngFor=\"let label of nodeLabelArray.controls; let i = index\" [formGroupName]=\"i\"\n            class=\"d-flex flex-column align-items-start\">\n            <div class=\"d-flex align-items-center w-100\">\n              <input formControlName=\"label\" class=\"form-control mb-2\" placeholder=\"Label\" [id]=\"'node-label-' + i\">\n              <button type=\"button\" class=\"btn btn-danger ml-2\" (click)=\"removeNodeLabel(i)\" [disabled]=\"nodeLabelArray.length <= 1\">Remove</button>\n            </div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"btn btn-secondary mt-2\" (click)=\"addNodeLabel()\">Add Label</button>\n      </div>\n      <div class=\"form-group\">\n        <label for=\"nodeAdditionalIcon\">Additional icon</label>\n        <ng-select\n        formControlName=\"additionalIcon\"\n        [items]=\"iconsBuffer\"\n        [virtualScroll]=\"true\"\n        [loading]=\"loading\"\n        bindLabel=\"name\"\n        bindValue=\"icon\"\n        [editableSearchTerm]=\"true\"\n        placeholder=\"Select icon\"\n        appendTo=\"body\"\n        [trackByFn]=\"trackByFn\"\n        (scroll)=\"onScroll($event)\"\n        (scrollToEnd)=\"onScrollToEnd()\"\n      >\n        <ng-template ng-header-tmp>\n          <small class=\"form-text text-muted\"\n            >Loaded {{ iconsBuffer.length }} of {{ fontAwesomeIcons.length }}</small\n          >\n        </ng-template>\n        <ng-template ng-option-tmp let-item=\"item\">\n          <i class=\"fa fa-light\">{{item.icon}}</i>\n          <span class=\"ml-3\">{{ item.name }}</span>\n        </ng-template>\n      </ng-select>\n      </div>\n    </form>\n  </div>\n  <div class=\"modal-footer\">\n    <button type=\"button\" class=\"btn btn-secondary\" (click)=\"closeModal('modalRef')\">Cancel</button>\n    <button type=\"button\" class=\"btn btn-primary\" (click)=\"createNode()\" [disabled]=\"!createNodeForm.valid\">Create Node</button>\n  </div>\n</ng-template>\n<!-- ./MODAL-->\n\n<!--EDIT LINKS MODAL-->\n<ng-template #editLinksModal>\n  <div class=\"modal-header\">\n    <h4 class=\"modal-title pull-left\">Edit Links</h4>\n    <button type=\"button\" class=\"btn-close close pull-right\" aria-label=\"Close\" (click)=\"closeModal('modalRef')\">\n      <span aria-hidden=\"true\" class=\"visually-hidden\">&times;</span>\n    </button>\n  </div>\n  <div class=\"modal-body\">\n    <form [formGroup]=\"createLinkForm\">\n      <div class=\"form-group\">\n        <label for=\"lineStyle\">Line Style</label>\n        <select id=\"lineStyle\" formControlName=\"lineStyle\" class=\"form-control\">\n          <option value=\"Solid\">Solid</option>\n          <option value=\"Dotted\">Dotted</option>\n        </select>\n      </div>\n      <div class=\"form-group form-check\">\n        <input type=\"checkbox\" id=\"sourceArrow\" formControlName=\"sourceArrow\" class=\"form-check-input\">\n        <label for=\"sourceArrow\">Source Arrow</label>\n      </div>\n      <div class=\"form-group form-check\">\n        <input type=\"checkbox\" id=\"targetArrow\" formControlName=\"targetArrow\" class=\"form-check-input\">\n        <label for=\"targetArrow\">Target Arrow</label>\n      </div>\n\n      <div class=\"form-group\">\n        <label for=\"label\">Labels</label>\n        <div formArrayName=\"label\">\n          <div *ngFor=\"let label of labelArray.controls; let i = index\" [formGroupName]=\"i\"\n            class=\"d-flex flex-column align-items-start\">\n            <div class=\"d-flex align-items-center w-100\">\n              <input formControlName=\"label\" class=\"form-control\" placeholder=\"Label\" [id]=\"'label-' + i\">\n              <button type=\"button\" class=\"btn btn-danger ml-2\" (click)=\"removeLabel(i)\" [disabled]=\"labelArray.length <= 1\">Remove</button>\n            </div>\n            <div class=\"form-group form-check\">\n              <input type=\"checkbox\" formControlName=\"linkIcon\" class=\"form-check-input\" [id]=\"'linkIcon-' + i\">\n              <label [for]=\"'linkIcon-' + i\">Link Icon?</label>\n            </div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"btn btn-secondary mt-2\" (click)=\"addLabel()\">Add Label</button>\n      </div>\n    </form>\n  </div>\n  <div class=\"modal-footer\">\n    <button type=\"button\" class=\"btn btn-secondary\" (click)=\"closeModal('modalRef')\">Cancel</button>\n    <button type=\"button\" class=\"btn btn-primary\" (click)=\"createLink()\" [disabled]=\"!createLinkForm.valid\">Save Changes</button>\n    <button type=\"button\" class=\"btn btn-danger\" (click)=\"deleteLink()\">Delete Link</button>\n  </div>\n</ng-template>\n<!-- ./MODAL-->\n\n\n<!--CREATE LINK MODAL-->\n<ng-template #createLinkModal>\n  <div class=\"modal-header\">\n    <h4 class=\"modal-title pull-left\">Create Link</h4>\n    <button type=\"button\" class=\"btn-close close pull-right\" aria-label=\"Close\" (click)=\"closeModal('modalRef')\">\n      <span aria-hidden=\"true\" class=\"visually-hidden\">&times;</span>\n    </button>\n  </div>\n  <div class=\"modal-body\">\n    <form [formGroup]=\"createLinkForm\">\n      <div class=\"form-group\">\n        <label for=\"lineStyle\">Line Style</label>\n        <select id=\"lineStyle\" formControlName=\"lineStyle\" class=\"form-control\">\n          <option value=\"Solid\">Solid</option>\n          <option value=\"Dotted\">Dotted</option>\n        </select>\n      </div>\n      <div class=\"form-group form-check\">\n        <input type=\"checkbox\" id=\"sourceArrow\" formControlName=\"sourceArrow\" class=\"form-check-input\">\n        <label for=\"sourceArrow\">Source Arrow</label>\n      </div>\n      <div class=\"form-group form-check\">\n        <input type=\"checkbox\" id=\"targetArrow\" formControlName=\"targetArrow\" class=\"form-check-input\">\n        <label for=\"targetArrow\">Target Arrow</label>\n      </div>\n\n      <div class=\"form-group\">\n        <label for=\"label\">Labels</label>\n        <div formArrayName=\"label\">\n          <div *ngFor=\"let label of labelArray.controls; let i = index\" [formGroupName]=\"i\"\n            class=\"d-flex flex-column align-items-start\">\n            <div class=\"d-flex align-items-center w-100\">\n              <input formControlName=\"label\" class=\"form-control\" placeholder=\"Label\" [id]=\"'label-' + i\">\n              <button type=\"button\" class=\"btn btn-danger ml-2\" (click)=\"removeLabel(i)\" [disabled]=\"labelArray.length <= 1\">Remove</button>\n            </div>\n            <div class=\"form-group form-check\">\n              <input type=\"checkbox\" formControlName=\"linkIcon\" class=\"form-check-input\" [id]=\"'linkIcon-' + i\">\n              <label [for]=\"'linkIcon-' + i\">Link Icon?</label>\n            </div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"btn btn-secondary mt-2\" (click)=\"addLabel()\">Add Label</button>\n      </div>\n    </form>\n  </div>\n  <div class=\"modal-footer\">\n    <button type=\"button\" class=\"btn btn-secondary\" (click)=\"closeModal('modalRef')\">Cancel</button>\n    <button type=\"button\" class=\"btn btn-primary\" (click)=\"createLink()\" [disabled]=\"!createLinkForm.valid\">Create Link</button>\n  </div>\n</ng-template>\n<!-- ./MODAL-->", dependencies: [{ kind: "directive", type: i3.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: i3.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i2$1.ɵNgNoValidate, selector: "form:not([ngNoForm]):not([ngNativeValidate])" }, { kind: "directive", type: i2$1.NgSelectOption, selector: "option", inputs: ["ngValue", "value"] }, { kind: "directive", type: i2$1.ɵNgSelectMultipleOption, selector: "option", inputs: ["ngValue", "value"] }, { kind: "directive", type: i2$1.DefaultValueAccessor, selector: "input:not([type=checkbox])[formControlName],textarea[formControlName],input:not([type=checkbox])[formControl],textarea[formControl],input:not([type=checkbox])[ngModel],textarea[ngModel],[ngDefaultControl]" }, { kind: "directive", type: i2$1.CheckboxControlValueAccessor, selector: "input[type=checkbox][formControlName],input[type=checkbox][formControl],input[type=checkbox][ngModel]" }, { kind: "directive", type: i2$1.SelectControlValueAccessor, selector: "select:not([multiple])[formControlName],select:not([multiple])[formControl],select:not([multiple])[ngModel]", inputs: ["compareWith"] }, { kind: "directive", type: i2$1.RadioControlValueAccessor, selector: "input[type=radio][formControlName],input[type=radio][formControl],input[type=radio][ngModel]", inputs: ["name", "formControlName", "value"] }, { kind: "directive", type: i2$1.NgControlStatus, selector: "[formControlName],[ngModel],[formControl]" }, { kind: "directive", type: i2$1.NgControlStatusGroup, selector: "[formGroupName],[formArrayName],[ngModelGroup],[formGroup],form:not([ngNoForm]),[ngForm]" }, { kind: "directive", type: i2$1.FormGroupDirective, selector: "[formGroup]", inputs: ["formGroup"], outputs: ["ngSubmit"], exportAs: ["ngForm"] }, { kind: "directive", type: i2$1.FormControlName, selector: "[formControlName]", inputs: ["formControlName", "disabled", "ngModel"], outputs: ["ngModelChange"] }, { kind: "directive", type: i2$1.FormGroupName, selector: "[formGroupName]", inputs: ["formGroupName"] }, { kind: "directive", type: i2$1.FormArrayName, selector: "[formArrayName]", inputs: ["formArrayName"] }, { kind: "component", type: i4.NgSelectComponent, selector: "ng-select", inputs: ["ariaLabelDropdown", "bindLabel", "bindValue", "ariaLabel", "markFirst", "placeholder", "fixedPlaceholder", "notFoundText", "typeToSearchText", "preventToggleOnRightClick", "addTagText", "loadingText", "clearAllText", "appearance", "dropdownPosition", "appendTo", "loading", "closeOnSelect", "hideSelected", "selectOnTab", "openOnEnter", "maxSelectedItems", "groupBy", "groupValue", "bufferAmount", "virtualScroll", "selectableGroup", "selectableGroupAsModel", "searchFn", "trackByFn", "clearOnBackspace", "labelForId", "inputAttrs", "tabIndex", "readonly", "searchWhileComposing", "minTermLength", "editableSearchTerm", "ngClass", "typeahead", "multiple", "addTag", "searchable", "clearable", "isOpen", "items", "compareWith", "clearSearchOnAdd", "deselectOnClick", "keyDownFn"], outputs: ["blur", "focus", "change", "open", "close", "search", "clear", "add", "remove", "scroll", "scrollToEnd"] }, { kind: "directive", type: i4.NgOptionTemplateDirective, selector: "[ng-option-tmp]" }, { kind: "directive", type: i4.NgHeaderTemplateDirective, selector: "[ng-header-tmp]" }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: ModalsComponent, decorators: [{
            type: Component,
            args: [{ selector: 'app-modals', template: "<!--EDIT NODE MODAL-->\n<ng-template #editNodeModal>\n  <div class=\"modal-header\">\n    <h4 class=\"modal-title pull-left\">Edit Node</h4>\n    <button type=\"button\" class=\"btn-close close pull-right\" aria-label=\"Close\" (click)=\"closeModal('modalRef')\">\n      <span aria-hidden=\"true\" class=\"visually-hidden\">&times;</span>\n    </button>\n  </div>\n  <div class=\"modal-body\">\n    <form [formGroup]=\"createNodeForm\">\n      <div class=\"form-group\">\n        <label for=\"iconType\">Icon Type</label>\n        <div>\n          <input type=\"radio\" id=\"imageUrl\" formControlName=\"iconType\" value=\"url\"> Image URL\n          <input class=\"ml-5\" type=\"radio\" id=\"iconTypeSelect\" formControlName=\"iconType\" value=\"select\"> Choose Icon\n        </div>\n      </div>\n      <div class=\"form-group\" *ngIf=\"createNodeForm.get('iconType').value === 'url'\">\n        <label for=\"imageUrl\">Image URL</label>\n        <div class=\"input-group\">\n          <input type=\"text\" id=\"imageUrl\" formControlName=\"imageUrl\" class=\"form-control\" placeholder=\"Image URL\">\n          <button type=\"button\" class=\"btn btn-outline-secondary\" (click)=\"clearImageUrl()\">Clear</button>\n        </div>\n      </div>\n      <div class=\"form-group\" *ngIf=\"createNodeForm.get('iconType').value === 'select'\">\n        <label for=\"nodeIcon\">Choose Icon</label>\n        <ng-select\n        formControlName=\"icon\"\n        [items]=\"iconsBuffer\"\n        [virtualScroll]=\"true\"\n        [loading]=\"loading\"\n        bindLabel=\"name\"\n        bindValue=\"icon\"\n        [editableSearchTerm]=\"true\"\n        placeholder=\"Select icon\"\n        appendTo=\"body\"\n        [trackByFn]=\"trackByFn\"\n        (scroll)=\"onScroll($event)\"\n        (scrollToEnd)=\"onScrollToEnd()\"\n      >\n        <ng-template ng-header-tmp>\n          <small class=\"form-text text-muted\"\n            >Loaded {{ iconsBuffer.length }} of {{ fontAwesomeIcons.length }}</small\n          >\n        </ng-template>\n        <ng-template ng-option-tmp let-item=\"item\">\n          <i class=\"fa fa-light\">{{item.icon}}</i>\n          <span class=\"ml-3\">{{ item.name }}</span>\n        </ng-template>\n      </ng-select>\n      </div>\n      <div *ngIf=\"createNodeForm.errors?.iconOrImage\" class=\"text-danger\">\n        Please provide either an Image URL or choose an Icon, but not both.\n      </div>\n      <div class=\"form-group\">\n        <label for=\"label\">Labels</label>\n        <div formArrayName=\"label\">\n          <div *ngFor=\"let label of nodeLabelArray.controls; let i = index\" [formGroupName]=\"i\"\n            class=\"d-flex flex-column align-items-start\">\n            <div class=\"d-flex align-items-center w-100\">\n              <input formControlName=\"label\" class=\"form-control mb-2\" placeholder=\"Label\" [id]=\"'node-label-' + i\">\n              <button type=\"button\" class=\"btn btn-danger ml-2\" (click)=\"removeNodeLabel(i)\" [disabled]=\"nodeLabelArray.length <= 1\">Remove</button>\n            </div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"btn btn-secondary mt-2\" (click)=\"addNodeLabel()\">Add Label</button>\n      </div>\n      <div class=\"form-group\">\n        <label for=\"nodeAdditionalIcon\">Additional icon</label>\n        <ng-select\n        formControlName=\"additionalIcon\"\n        [items]=\"iconsBuffer\"\n        [virtualScroll]=\"true\"\n        [loading]=\"loading\"\n        bindLabel=\"name\"\n        bindValue=\"icon\"\n        [editableSearchTerm]=\"true\"\n        placeholder=\"Select icon\"\n        appendTo=\"body\"\n        [trackByFn]=\"trackByFn\"\n        (scroll)=\"onScroll($event)\"\n        (scrollToEnd)=\"onScrollToEnd()\"\n      >\n        <ng-template ng-header-tmp>\n          <small class=\"form-text text-muted\"\n            >Loaded {{ iconsBuffer.length }} of {{ fontAwesomeIcons.length }}</small\n          >\n        </ng-template>\n        <ng-template ng-option-tmp let-item=\"item\">\n          <i class=\"fa fa-light\">{{item.icon}}</i>\n          <span class=\"ml-3\">{{ item.name }}</span>\n        </ng-template>\n      </ng-select>\n      </div>\n    </form>\n  </div>\n  <div class=\"modal-footer\">\n    <button type=\"button\" class=\"btn btn-secondary\" (click)=\"closeModal('modalRef')\">Cancel</button>\n    <button type=\"button\" class=\"btn btn-primary\" (click)=\"createNode()\" [disabled]=\"!createNodeForm.valid\">Save Changes</button>\n    <button type=\"button\" class=\"btn btn-danger\" (click)=\"deleteNode()\">Delete Node</button>\n  </div>\n</ng-template>\n<!-- ./MODAL-->\n\n<!--CREATE NODE MODAL-->\n<ng-template #createNodeModal>\n  <div class=\"modal-header\">\n    <h4 class=\"modal-title pull-left\">Create Node</h4>\n    <button type=\"button\" class=\"btn-close close pull-right\" aria-label=\"Close\" (click)=\"closeModal('modalRef')\">\n      <span aria-hidden=\"true\" class=\"visually-hidden\">&times;</span>\n    </button>\n  </div>\n  <div class=\"modal-body\">\n    <form [formGroup]=\"createNodeForm\">\n      <div class=\"form-group\">\n        <label for=\"iconType\">Icon Type</label>\n        <div>\n          <input type=\"radio\" id=\"imageUrl\" formControlName=\"iconType\" value=\"url\"> Image URL\n          <input class=\"ml-5\" type=\"radio\" id=\"iconTypeSelect\" formControlName=\"iconType\" value=\"select\"> Choose Icon\n        </div>\n      </div>\n      <div class=\"form-group\" *ngIf=\"createNodeForm.get('iconType').value === 'url'\">\n        <label for=\"imageUrl\">Image URL</label>\n        <div class=\"input-group\">\n          <input type=\"text\" id=\"imageUrl\" formControlName=\"imageUrl\" class=\"form-control\" placeholder=\"Image URL\">\n          <button type=\"button\" class=\"btn btn-outline-secondary\" (click)=\"clearImageUrl()\">Clear</button>\n        </div>\n      </div>\n      <div class=\"form-group\" *ngIf=\"createNodeForm.get('iconType').value === 'select'\">\n        <label for=\"nodeIcon\">Choose Icon</label>\n        <ng-select\n        formControlName=\"icon\"\n        [items]=\"iconsBuffer\"\n        [virtualScroll]=\"true\"\n        [loading]=\"loading\"\n        bindLabel=\"name\"\n        bindValue=\"icon\"\n        [editableSearchTerm]=\"true\"\n        placeholder=\"Select icon\"\n        appendTo=\"body\"\n        [trackByFn]=\"trackByFn\"\n        (scroll)=\"onScroll($event)\"\n        (scrollToEnd)=\"onScrollToEnd()\"\n      >\n        <ng-template ng-header-tmp>\n          <small class=\"form-text text-muted\"\n            >Loaded {{ iconsBuffer.length }} of {{ fontAwesomeIcons.length }}</small\n          >\n        </ng-template>\n        <ng-template ng-option-tmp let-item=\"item\">\n          <i class=\"fa fa-light\">{{item.icon}}</i>\n          <span class=\"ml-3\">{{ item.name }}</span>\n        </ng-template>\n      </ng-select>\n      </div>\n      <div *ngIf=\"createNodeForm.errors?.iconOrImage\" class=\"text-danger\">\n        Please provide either an Image URL or choose an Icon, but not both.\n      </div>\n      <div class=\"form-group\">\n        <label for=\"label\">Labels</label>\n        <div formArrayName=\"label\">\n          <div *ngFor=\"let label of nodeLabelArray.controls; let i = index\" [formGroupName]=\"i\"\n            class=\"d-flex flex-column align-items-start\">\n            <div class=\"d-flex align-items-center w-100\">\n              <input formControlName=\"label\" class=\"form-control mb-2\" placeholder=\"Label\" [id]=\"'node-label-' + i\">\n              <button type=\"button\" class=\"btn btn-danger ml-2\" (click)=\"removeNodeLabel(i)\" [disabled]=\"nodeLabelArray.length <= 1\">Remove</button>\n            </div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"btn btn-secondary mt-2\" (click)=\"addNodeLabel()\">Add Label</button>\n      </div>\n      <div class=\"form-group\">\n        <label for=\"nodeAdditionalIcon\">Additional icon</label>\n        <ng-select\n        formControlName=\"additionalIcon\"\n        [items]=\"iconsBuffer\"\n        [virtualScroll]=\"true\"\n        [loading]=\"loading\"\n        bindLabel=\"name\"\n        bindValue=\"icon\"\n        [editableSearchTerm]=\"true\"\n        placeholder=\"Select icon\"\n        appendTo=\"body\"\n        [trackByFn]=\"trackByFn\"\n        (scroll)=\"onScroll($event)\"\n        (scrollToEnd)=\"onScrollToEnd()\"\n      >\n        <ng-template ng-header-tmp>\n          <small class=\"form-text text-muted\"\n            >Loaded {{ iconsBuffer.length }} of {{ fontAwesomeIcons.length }}</small\n          >\n        </ng-template>\n        <ng-template ng-option-tmp let-item=\"item\">\n          <i class=\"fa fa-light\">{{item.icon}}</i>\n          <span class=\"ml-3\">{{ item.name }}</span>\n        </ng-template>\n      </ng-select>\n      </div>\n    </form>\n  </div>\n  <div class=\"modal-footer\">\n    <button type=\"button\" class=\"btn btn-secondary\" (click)=\"closeModal('modalRef')\">Cancel</button>\n    <button type=\"button\" class=\"btn btn-primary\" (click)=\"createNode()\" [disabled]=\"!createNodeForm.valid\">Create Node</button>\n  </div>\n</ng-template>\n<!-- ./MODAL-->\n\n<!--EDIT LINKS MODAL-->\n<ng-template #editLinksModal>\n  <div class=\"modal-header\">\n    <h4 class=\"modal-title pull-left\">Edit Links</h4>\n    <button type=\"button\" class=\"btn-close close pull-right\" aria-label=\"Close\" (click)=\"closeModal('modalRef')\">\n      <span aria-hidden=\"true\" class=\"visually-hidden\">&times;</span>\n    </button>\n  </div>\n  <div class=\"modal-body\">\n    <form [formGroup]=\"createLinkForm\">\n      <div class=\"form-group\">\n        <label for=\"lineStyle\">Line Style</label>\n        <select id=\"lineStyle\" formControlName=\"lineStyle\" class=\"form-control\">\n          <option value=\"Solid\">Solid</option>\n          <option value=\"Dotted\">Dotted</option>\n        </select>\n      </div>\n      <div class=\"form-group form-check\">\n        <input type=\"checkbox\" id=\"sourceArrow\" formControlName=\"sourceArrow\" class=\"form-check-input\">\n        <label for=\"sourceArrow\">Source Arrow</label>\n      </div>\n      <div class=\"form-group form-check\">\n        <input type=\"checkbox\" id=\"targetArrow\" formControlName=\"targetArrow\" class=\"form-check-input\">\n        <label for=\"targetArrow\">Target Arrow</label>\n      </div>\n\n      <div class=\"form-group\">\n        <label for=\"label\">Labels</label>\n        <div formArrayName=\"label\">\n          <div *ngFor=\"let label of labelArray.controls; let i = index\" [formGroupName]=\"i\"\n            class=\"d-flex flex-column align-items-start\">\n            <div class=\"d-flex align-items-center w-100\">\n              <input formControlName=\"label\" class=\"form-control\" placeholder=\"Label\" [id]=\"'label-' + i\">\n              <button type=\"button\" class=\"btn btn-danger ml-2\" (click)=\"removeLabel(i)\" [disabled]=\"labelArray.length <= 1\">Remove</button>\n            </div>\n            <div class=\"form-group form-check\">\n              <input type=\"checkbox\" formControlName=\"linkIcon\" class=\"form-check-input\" [id]=\"'linkIcon-' + i\">\n              <label [for]=\"'linkIcon-' + i\">Link Icon?</label>\n            </div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"btn btn-secondary mt-2\" (click)=\"addLabel()\">Add Label</button>\n      </div>\n    </form>\n  </div>\n  <div class=\"modal-footer\">\n    <button type=\"button\" class=\"btn btn-secondary\" (click)=\"closeModal('modalRef')\">Cancel</button>\n    <button type=\"button\" class=\"btn btn-primary\" (click)=\"createLink()\" [disabled]=\"!createLinkForm.valid\">Save Changes</button>\n    <button type=\"button\" class=\"btn btn-danger\" (click)=\"deleteLink()\">Delete Link</button>\n  </div>\n</ng-template>\n<!-- ./MODAL-->\n\n\n<!--CREATE LINK MODAL-->\n<ng-template #createLinkModal>\n  <div class=\"modal-header\">\n    <h4 class=\"modal-title pull-left\">Create Link</h4>\n    <button type=\"button\" class=\"btn-close close pull-right\" aria-label=\"Close\" (click)=\"closeModal('modalRef')\">\n      <span aria-hidden=\"true\" class=\"visually-hidden\">&times;</span>\n    </button>\n  </div>\n  <div class=\"modal-body\">\n    <form [formGroup]=\"createLinkForm\">\n      <div class=\"form-group\">\n        <label for=\"lineStyle\">Line Style</label>\n        <select id=\"lineStyle\" formControlName=\"lineStyle\" class=\"form-control\">\n          <option value=\"Solid\">Solid</option>\n          <option value=\"Dotted\">Dotted</option>\n        </select>\n      </div>\n      <div class=\"form-group form-check\">\n        <input type=\"checkbox\" id=\"sourceArrow\" formControlName=\"sourceArrow\" class=\"form-check-input\">\n        <label for=\"sourceArrow\">Source Arrow</label>\n      </div>\n      <div class=\"form-group form-check\">\n        <input type=\"checkbox\" id=\"targetArrow\" formControlName=\"targetArrow\" class=\"form-check-input\">\n        <label for=\"targetArrow\">Target Arrow</label>\n      </div>\n\n      <div class=\"form-group\">\n        <label for=\"label\">Labels</label>\n        <div formArrayName=\"label\">\n          <div *ngFor=\"let label of labelArray.controls; let i = index\" [formGroupName]=\"i\"\n            class=\"d-flex flex-column align-items-start\">\n            <div class=\"d-flex align-items-center w-100\">\n              <input formControlName=\"label\" class=\"form-control\" placeholder=\"Label\" [id]=\"'label-' + i\">\n              <button type=\"button\" class=\"btn btn-danger ml-2\" (click)=\"removeLabel(i)\" [disabled]=\"labelArray.length <= 1\">Remove</button>\n            </div>\n            <div class=\"form-group form-check\">\n              <input type=\"checkbox\" formControlName=\"linkIcon\" class=\"form-check-input\" [id]=\"'linkIcon-' + i\">\n              <label [for]=\"'linkIcon-' + i\">Link Icon?</label>\n            </div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"btn btn-secondary mt-2\" (click)=\"addLabel()\">Add Label</button>\n      </div>\n    </form>\n  </div>\n  <div class=\"modal-footer\">\n    <button type=\"button\" class=\"btn btn-secondary\" (click)=\"closeModal('modalRef')\">Cancel</button>\n    <button type=\"button\" class=\"btn btn-primary\" (click)=\"createLink()\" [disabled]=\"!createLinkForm.valid\">Create Link</button>\n  </div>\n</ng-template>\n<!-- ./MODAL-->" }]
        }], ctorParameters: () => [{ type: i1.BsModalService }, { type: i2$1.FormBuilder }], propDecorators: { editNodeData: [{
                type: Input
            }], editLinksData: [{
                type: Input
            }], closeModalEvent: [{
                type: Output
            }], createLinkEvent: [{
                type: Output
            }], createNodeEvent: [{
                type: Output
            }], deleteLinkEvent: [{
                type: Output
            }], deleteNodeEvent: [{
                type: Output
            }], editNodeModal: [{
                type: ViewChild,
                args: ['editNodeModal']
            }], createNodeModal: [{
                type: ViewChild,
                args: ['createNodeModal']
            }], createLinkModal: [{
                type: ViewChild,
                args: ['createLinkModal']
            }], editLinksModal: [{
                type: ViewChild,
                args: ['editLinksModal']
            }] } });

class DexieService extends Dexie {
    graphData;
    constructor() {
        super('GraphDatabase');
        this.version(1).stores({
            graphData: 'dataId'
        });
        this.graphData = this.table('graphData');
    }
    async saveGraphData(data) {
        await this.graphData.put(data);
    }
    async getGraphData(dataId) {
        return await this.graphData.get(dataId);
    }
    async deleteGraphData(dataId) {
        await this.graphData.delete(dataId);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DexieService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DexieService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DexieService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [] });

class VisualiserGraphService {
    dexieService;
    constructor(dexieService) {
        this.dexieService = dexieService;
    }
    links = [];
    nodes = [];
    gBrush = null;
    brushMode = false;
    brushing = false;
    shiftKey;
    extent = null;
    zoom = false;
    zoomToFit = false;
    resetSearch;
    /** RxJS subject to listen for updates of the selection */
    selectedNodesArray = new Subject();
    dblClickNodePayload = new Subject();
    dblClickLinkPayload = new Subject();
    selectedLinkArray = new Subject();
    saveGraphData = new ReplaySubject();
    update(data, element, zoom, zoomToFit) {
        const svg = d3.select(element);
        this.zoom = zoom;
        this.zoomToFit = zoomToFit;
        return this._update(d3, svg, data);
    }
    ticked(link, node, edgepaths) {
        link.each(function (d, i, n) {
            // Total difference in x and y from source to target
            let diffX = d.target.x - d.source.x;
            let diffY = d.target.y - d.source.y;
            // Length of path from center of source node to center of target node
            let pathLength = Math.sqrt(diffX * diffX + diffY * diffY);
            // x and y distances from center to outside edge of target node
            let offsetX = (diffX * 40) / pathLength;
            let offsetY = (diffY * 40) / pathLength;
            d3.select(n[i])
                .attr('x1', d.source.x + offsetX)
                .attr('y1', d.source.y + offsetY)
                .attr('x2', d.target.x - offsetX)
                .attr('y2', d.target.y - offsetY);
        });
        node.attr('transform', function (d) {
            return `translate(${d.x}, ${d.y + 50})`;
        });
        // Sets a boundry for the nodes
        // node.attr('cx', function (d) {
        //   return (d.x = Math.max(40, Math.min(900 - 15, d.x)));
        // });
        // node.attr('cy', function (d) {
        //   return (d.y = Math.max(50, Math.min(600 - 40, d.y)));
        // });
        edgepaths.attr('d', function (d) {
            return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`;
        });
        edgepaths.attr('transform', function (d) {
            if (d.target.x < d.source.x) {
                const bbox = this.getBBox();
                const rx = bbox.x + bbox.width / 2;
                const ry = bbox.y + bbox.height / 2;
                return `rotate(180 ${rx} ${ry})`;
            }
            else {
                return 'rotate(0)';
            }
        });
    }
    initDefinitions(svg) {
        const defs = svg.append('defs');
        function createMarker(id, refX, path) {
            defs
                .append('marker')
                .attr('id', id)
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', refX)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', path)
                .attr('fill', '#b4b4b4')
                .style('stroke', 'none');
        }
        createMarker('arrowheadTarget', 0, 'M 0,-5 L 10 ,0 L 0,5');
        createMarker('arrowheadSource', 2, 'M 10 -5 L 0 0 L 10 5');
        return svg;
    }
    forceSimulation(_d3, { width, height }) {
        return _d3
            .forceSimulation()
            .velocityDecay(0.1)
            .force('link', _d3
            .forceLink()
            .id(function (d) {
            return d.id;
        })
            .distance(500)
            .strength(1))
            .force('charge', _d3.forceManyBody().strength(0.1))
            .force('center', _d3.forceCenter(width / 2, height / 2))
            .force('collision', _d3.forceCollide().radius(15));
    }
    compareAndMarkNodesNew(nodes, old_nodes) {
        // Create a map of ids to node objects for the old_nodes array
        const oldMap = old_nodes.reduce((map, node) => {
            map[node.id] = node;
            return map;
        }, {});
        // Check each node in the nodes array to see if it's new or not
        nodes.forEach((node) => {
            if (!oldMap[node.id]) {
                // Node is new, mark it with the newItem property
                node.newItem = true;
                // Remove the dagre coordinates from new nodes so we can set a random one in view
                node.fx = null;
                node.fy = null;
            }
        });
        return nodes;
    }
    removeNewItem(nodes) {
        for (const node of nodes) {
            if (node.hasOwnProperty('newItem')) {
                delete node.newItem;
            }
        }
        return nodes;
    }
    randomiseNodePositions(nodeData, width, height) {
        let minDistance = 100;
        const availableSpace = width * height;
        let adjustedRequiredSpace = nodeData.length * minDistance * minDistance;
        if (adjustedRequiredSpace > availableSpace) {
            while (adjustedRequiredSpace > availableSpace && minDistance > 0) {
                minDistance -= 10;
                adjustedRequiredSpace = nodeData.length * minDistance * minDistance;
            }
            if (adjustedRequiredSpace > availableSpace) {
                throw new Error('Not enough space to accommodate all nodes without a fixed position.');
            }
        }
        nodeData.forEach((node) => {
            if (node.fx === null && node.fy === null) {
                let currentMinDistance = minDistance;
                let canPlaceNode = false;
                while (!canPlaceNode && currentMinDistance > 0) {
                    node.fx = crypto.getRandomValues(new Uint32Array(1))[0] % width;
                    node.fy = crypto.getRandomValues(new Uint32Array(1))[0] % height;
                    canPlaceNode = !nodeData.some((otherNode) => {
                        if (otherNode.fx === null ||
                            otherNode.fy === null ||
                            otherNode === node) {
                            return false;
                        }
                        const dx = otherNode.fx - node.fx;
                        const dy = otherNode.fy - node.fy;
                        return Math.sqrt(dx * dx + dy * dy) < currentMinDistance;
                    });
                    if (!canPlaceNode) {
                        currentMinDistance--;
                    }
                }
                if (!canPlaceNode) {
                    throw new Error('Not enough space to accommodate all nodes without a fixed position.');
                }
            }
        });
        return nodeData;
    }
    async _update(_d3, svg, data) {
        const { nodes, links } = data;
        this.nodes = nodes || [];
        this.links = links || [];
        // Disable the reset btn
        let resetBtn = document.getElementById('reset_graph');
        let saveBtn = document.getElementById('save_graph');
        if (resetBtn) {
            resetBtn.setAttribute('disabled', 'true');
            saveBtn.setAttribute('disabled', 'true');
        }
        // Width/Height of canvas
        const parentWidth = _d3.select('svg').node().parentNode.clientWidth;
        const parentHeight = _d3.select('svg').node().parentNode.clientHeight;
        // Check to see if nodes are in Dexie
        const oldData = await this.dexieService.getGraphData('nodes');
        const oldNodes = oldData ? oldData.nodes : [];
        if (Array.isArray(oldNodes)) {
            // Compare and set property for new nodes
            this.nodes = this.compareAndMarkNodesNew(nodes, oldNodes);
            // Remove old nodes from Dexie
            await this.dexieService.deleteGraphData('nodes');
            // Add new nodes to Dexie
            await this.dexieService.saveGraphData({ dataId: 'nodes', nodes: data.nodes, links: data.links });
        }
        else {
            // Add first set of nodes to Dexie
            await this.dexieService.saveGraphData({ dataId: 'nodes', nodes: data.nodes, links: data.links });
        }
        // If nodes don't have a fx/fy coordinate we generate a random one - dagre nodes without links and new nodes added to canvas have null coordinates by design
        this.nodes = this.randomiseNodePositions(this.nodes, parentWidth, parentHeight);
        // Getting parents lineStyle and adding it to child objects
        const relationshipsArray = this.links.map(({ lineStyle, targetArrow, sourceArrow, relationships }) => relationships.map((r) => ({
            parentLineStyle: lineStyle,
            parentSourceArrow: sourceArrow,
            parentTargetArrow: targetArrow,
            ...r,
        })));
        // Adding dy value based on link number and position in parent
        relationshipsArray.map((linkRelationship) => {
            linkRelationship.map((linkObject, i) => {
                // dy increments of 15px
                linkObject['dy'] = 20 + i * 15;
            });
        });
        // IE11 does not like .flat
        this.links = relationshipsArray.reduce((acc, val) => acc.concat(val), []);
        d3.select('svg').append('g');
        // Zoom Start
        const zoomContainer = _d3.select('svg g');
        let currentZoom = d3.zoomTransform(d3.select('svg').node());
        const updateZoomLevel = () => {
            const currentScale = currentZoom.k;
            const maxScale = zoom.scaleExtent()[1];
            const zoomPercentage = ((currentScale - 0.5) / (maxScale - 0.5)) * 200;
            const zoomLevelDisplay = document.getElementById('zoom_level');
            const zoomLevelText = `Zoom: ${zoomPercentage.toFixed(0)}%`;
            const zoomInBtn = document.getElementById('zoom_in');
            const zoomOutBtn = document.getElementById('zoom_out');
            const zoomResetBtn = document.getElementById('zoom_reset');
            // It might not exist depending on the this.zoom boolean
            if (zoomResetBtn) {
                zoomResetBtn.setAttribute('disabled', 'true');
            }
            // Check if the zoom level has changed before updating the display / allows for panning without showing the zoom percentage
            if (zoomLevelDisplay && zoomLevelDisplay.innerHTML !== zoomLevelText) {
                zoomLevelDisplay.innerHTML = zoomLevelText;
                zoomLevelDisplay.style.opacity = '1';
                setTimeout(() => {
                    if (zoomLevelDisplay) {
                        zoomLevelDisplay.style.opacity = '0';
                    }
                }, 2000);
            }
            // Disable the zoomInBtn if the zoom level is at 200%
            if (zoomInBtn) {
                if (zoomPercentage === 200) {
                    zoomInBtn.setAttribute('disabled', 'true');
                }
                else {
                    zoomInBtn.removeAttribute('disabled');
                }
            }
            // Disable the zoomOutBtn if the zoom level is at 0%
            if (zoomOutBtn) {
                if (zoomPercentage === 0) {
                    zoomOutBtn.setAttribute('disabled', 'true');
                }
                else {
                    zoomOutBtn.removeAttribute('disabled');
                }
            }
            // Disable the zoomResetBtn if the zoom level is at 100%
            if (zoomResetBtn) {
                if (zoomPercentage === 100) {
                    zoomResetBtn.setAttribute('disabled', 'true');
                }
                else {
                    zoomResetBtn.removeAttribute('disabled');
                }
            }
        };
        let zoomedInit;
        const zoomed = () => {
            const transform = d3.event.transform;
            zoomContainer.attr('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
            currentZoom = transform;
            zoomedInit = true;
            updateZoomLevel();
        };
        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 1.5])
            .on('start', function () {
            d3.select(this).style('cursor', this.zoom ? null : 'grabbing');
        })
            .on('zoom', this.zoom ? zoomed : null)
            .on('end', function () {
            d3.select(this).style('cursor', 'grab');
        });
        svg
            .call(zoom)
            .style('cursor', 'grab')
            .on(this.zoom ? null : 'wheel.zoom', null)
            .on('dblclick.zoom', null);
        zoom.filter(() => !d3.event.shiftKey);
        // Zoom button controls
        d3.select('#zoom_in').on('click', function () {
            zoom.scaleBy(svg.transition().duration(750), 1.2);
            updateZoomLevel();
        });
        d3.select('#zoom_out').on('click', function () {
            zoom.scaleBy(svg.transition().duration(750), 0.8);
            updateZoomLevel();
        });
        d3.select('#zoom_reset').on('click', function () {
            zoom.scaleTo(svg.transition().duration(750), 1);
            updateZoomLevel();
        });
        // Zoom to fit function and Button
        const handleZoomToFit = () => {
            const nodeBBox = zoomContainer.node().getBBox();
            // Calculate scale and translate values to fit all nodes
            const padding = 30;
            const scaleX = (parentWidth - padding * 2) / nodeBBox.width;
            const scaleY = (parentHeight - padding * 2) / nodeBBox.height;
            const scale = Math.min(scaleX, scaleY, 1.0); // Restrict scale to a maximum of 1.0
            const translateX = -nodeBBox.x * scale + (parentWidth - nodeBBox.width * scale) / 2;
            const translateY = -nodeBBox.y * scale + (parentHeight - nodeBBox.height * scale) / 2;
            // Get the bounding box of all nodes
            const allNodes = zoomContainer.selectAll('.node-wrapper');
            const allNodesBBox = allNodes.nodes().reduce((acc, node) => {
                const nodeBBox = node.getBBox();
                acc.x = Math.min(acc.x, nodeBBox.x);
                acc.y = Math.min(acc.y, nodeBBox.y);
                acc.width = Math.max(acc.width, nodeBBox.x + nodeBBox.width);
                acc.height = Math.max(acc.height, nodeBBox.y + nodeBBox.height);
                return acc;
            }, { x: Infinity, y: Infinity, width: -Infinity, height: -Infinity });
            // Check if all nodes are within the viewable container
            if (allNodesBBox.x * scale >= 0 &&
                allNodesBBox.y * scale >= 0 &&
                allNodesBBox.width * scale <= parentWidth &&
                allNodesBBox.height * scale <= parentHeight) {
                // All nodes are within the viewable container, no need to apply zoom transform
                return;
            }
            // Manually reset the zoom transform
            zoomContainer
                .transition()
                .duration(750)
                .attr('transform', 'translate(0, 0) scale(1)');
            // Apply zoom transform to zoomContainer
            zoomContainer
                .transition()
                .duration(750)
                .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
            // Update the currentZoom variable with the new transform
            // zoomedInit - created because if zoomToFit is called before anything else it screws up the base transform - e.g. showCurrentMatch
            if (zoomedInit) {
                currentZoom.x = translateX;
                currentZoom.y = translateY;
                currentZoom.k = scale;
            }
            updateZoomLevel();
        };
        d3.select('#zoom_to_fit').on('click', handleZoomToFit);
        // Check if zoom level is at 0% or 100% before allowing mousewheel zoom - this stabilises the canvas when the limit is reached
        svg.on('wheel', () => {
            const currentScale = currentZoom.k;
            const maxScale = zoom.scaleExtent()[1];
            const minScale = zoom.scaleExtent()[0];
            if (currentScale === maxScale || currentScale === minScale) {
                d3.event.preventDefault();
            }
        });
        // Zoom End
        // Selection buttons
        const selectAllNodes = document.getElementById('select_all');
        const handleSelectAllNodes = () => {
            const totalSize = nodeEnter.size();
            const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
            const count = nonSelectedNodes.size();
            const notSelectedSize = totalSize - count;
            if (notSelectedSize !== totalSize) {
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                    selectAllNodes.style.opacity = '0.65';
                }
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = true);
                });
                d3.selectAll('.nodeText')
                    .style('fill', (d) => (d.selected ? 'blue' : '#999'))
                    .style('font-weight', (d) => (d.selected ? 700 : 400));
            }
            else {
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                    selectAllNodes.style.opacity = '1';
                }
                _d3.selectAll('.node-wrapper').classed('selected', false);
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    return (p.selected = p.previouslySelected = false);
                });
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 400)
                    .style('fill', '#212529');
            }
            // reset link style
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
        };
        d3.select('#select_all').on('click', handleSelectAllNodes);
        const handleToggleSelection = () => {
            const totalSize = nodeEnter.size();
            const selectedNodes = d3.selectAll('.node-wrapper.selected');
            const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
            const selectedCount = selectedNodes.size();
            const nonSelectedCount = nonSelectedNodes.size();
            if (selectedCount > 0) {
                // Deselect selected nodes and select non-selected nodes
                selectedNodes.classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = false);
                });
                nonSelectedNodes.classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = true);
                });
                // If there are only two nodes selected we need to update the subject selectedNodesArray so we can create a new link with the correct nodes attached.
                const selectedSize = svg.selectAll('.selected').size();
                if (selectedSize <= 2) {
                    // get data from node
                    const localselectedNodesArray = _d3.selectAll('.selected').data();
                    const filterId = localselectedNodesArray.filter((x) => x);
                    self.selectedNodesArray.next(filterId);
                }
                // Update styles of node elements
                _d3
                    .selectAll('.nodeText')
                    .style('fill', (d) => (d.selected ? 'blue' : '#212529'))
                    .style('font-weight', (d) => (d.selected ? 700 : 400));
            }
            else if (nonSelectedCount > 0) {
                // Select all nodes if none are selected
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = true);
                });
                // Update styles of node elements
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 700)
                    .style('fill', 'blue');
            }
            // Update the state of another button based on the current selection
            const updatedSelectedCount = selectedCount > 0 ? totalSize - selectedCount : totalSize;
            if (updatedSelectedCount === totalSize) {
                // Update the state of another button if all nodes are selected
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                    selectAllNodes.style.opacity = '0.65';
                }
            }
            else {
                // Update the state of another button if not all nodes are selected
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                    selectAllNodes.style.opacity = '1';
                }
            }
            // reset link style
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
        };
        d3.select('#toggle_selection').on('click', handleToggleSelection);
        // search
        const searchBtn = document.getElementById('searchButton');
        // Check to see if exists - control bool
        if (searchBtn) {
            const searchInput = document.getElementById('searchInput');
            const clearButton = document.getElementById('clearButton');
            const handleSearch = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    performSearch();
                }
            };
            let matchingNodes = [];
            let currentMatchIndex = -1;
            const showCurrentMatch = () => {
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                const matchingNode = matchingNodes[currentMatchIndex];
                // Highlight the matching node
                const nodeWrapper = d3.selectAll('.node-wrapper').filter(function () {
                    return d3.select(this).attr('id') === matchingNode.id;
                });
                // Add a new background circle to the entire <g> node
                const bbox = nodeWrapper.node().getBBox();
                const centerX = bbox.x + bbox.width / 2;
                const centerY = bbox.y + bbox.height / 2;
                const radius = Math.max(bbox.width + 30, bbox.height) / 2;
                const backgroundCircle = nodeWrapper
                    .insert('circle', ':first-child')
                    .attr('class', 'highlight-background')
                    .attr('fill', 'yellow')
                    .attr('opacity', '0.3')
                    .attr('cx', centerX)
                    .attr('cy', centerY);
                // Animate the background circle
                backgroundCircle
                    .transition()
                    .duration(1000)
                    .attr('r', radius)
                    .transition()
                    .duration(1000)
                    .attr('r', radius / 4)
                    .attr('opacity', '0.5')
                    .transition()
                    .duration(1000)
                    .attr('r', radius)
                    .attr('opacity', '0.3');
                // Zoom to the matching node
                const zoomTransform = d3.zoomTransform(svg.node());
                const { x, y, k } = zoomTransform;
                const { fx, fy } = matchingNode;
                const newZoomTransform = d3.zoomIdentity
                    .translate(-fx * k + parentWidth / 2, -fy * k + parentHeight / 2)
                    .scale(k);
                zoomContainer
                    .transition()
                    .duration(750)
                    .call(zoom.transform, newZoomTransform);
                // Disable/Enable navigation buttons
                const prevButton = document.getElementById('prevButton');
                const nextButton = document.getElementById('nextButton');
                prevButton.disabled = currentMatchIndex === 0;
                nextButton.disabled = currentMatchIndex === matchingNodes.length - 1;
            };
            const performSearch = () => {
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                const searchTerm = searchInput.value.toLowerCase().trim();
                if (searchTerm.length >= 3) {
                    // Perform the search
                    matchingNodes = this.nodes.filter((node) => {
                        const label = node.label.map((item) => item.toLowerCase());
                        return (label.some((labelItem) => labelItem.includes(searchTerm)) ||
                            node.label.some((obj) => Object.values(obj).some((value) => String(value).toLowerCase().includes(searchTerm))));
                    });
                    if (matchingNodes.length > 0) {
                        currentMatchIndex = 0;
                        showCurrentMatch();
                    }
                    else {
                        currentMatchIndex = -1;
                        showNoMatches();
                    }
                }
                else {
                    // Clear search
                    matchingNodes = [];
                    currentMatchIndex = -1;
                    showNoMatches();
                }
                updateClearButton();
            };
            const showNoMatches = () => {
                // Reset zoom level
                const newZoomTransform = d3.zoomIdentity.translate(0, 0).scale(1);
                zoomContainer
                    .transition()
                    .duration(750)
                    .call(zoom.transform, newZoomTransform);
                updateZoomLevel();
                // Disable navigation buttons
                const prevButton = document.getElementById('prevButton');
                const nextButton = document.getElementById('nextButton');
                prevButton.disabled = true;
                nextButton.disabled = true;
                // Show "no matches found" text with fade-in transition
                const noMatchesText = document.getElementById('noMatchesText');
                if (searchInput.value !== '') {
                    noMatchesText.classList.add('show');
                    // Fade away after a few seconds
                    setTimeout(() => {
                        // Hide "no matches found" text with fade-out transition
                        noMatchesText.classList.remove('show');
                    }, 3000);
                }
            };
            const navigateNext = () => {
                if (currentMatchIndex < matchingNodes.length - 1) {
                    currentMatchIndex++;
                    showCurrentMatch();
                }
            };
            const navigatePrevious = () => {
                if (currentMatchIndex > 0) {
                    currentMatchIndex--;
                    showCurrentMatch();
                }
            };
            const clearSearchInput = () => {
                searchInput.value = '';
                searchInput.focus();
                updateClearButton();
                matchingNodes = [];
                currentMatchIndex = -1;
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                // Disable the nextButton & prevButton
                const nextButton = document.getElementById('nextButton');
                nextButton.disabled = true;
                const prevButton = document.getElementById('prevButton');
                prevButton.disabled = true;
            };
            const updateClearButton = () => {
                clearButton.disabled = searchInput.value.trim().length === 0;
            };
            // We reset the search when we reset the data
            if (this.resetSearch) {
                clearSearchInput();
                this.resetSearch = false;
            }
            searchInput.addEventListener('input', updateClearButton);
            searchBtn.addEventListener('click', performSearch);
            clearButton.addEventListener('click', clearSearchInput);
            document
                .getElementById('searchInput')
                .addEventListener('keydown', handleSearch);
            document
                .getElementById('nextButton')
                .addEventListener('click', navigateNext);
            document
                .getElementById('prevButton')
                .addEventListener('click', navigatePrevious);
        }
        // For arrows
        this.initDefinitions(svg);
        const simulation = this.forceSimulation(_d3, {
            width: +svg.attr('width'),
            height: +svg.attr('height'),
        });
        // Brush Start
        let gBrushHolder = svg.append('g');
        let brush = d3
            .brush()
            .on('start', () => {
            this.brushing = true;
            nodeEnter.each((d) => {
                d.previouslySelected = this.shiftKey && d.selected;
            });
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
        })
            .on('brush', () => {
            this.extent = d3.event.selection;
            if (!d3.event.sourceEvent || !this.extent || !this.brushMode)
                return;
            if (!currentZoom)
                return;
            nodeEnter
                .classed('selected', (d) => {
                return (d.selected =
                    d.previouslySelected ^
                        ((d3.event.selection[0][0] <=
                            d.x * currentZoom.k + currentZoom.x &&
                            d.x * currentZoom.k + currentZoom.x <
                                d3.event.selection[1][0] &&
                            d3.event.selection[0][1] <=
                                d.y * currentZoom.k + currentZoom.y &&
                            d.y * currentZoom.k + currentZoom.y <
                                d3.event.selection[1][1])));
            })
                .select('.nodeText')
                .classed('selected', (d) => d.selected)
                .style('fill', (d) => (d.selected ? 'blue' : '#999'))
                .style('font-weight', (d) => (d.selected ? 700 : 400));
            this.extent = d3.event.selection;
        })
            .on('end', () => {
            if (!d3.event.sourceEvent || !this.extent || !this.gBrush)
                return;
            this.gBrush.call(brush.move, null);
            if (!this.brushMode) {
                // the shift key has been release before we ended our brushing
                this.gBrush.remove();
                this.gBrush = null;
            }
            this.brushing = false;
            nodeEnter
                .select('.nodeText')
                .filter(function () {
                return !d3.select(this.parentNode).classed('selected');
            })
                .style('fill', '#212529')
                .style('font-weight', 400);
            const totalSize = nodeEnter.size();
            const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
            const count = nonSelectedNodes.size();
            const notSelectedSize = totalSize - count;
            if (notSelectedSize === totalSize) {
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                    selectAllNodes.style.opacity = '0.65';
                }
            }
            else {
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                    selectAllNodes.style.opacity = '1';
                }
            }
            // counts number of selected classes to not exceed 2
            const selectedSize = nodeEnter.selectAll('.selected').size();
            if (selectedSize <= 2) {
                // get data from node
                const localselectedNodesArray = nodeEnter
                    .selectAll('.selected')
                    .data();
                const filterId = localselectedNodesArray.filter((x) => x);
                self.selectedNodesArray.next(filterId);
                return filterId;
            }
            else {
                self.selectedNodesArray.next([]);
            }
        });
        let keyup = () => {
            this.shiftKey = false;
            this.brushMode = false;
            if (this.gBrush && !this.brushing) {
                // only remove the brush if we're not actively brushing
                // otherwise it'll be removed when the brushing ends
                this.gBrush.remove();
                this.gBrush = null;
            }
        };
        let keydown = () => {
            // Allows us to turn off default listeners for keyModifiers(shift)
            brush.filter(() => d3.event.shiftKey);
            brush.keyModifiers(false);
            // holding shift key
            if (d3.event.keyCode === 16) {
                this.shiftKey = true;
                if (!this.gBrush) {
                    this.brushMode = true;
                    this.gBrush = gBrushHolder.append('g').attr('class', 'brush');
                    this.gBrush.call(brush);
                }
            }
        };
        d3.select('body').on('keydown', keydown).on('keyup', keyup);
        // Brush End
        const filteredLine = this.links.filter(({ source, target }, index, linksArray) => {
            // Filter out any objects that have matching source and target property values
            // To display only one line (parentLineStyle) - removes html bloat and a darkened line
            return (index ===
                linksArray.findIndex((obj) => obj.source === source && obj.target === target));
        });
        const link = zoomContainer.selectAll().data(filteredLine, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('line').data(link).exit().remove();
        const linkEnter = link
            .join('line')
            .style('stroke', function (d) {
            if (d.parentLineStyle === 'Solid') {
                return '#777';
            }
            else {
                return '#b4b4b4';
            }
        })
            .style('stroke-opacity', '.6')
            .style('stroke-dasharray', function (d) {
            if (d.parentLineStyle === 'Dotted') {
                return '8,5';
            }
            return null;
        })
            .style('stroke-width', '2px')
            .attr('class', 'link')
            .attr('id', function (d) {
            const suffix = '_line';
            const source = d.source ? d.source : '';
            const target = d.target ? d.target : '';
            return `${source}_${target}${suffix}`;
        })
            .attr('marker-end', function (d) {
            if (d.parentTargetArrow === true) {
                return 'url(#arrowheadTarget)';
            }
            return null;
        })
            .attr('marker-start', function (d) {
            if (d.parentSourceArrow === true) {
                return 'url(#arrowheadSource)';
            }
            return null;
        });
        link.append('title').text(function (d) {
            return d.label;
        });
        const edgepaths = zoomContainer.selectAll().data(this.links, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('path').data(edgepaths).exit().remove();
        const edgepathsEnter = edgepaths
            .join('svg:path')
            .attr('class', 'edgepath')
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .attr('id', function (d, i) {
            return 'edgepath' + i;
        });
        const edgelabels = zoomContainer.selectAll().data(this.links, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('text').data(edgelabels).exit().remove();
        const edgelabelsEnter = edgelabels
            .enter()
            .append('text')
            .attr('class', 'edgelabel')
            .attr('id', function (d) {
            const suffix = '_text';
            const source = d.source ? d.source : '';
            const target = d.target ? d.target : '';
            return `${source}_${target}${suffix}`;
        })
            .style('text-anchor', 'middle')
            .attr('font-size', 14)
            .attr('dy', function (d) {
            return d.dy;
        });
        svg.selectAll('.edgelabel').on('dblclick', function () {
            const dblClick = d3.select(this).data();
            self.dblClickLinkPayload.next(dblClick);
        });
        edgelabelsEnter
            .append('textPath')
            .attr('xlink:href', function (d, i) {
            return '#edgepath' + i;
        })
            .style('cursor', 'pointer')
            .attr('dominant-baseline', 'bottom')
            .attr('startOffset', '50%')
            .text(function (d) {
            return d.label;
        });
        edgelabelsEnter
            .selectAll('textPath')
            .filter(function (d) {
            return d.linkIcon;
        })
            .append('tspan')
            .style('fill', '#856404')
            .style('font-weight', '700')
            .attr('class', 'fa')
            .text(' \uf0c1');
        // on normal label link click - highlight labels
        svg.selectAll('.edgelabel').on('click', function (d) {
            _d3.event.stopPropagation();
            nodeEnter.each(function (d) {
                d.selected = false;
                d.previouslySelected = false;
            });
            node.classed('selected', false);
            if (selectAllNodes) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
            _d3
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
            _d3.select(this).style('fill', 'blue').style('font-weight', 700);
            self.selectedNodesArray.next([]);
        });
        // on right label link click - hightlight labels and package data for context menu
        svg.selectAll('.edgelabel').on('contextmenu', function (d) {
            self.selectedNodesArray.next([]);
            _d3
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
            _d3.select(this).style('fill', 'blue').style('font-weight', 700);
            const localSelectedLinkArray = d3.select(this).data();
            self.selectedLinkArray.next(localSelectedLinkArray);
        });
        const node = zoomContainer.selectAll().data(this.nodes, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('g').data(node).exit().remove();
        const nodeEnter = node
            .join('g')
            .call(_d3
            .drag()
            .on('start', function dragstarted(d) {
            // Enable the save & reset btn
            if (resetBtn) {
                document
                    .getElementById('reset_graph')
                    .removeAttribute('disabled');
                document.getElementById('save_graph').removeAttribute('disabled');
            }
            if (!_d3.event.active)
                simulation.alphaTarget(0.9).restart();
            if (!d.selected && !this.shiftKey) {
                // if this node isn't selected, then we have to unselect every other node
                nodeEnter.classed('selected', function (p) {
                    return (p.selected = p.previouslySelected = false);
                });
                // remove the selected styling on other nodes and labels when we drag a non-selected node
                _d3
                    .selectAll('.edgelabel')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 400)
                    .style('fill', '#212529');
            }
            _d3.select(this).classed('selected', function (p) {
                d.previouslySelected = d.selected;
                return (d.selected = true);
            });
            nodeEnter
                .filter(function (d) {
                return d.selected;
            })
                .each(function (d) {
                d.fx = d.x;
                d.fy = d.y;
            });
        })
            .on('drag', function dragged(d) {
            nodeEnter
                .filter(function (d) {
                return d.selected;
            })
                .each(function (d) {
                d.fx += _d3.event.dx;
                d.fy += _d3.event.dy;
            });
        })
            .on('end', function dragended(d) {
            if (!_d3.event.active) {
                simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
            // Subscribes to updated graph positions for save
            self.saveGraphData.next(data);
        }))
            .attr('class', 'node-wrapper')
            .attr('id', function (d) {
            return d.id;
        });
        // no collision - already using this in statement
        const self = this;
        svg.selectAll('.node-wrapper').on('dblclick', function () {
            const dblClick = d3.select(this).data();
            self.dblClickNodePayload.next(dblClick);
        });
        // node click and ctrl + click
        svg.selectAll('.node-wrapper').on('click', function (d) {
            // so we don't activate the canvas .click event
            _d3.event.stopPropagation();
            // setting the select attribute to the object on single select so we can drag them
            d.selected = true;
            if (selectAllNodes) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
            // If ctrl key is held on click
            if (_d3.event.ctrlKey) {
                // toggle the class on and off when ctrl click is active
                const clickedNode = d3.select(this);
                const isSelected = clickedNode.classed('selected');
                clickedNode.classed('selected', !isSelected);
                d.selected = !isSelected;
                d.previouslySelected = !isSelected;
                const totalSize = nodeEnter.size();
                const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
                const count = nonSelectedNodes.size();
                const notSelectedSize = totalSize - count;
                if (notSelectedSize === totalSize) {
                    if (selectAllNodes) {
                        selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                        selectAllNodes.style.opacity = '0.65';
                    }
                }
                // remove the single click styling on other nodes and labels
                _d3
                    .selectAll('.edgelabel')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 400)
                    .style('fill', '#212529');
                svg
                    .selectAll('.selected')
                    .selectAll('.nodeText')
                    .style('fill', 'blue')
                    .style('font-weight', 700);
                // counts number of selected classes to not exceed 2
                const selectedSize = svg.selectAll('.selected').size();
                if (selectedSize <= 2) {
                    // As we allow for single click without a ctrl+click to select two nodes, we have to apply d.selected to it
                    _d3
                        .selectAll('.selected')
                        .attr('selected', true)
                        .each(function (d) {
                        if (d) {
                            d.selected = true;
                        }
                    });
                    // get data from node
                    const localselectedNodesArray = _d3.selectAll('.selected').data();
                    const filterId = localselectedNodesArray.filter((x) => x);
                    self.selectedNodesArray.next(filterId);
                    return filterId;
                }
                return null;
            }
            else {
                svg.selectAll('.node-wrapper').classed('selected', false);
                d3.select(this).classed('selected', true);
                nodeEnter.each(function (d) {
                    d.selected = false;
                    d.previouslySelected = false;
                });
            }
            // remove style from selected node before the class is removed
            _d3
                .selectAll('.selected')
                .selectAll('.nodeText')
                .style('fill', '#212529');
            // Remove styles from all other nodes and labels on single left click
            _d3.selectAll('.edgelabel').style('fill', '#212529');
            _d3
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            // Add style on single left click
            _d3
                .select(this)
                .select('.nodeText')
                .style('fill', 'blue')
                .style('font-weight', 700);
            self.selectedNodesArray.next([]);
            return null;
        });
        // Right click on a node highlights for context menu
        svg.selectAll('.node-wrapper').on('contextmenu', function (d) {
            // counts number of selected classes to not exceed 2
            const selectedSize = svg
                .selectAll('.selected')
                .selectAll('.nodeText')
                .size();
            if (selectedSize !== 2) {
                // We don't want to remove style if they are obtaining the context menu for just two nodes (create link option)
                svg.selectAll('.selected').classed('selected', false);
                self.selectedNodesArray.next([]);
                _d3
                    .selectAll('.edgelabel')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                _d3
                    .selectAll('.nodeText')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                // Add style on single right click
                _d3
                    .select(this)
                    .select('.nodeText')
                    .style('fill', 'blue')
                    .style('font-weight', 700);
            }
        });
        //click on canvas to remove selected nodes
        _d3.select('svg').on('click', () => {
            nodeEnter.each(function (d) {
                d.selected = false;
                d.previouslySelected = false;
            });
            node.classed('selected', false);
            _d3
                .selectAll('.selected')
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            _d3.selectAll('.selected').classed('selected', false);
            _d3
                .selectAll('.edgelabel')
                .style('fill', '#212529')
                .style('font-weight', 400);
            self.selectedNodesArray.next([]);
            if (selectAllNodes) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
        });
        nodeEnter
            .filter(function (d) {
            if (!d.imageUrl || d.imageUrl === '') {
                return null;
            }
            return true;
        })
            .append('image')
            .attr('xlink:href', function (d) {
            return d.imageUrl;
        })
            .attr('x', -15)
            .attr('y', -60)
            .attr('class', function (d) {
            const suffix = 'image';
            const id = d.id ? d.id : '';
            return `${id}_${suffix}`;
        })
            .attr('id', function (d) {
            const id = d.id ? d.id : '';
            return `${id}`;
        })
            .attr('width', 32)
            .attr('height', 32)
            .attr('class', 'image')
            .style('cursor', 'pointer');
        nodeEnter
            .filter(function (d) {
            if (!d.icon || d.icon === '') {
                return null;
            }
            return true;
        })
            .append('text')
            .text(function (d) {
            return d.icon;
        })
            .attr('x', -18)
            .attr('y', -30)
            .attr('class', function (d) {
            const suffix = 'icon';
            const id = d.id ? d.id : '';
            return `${id}_${suffix} fa`;
        })
            .attr('id', function (d) {
            const id = d.id ? d.id : '';
            return `${id}`;
        })
            .style('font-size', '35px')
            .style('cursor', 'pointer');
        const nodeText = nodeEnter
            .append('text')
            .attr('id', 'nodeText')
            .attr('class', 'nodeText')
            .style('text-anchor', 'middle')
            .style('cursor', 'pointer')
            .attr('dy', -3)
            .attr('y', -25)
            .attr('testhook', function (d) {
            const suffix = 'text';
            const id = d.id ? d.id : '';
            return `${id}_${suffix}`;
        });
        nodeText
            .selectAll('tspan.text')
            .data((d) => d.label)
            .enter()
            .append('tspan')
            .attr('class', 'nodeTextTspan')
            .text((d) => d)
            .style('font-size', '14px')
            .attr('x', -10)
            .attr('dx', 10)
            .attr('dy', 15);
        nodeEnter
            .filter(function (d) {
            if (!d.additionalIcon) {
                return null;
            }
            return true;
        })
            .append('text')
            .attr('id', function (d) {
            const suffix = 'additionalIcon';
            const id = d.id ? d.id : '';
            return `${id}_${suffix}`;
        })
            .attr('width', 100)
            .attr('height', 25)
            .attr('x', 30)
            .attr('y', -50)
            .attr('class', 'fa')
            .style('fill', '#856404')
            .text(function (d) {
            return d.additionalIcon;
        });
        // transition effects for new pulsating nodes
        nodeEnter
            .filter(function (d) {
            if (!d.newItem) {
                return null;
            }
            return true;
        })
            .select('text')
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 1)
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 0.1)
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 1)
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 0.1)
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 1)
            .transition()
            .duration(1000)
            .attr('fill', '#212529')
            .attr('font-weight', 400)
            .attr('fill-opacity', 1)
            .on('end', function () {
            return d3.select(this).call(_d3.transition);
        });
        nodeEnter
            .filter(function (d) {
            if (!d.newItem) {
                return null;
            }
            return true;
        })
            .select('image')
            .transition()
            .duration(1000)
            .attr('width', 45)
            .attr('height', 45)
            .transition()
            .duration(1000)
            .attr('width', 32)
            .attr('height', 32)
            .transition()
            .duration(1000)
            .attr('width', 45)
            .attr('height', 45)
            .transition()
            .duration(1000)
            .attr('width', 32)
            .attr('height', 32)
            .transition()
            .duration(1000)
            .attr('width', 45)
            .attr('height', 45)
            .transition()
            .duration(1000)
            .attr('width', 32)
            .attr('height', 32)
            .on('end', function () {
            return d3.select(this).call(d3.transition);
        });
        // Remove the newClass so they don't animate next time
        this.nodes = this.removeNewItem(this.nodes);
        nodeEnter.append('title').text(function (d) {
            return d.label;
        });
        const maxTicks = 30;
        let tickCount = 0;
        let zoomToFitCalled = false;
        simulation.nodes(this.nodes).on('tick', () => {
            if (this.zoomToFit && tickCount >= maxTicks && !zoomToFitCalled) {
                simulation.stop();
                handleZoomToFit();
                zoomToFitCalled = true;
            }
            else {
                this.ticked(linkEnter, nodeEnter, edgepathsEnter);
                tickCount++;
            }
        });
        simulation.force('link').links(this.links);
        self.saveGraphData.next(data);
    }
    resetGraph(initialData, element, zoom, zoomToFit) {
        // To reset the search when we reset the data
        this.resetSearch = true;
        // Reset the data to its initial state
        this.nodes = [];
        this.links = [];
        // Call the update method again to re-simulate the graph with the new data
        this.update(initialData, element, zoom, zoomToFit);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, deps: [{ token: DexieService }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [{ type: DexieService }] });

var Orientation;
(function (Orientation) {
    Orientation["LEFT_TO_RIGHT"] = "LR";
    Orientation["RIGHT_TO_LEFT"] = "RL";
    Orientation["TOP_TO_BOTTOM"] = "TB";
    Orientation["BOTTOM_TO_TOP"] = "BT";
})(Orientation || (Orientation = {}));
var Alignment;
(function (Alignment) {
    Alignment["CENTER"] = "C";
    Alignment["UP_LEFT"] = "UL";
    Alignment["UP_RIGHT"] = "UR";
    Alignment["DOWN_LEFT"] = "DL";
    Alignment["DOWN_RIGHT"] = "DR";
})(Alignment || (Alignment = {}));
class DagreNodesOnlyLayout {
    defaultSettings = {
        orientation: Orientation.LEFT_TO_RIGHT,
        marginX: 70,
        marginY: 70,
        edgePadding: 200,
        rankPadding: 300,
        nodePadding: 100,
        curveDistance: 20,
        multigraph: true,
        compound: true,
        align: Alignment.UP_RIGHT,
        acyclicer: undefined,
        ranker: 'network-simplex',
    };
    dagreGraph;
    dagreNodes;
    dagreEdges;
    renderLayout(graph) {
        this.createDagreGraph(graph);
        dagre.layout(this.dagreGraph);
        for (const dagreNodeId in this.dagreGraph._nodes) {
            const dagreNode = this.dagreGraph._nodes[dagreNodeId];
            const node = graph.nodes.find((n) => n.id === dagreNode.id);
            if (node.fx === null && node.fy === null) {
                // Check if the node has any associated edges
                const hasAssociatedEdges = graph.links.some((link) => link.source === dagreNode.id || link.target === dagreNode.id);
                if (hasAssociatedEdges) {
                    node.fx = dagreNode.x;
                    node.fy = dagreNode.y;
                }
            }
            node.dimension = {
                width: dagreNode.width,
                height: dagreNode.height,
            };
        }
        return graph;
    }
    initRenderLayout(graph) {
        this.createDagreGraph(graph);
        dagre.layout(this.dagreGraph);
        let minFy = Infinity;
        for (const dagreNodeId in this.dagreGraph._nodes) {
            const dagreNode = this.dagreGraph._nodes[dagreNodeId];
            const node = graph.nodes.find((n) => n.id === dagreNode.id);
            // Check if the node has any associated edges
            const hasAssociatedEdges = graph.links.some((link) => link.source === dagreNode.id || link.target === dagreNode.id);
            if (hasAssociatedEdges) {
                node.fx = dagreNode.x;
                node.fy = dagreNode.y;
                minFy = Math.min(minFy, dagreNode.y - this.defaultSettings.marginY);
            }
            else {
                // Give them a null value to later random position them only when the layout button is pressed so they come into view
                node.fx = null;
                node.fy = null;
            }
            node.dimension = {
                width: dagreNode.width,
                height: dagreNode.height,
            };
        }
        // Adjust the fy values to start from 0 if there are associated edges
        if (minFy !== Infinity) {
            for (const node of graph.nodes) {
                if (node.fy !== null) {
                    node.fy -= minFy;
                }
            }
        }
        return graph;
    }
    createDagreGraph(graph) {
        const settings = Object.assign({}, this.defaultSettings);
        this.dagreGraph = new dagre.graphlib.Graph({
            compound: settings.compound,
            multigraph: settings.multigraph,
        });
        this.dagreGraph.setGraph({
            rankdir: settings.orientation,
            marginx: settings.marginX,
            marginy: settings.marginY,
            edgesep: settings.edgePadding,
            ranksep: settings.rankPadding,
            nodesep: settings.nodePadding,
            align: settings.align,
            acyclicer: settings.acyclicer,
            ranker: settings.ranker,
            multigraph: settings.multigraph,
            compound: settings.compound,
        });
        this.dagreNodes = graph.nodes.map((n) => {
            const node = Object.assign({}, n);
            node.width = 20;
            node.height = 20;
            node.x = n.fx;
            node.y = n.fy;
            return node;
        });
        this.dagreEdges = graph.links.map((l) => {
            const newLink = Object.assign({}, l);
            return newLink;
        });
        for (const node of this.dagreNodes) {
            if (!node.width) {
                node.width = 20;
            }
            if (!node.height) {
                node.height = 30;
            }
            // update dagre
            this.dagreGraph.setNode(node.id, node);
        }
        // update dagre
        for (const edge of this.dagreEdges) {
            if (settings.multigraph) {
                this.dagreGraph.setEdge(edge.source, edge.target, edge, edge.linkId);
            }
            else {
                this.dagreGraph.setEdge(edge.source, edge.target);
            }
        }
        return this.dagreGraph;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DagreNodesOnlyLayout, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DagreNodesOnlyLayout, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DagreNodesOnlyLayout, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }] });

class VisualiserGraphComponent {
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
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, deps: [{ token: VisualiserGraphService }, { token: i2.ContextMenuService }, { token: DagreNodesOnlyLayout }, { token: DexieService }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: VisualiserGraphComponent, selector: "visualiser-graph", inputs: { zoom: "zoom", zoomToFit: "zoomToFit", data: "data" }, outputs: { saveGraphDataEvent: "saveGraphDataEvent" }, viewQueries: [{ propertyName: "graphElement", first: true, predicate: ["svgId"], descendants: true }, { propertyName: "contextMenu", first: true, predicate: ContextMenusComponent, descendants: true }, { propertyName: "modalsComponent", first: true, predicate: ModalsComponent, descendants: true }], ngImport: i0, template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div id=\"draggable\" class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div *ngIf=\"controls\">\n      <div class=\"d-flex justify-content-end\">\n        <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n          <button type=\"button\" id=\"draggableHandle\" class=\"btn btn-light\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Move toolbar\">\n            <i class=\"bi bi-grip-vertical\"></i>\n          </button>\n\n          <button type=\"button\" id=\"dagre_layout\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Dagre layout\" (click)=\"applyLayout()\">\n            <i class=\"bi bi-diagram-3\"></i>\n          </button>\n          <button type=\"button\" id=\"save_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Save data\" (click)=\"onConfirmSave()\">\n            <i class=\"bi bi-save\"></i>\n          </button>\n          <button type=\"button\" id=\"reset_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Reset data\" (click)=\"resetGraph()\">\n            <i class=\"bi bi-skip-backward\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom in\" id=\"zoom_in\">\n            <i class=\"bi bi-zoom-in\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom out\" id=\"zoom_out\">\n            <i class=\"bi bi-zoom-out\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom reset\" id=\"zoom_reset\" disabled=\"true\">\n            <i class=\"bi bi-arrow-counterclockwise\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom to fit\" id=\"zoom_to_fit\">\n            <i class=\"bi bi-arrows-fullscreen\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Select all\" id=\"select_all\">\n            <i class=\"bi bi-grid-fill\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Invert selection\" id=\"toggle_selection\">\n            <i class=\"bi bi-ui-checks-grid\"></i>\n          </button>\n          <button type=\"button\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Toggle search\" id=\"toggle_search\"\n            [ngClass]=\"{'searchButtonActive': showSearch, 'searchButtonInactive': !showSearch}\"\n            (click)=\"toggleSearch()\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n      </div>\n      <div class=\"search float-right input-group mt-3 pr-0\" [hidden]=\"!showSearch\">\n        <div class=\"input-group-prepend\">\n          <button type=\"button\" id=\"prevButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Previous\" disabled>\n            <i class=\"bi bi-arrow-left-square\"></i>\n          </button>\n          <button type=\"button\" id=\"nextButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Next\" disabled>\n            <i class=\"bi bi-arrow-right-square\"></i>\n          </button>\n        </div>\n        <input type=\"text\" id=\"searchInput\" class=\"form-control\" placeholder=\"Search\" aria-label=\"Search\"\n          aria-describedby=\"search\" />\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"searchButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Search\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"clearButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Clear\" disabled>\n            clear\n          </button>\n        </div>\n      </div>\n    </div>\n    <div [hidden]=\"!showSearch\" id=\"noMatchesText\" class=\"noMatchesText float-right\">No matches found</div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n\n  <app-context-menus\n  (editNodeContextMenuEvent)=\"handleEditNodesEvent($event)\"\n  (findCreateNodesContextMenuEvent)=\"findCreateNodesEvent($event)\"\n  (createLinkContextMenuEvent)=\"openModal('createLinkModal')\"\n  (editLinkLabelContextMenuEvent)=\"onEditLinkLabel()\"\n  (editLinksContextMenuEvent)=\"handleEditLinksEvent($event)\">\n  </app-context-menus>\n\n  <app-modals\n  [editNodeData]=\"editNodeData\"\n  [editLinksData]=\"editLinksData\"\n  (createLinkEvent)=\"onCreateLink($event)\"\n  (createNodeEvent)=\"onCreateNode($event)\"\n  (deleteLinkEvent)=\"onDeleteLink($event)\"\n  (deleteNodeEvent)=\"onDeleteNode()\">\n  </app-modals>\n\n  <svg #svgId [attr.width]=\"width\" height=\"780\" (contextmenu)=\"visualiserContextMenus($event)\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.buttonBar{position:absolute;padding:10px}.zoomIndicator{position:absolute;left:0;padding:10px}.noMatchesText{opacity:0;transition:opacity .5s;color:red}.noMatchesText.show{opacity:1}@keyframes floatInFromTop{0%{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}.input-group{animation-name:floatInFromTop;animation-duration:.3s;animation-fill-mode:forwards;position:relative;width:407px}.searchButtonActive{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonActive:focus,.searchButtonActive:active{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonInactive{opacity:1;outline:none;box-shadow:none;background-color:#6c757d!important;border-color:#6c757d!important}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}#draggableHandle{cursor:move}\n"], dependencies: [{ kind: "directive", type: i3.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: i3.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "component", type: ContextMenusComponent, selector: "app-context-menus", outputs: ["editNodeContextMenuEvent", "findCreateNodesContextMenuEvent", "createLinkContextMenuEvent", "editLinkLabelContextMenuEvent", "editLinksContextMenuEvent"] }, { kind: "component", type: ModalsComponent, selector: "app-modals", inputs: ["editNodeData", "editLinksData"], outputs: ["closeModalEvent", "createLinkEvent", "createNodeEvent", "deleteLinkEvent", "deleteNodeEvent"] }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphComponent, decorators: [{
            type: Component,
            args: [{ selector: 'visualiser-graph', template: "<div class=\"page\" id=\"pageId\" (window:resize)=\"onResize($event)\">\n  <div id=\"draggable\" class=\"buttonBar\" [style.right]=\"buttonBarRightPosition\">\n    <div *ngIf=\"controls\">\n      <div class=\"d-flex justify-content-end\">\n        <div class=\"btn-group\" role=\"group\" aria-label=\"Controls\">\n          <button type=\"button\" id=\"draggableHandle\" class=\"btn btn-light\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Move toolbar\">\n            <i class=\"bi bi-grip-vertical\"></i>\n          </button>\n\n          <button type=\"button\" id=\"dagre_layout\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Dagre layout\" (click)=\"applyLayout()\">\n            <i class=\"bi bi-diagram-3\"></i>\n          </button>\n          <button type=\"button\" id=\"save_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Save data\" (click)=\"onConfirmSave()\">\n            <i class=\"bi bi-save\"></i>\n          </button>\n          <button type=\"button\" id=\"reset_graph\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Reset data\" (click)=\"resetGraph()\">\n            <i class=\"bi bi-skip-backward\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom in\" id=\"zoom_in\">\n            <i class=\"bi bi-zoom-in\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom out\" id=\"zoom_out\">\n            <i class=\"bi bi-zoom-out\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom reset\" id=\"zoom_reset\" disabled=\"true\">\n            <i class=\"bi bi-arrow-counterclockwise\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Zoom to fit\" id=\"zoom_to_fit\">\n            <i class=\"bi bi-arrows-fullscreen\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Select all\" id=\"select_all\">\n            <i class=\"bi bi-grid-fill\"></i>\n          </button>\n          <button type=\"button\" *ngIf=\"zoom\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Invert selection\" id=\"toggle_selection\">\n            <i class=\"bi bi-ui-checks-grid\"></i>\n          </button>\n          <button type=\"button\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Toggle search\" id=\"toggle_search\"\n            [ngClass]=\"{'searchButtonActive': showSearch, 'searchButtonInactive': !showSearch}\"\n            (click)=\"toggleSearch()\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n      </div>\n      <div class=\"search float-right input-group mt-3 pr-0\" [hidden]=\"!showSearch\">\n        <div class=\"input-group-prepend\">\n          <button type=\"button\" id=\"prevButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Previous\" disabled>\n            <i class=\"bi bi-arrow-left-square\"></i>\n          </button>\n          <button type=\"button\" id=\"nextButton\" class=\"btn btn-secondary\" data-toggle=\"tooltip\" data-placement=\"top\"\n            title=\"Next\" disabled>\n            <i class=\"bi bi-arrow-right-square\"></i>\n          </button>\n        </div>\n        <input type=\"text\" id=\"searchInput\" class=\"form-control\" placeholder=\"Search\" aria-label=\"Search\"\n          aria-describedby=\"search\" />\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"searchButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Search\">\n            <i class=\"bi bi-search\"></i>\n          </button>\n        </div>\n        <div class=\"input-group-append\">\n          <button class=\"btn btn-outline-secondary\" type=\"button\" id=\"clearButton\" data-toggle=\"tooltip\"\n            data-placement=\"top\" title=\"Clear\" disabled>\n            clear\n          </button>\n        </div>\n      </div>\n    </div>\n    <div [hidden]=\"!showSearch\" id=\"noMatchesText\" class=\"noMatchesText float-right\">No matches found</div>\n  </div>\n  <!-- Zoom indicator-->\n  <div *ngIf=\"zoom\" class=\"zoomIndicator\">\n    <span id=\"zoom_level\"></span>\n  </div>\n  <!-- Save confirmation-->\n  <div *ngIf=\"showConfirmation\" class=\"confirmation-message-container\">\n    <div class=\"alert alert-success confirmation-message\" role=\"alert\" [ngClass]=\"{ 'fade-out': !showConfirmation }\">\n      Saved <i class=\"bi bi-check-circle\"></i>\n    </div>\n  </div>\n\n  <app-context-menus\n  (editNodeContextMenuEvent)=\"handleEditNodesEvent($event)\"\n  (findCreateNodesContextMenuEvent)=\"findCreateNodesEvent($event)\"\n  (createLinkContextMenuEvent)=\"openModal('createLinkModal')\"\n  (editLinkLabelContextMenuEvent)=\"onEditLinkLabel()\"\n  (editLinksContextMenuEvent)=\"handleEditLinksEvent($event)\">\n  </app-context-menus>\n\n  <app-modals\n  [editNodeData]=\"editNodeData\"\n  [editLinksData]=\"editLinksData\"\n  (createLinkEvent)=\"onCreateLink($event)\"\n  (createNodeEvent)=\"onCreateNode($event)\"\n  (deleteLinkEvent)=\"onDeleteLink($event)\"\n  (deleteNodeEvent)=\"onDeleteNode()\">\n  </app-modals>\n\n  <svg #svgId [attr.width]=\"width\" height=\"780\" (contextmenu)=\"visualiserContextMenus($event)\"></svg>\n</div>", styles: ["#zoom_level{position:relative;background-color:#000c;color:#fff;padding:5px;border-radius:5px;opacity:0;transition:opacity 1s ease-in-out}.buttonBar{position:absolute;padding:10px}.zoomIndicator{position:absolute;left:0;padding:10px}.noMatchesText{opacity:0;transition:opacity .5s;color:red}.noMatchesText.show{opacity:1}@keyframes floatInFromTop{0%{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}.input-group{animation-name:floatInFromTop;animation-duration:.3s;animation-fill-mode:forwards;position:relative;width:407px}.searchButtonActive{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonActive:focus,.searchButtonActive:active{outline:none;-webkit-box-shadow:inset 0px 0px 5px #323232;-moz-box-shadow:inset 0px 0px 5px #323232;box-shadow:inset 0 0 5px #323232}.searchButtonInactive{opacity:1;outline:none;box-shadow:none;background-color:#6c757d!important;border-color:#6c757d!important}.confirmation-message-container{position:absolute;left:50%;transform:translate(-50%)}.confirmation-message{position:relative;top:60px;opacity:0;animation:fade-in .5s ease-in-out forwards}@keyframes fade-in{0%{opacity:0}to{opacity:1}}.fade-out{animation:fade-out .5s ease-in-out forwards}@keyframes fade-out{0%{opacity:1}to{opacity:0}}#draggableHandle{cursor:move}\n"] }]
        }], ctorParameters: () => [{ type: VisualiserGraphService }, { type: i2.ContextMenuService }, { type: DagreNodesOnlyLayout }, { type: DexieService }], propDecorators: { graphElement: [{
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

class NgxRelationshipVisualiserModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: NgxRelationshipVisualiserModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "17.3.12", ngImport: i0, type: NgxRelationshipVisualiserModule, declarations: [VisualiserGraphComponent,
            ContextMenusComponent,
            ModalsComponent], imports: [BrowserModule,
            ReactiveFormsModule, i1.ModalModule, i2.ContextMenuModule, NgSelectModule,
            FormsModule], exports: [VisualiserGraphComponent] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: NgxRelationshipVisualiserModule, imports: [BrowserModule,
            ReactiveFormsModule,
            ModalModule.forRoot(),
            ContextMenuModule.forRoot({ useBootstrap4: true }),
            NgSelectModule,
            FormsModule] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: NgxRelationshipVisualiserModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: [
                        VisualiserGraphComponent,
                        ContextMenusComponent,
                        ModalsComponent
                    ],
                    imports: [
                        BrowserModule,
                        ReactiveFormsModule,
                        ModalModule.forRoot(),
                        ContextMenuModule.forRoot({ useBootstrap4: true }),
                        NgSelectModule,
                        FormsModule
                    ],
                    exports: [VisualiserGraphComponent]
                }]
        }] });

/**
 * Generated bundle index. Do not edit.
 */

export { NgxRelationshipVisualiserModule, VisualiserGraphComponent };
//# sourceMappingURL=ngx-relationship-visualiser.mjs.map
