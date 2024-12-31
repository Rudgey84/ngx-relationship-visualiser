import { EventEmitter } from '@angular/core';
import { ContextMenuComponent } from '@kreash/ngx-contextmenu';
import * as i0 from "@angular/core";
export declare class ContextMenusComponent {
    editNodeContextMenu: ContextMenuComponent;
    findCreateNodesContextMenu: ContextMenuComponent;
    createEditLinkContextMenu: ContextMenuComponent;
    editLinkLabelContextMenu: ContextMenuComponent;
    editNodeContextMenuEvent: EventEmitter<any>;
    findCreateNodesContextMenuEvent: EventEmitter<any>;
    createLinkContextMenuEvent: EventEmitter<any>;
    editLinkLabelContextMenuEvent: EventEmitter<any>;
    editLinksContextMenuEvent: EventEmitter<any>;
    currentMatchingLink: any;
    editNode(): void;
    findNodes(): void;
    createNode(): void;
    createLink(): void;
    editLinkLabel(): void;
    editLinks(): void;
    linksExist: (item: any) => boolean;
    linksDoNotExist: (item: any) => boolean;
    private checkLinkBetweenSelectedNodes;
    static ɵfac: i0.ɵɵFactoryDeclaration<ContextMenusComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<ContextMenusComponent, "app-context-menus", never, {}, { "editNodeContextMenuEvent": "editNodeContextMenuEvent"; "findCreateNodesContextMenuEvent": "findCreateNodesContextMenuEvent"; "createLinkContextMenuEvent": "createLinkContextMenuEvent"; "editLinkLabelContextMenuEvent": "editLinkLabelContextMenuEvent"; "editLinksContextMenuEvent": "editLinksContextMenuEvent"; }, never, never, false, never>;
}
