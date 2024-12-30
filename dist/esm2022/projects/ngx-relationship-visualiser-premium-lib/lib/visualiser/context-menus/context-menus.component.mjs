import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import * as i0 from "@angular/core";
import * as i1 from "@kreash/ngx-contextmenu";
export class ContextMenusComponent {
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
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.3.12", type: ContextMenusComponent, selector: "app-context-menus", outputs: { editNodeContextMenuEvent: "editNodeContextMenuEvent", findCreateNodesContextMenuEvent: "findCreateNodesContextMenuEvent", createLinkContextMenuEvent: "createLinkContextMenuEvent", editLinkLabelContextMenuEvent: "editLinkLabelContextMenuEvent", editLinksContextMenuEvent: "editLinksContextMenuEvent" }, viewQueries: [{ propertyName: "editNodeContextMenu", first: true, predicate: ["editNodeContextMenu"], descendants: true }, { propertyName: "findCreateNodesContextMenu", first: true, predicate: ["findCreateNodesContextMenu"], descendants: true }, { propertyName: "createEditLinkContextMenu", first: true, predicate: ["createEditLinkContextMenu"], descendants: true }, { propertyName: "editLinkLabelContextMenu", first: true, predicate: ["editLinkLabelContextMenu"], descendants: true }], ngImport: i0, template: "<context-menu #editNodeContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"editNode()\">\n    Edit Node...\n  </ng-template>\n</context-menu>\n\n<context-menu #findCreateNodesContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"findNodes()\">\n    Search Nodes...\n  </ng-template>\n  <ng-template contextMenuItem let-item (execute)=\"createNode()\">\n    Create Node...\n  </ng-template>\n</context-menu>\n\n<context-menu #createEditLinkContextMenu>\n  <ng-template [visible]=\"linksDoNotExist\" contextMenuItem let-item (execute)=\"createLink()\">\n    Create Link...\n  </ng-template>\n  <ng-template [visible]=\"linksExist\" (execute)=\"editLinks()\" contextMenuItem let-item>\n    Edit Links...\n  </ng-template>\n</context-menu>\n\n<context-menu #editLinkLabelContextMenu>\n  <ng-template contextMenuItem let-item (execute)=\"editLinkLabel()\">\n    Edit Link label...\n  </ng-template>\n</context-menu>", dependencies: [{ kind: "component", type: i1.ContextMenuComponent, selector: "context-menu", inputs: ["menuClass", "autoFocus", "useBootstrap4", "disabled"], outputs: ["close", "open"] }, { kind: "directive", type: i1.ContextMenuItemDirective, selector: "[contextMenuItem]", inputs: ["subMenu", "divider", "enabled", "passive", "visible"], outputs: ["execute"] }] });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC1tZW51cy5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItcHJlbWl1bS1saWIvbGliL3Zpc3VhbGlzZXIvY29udGV4dC1tZW51cy9jb250ZXh0LW1lbnVzLmNvbXBvbmVudC50cyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Byb2plY3RzL25neC1yZWxhdGlvbnNoaXAtdmlzdWFsaXNlci1wcmVtaXVtLWxpYi9saWIvdmlzdWFsaXNlci9jb250ZXh0LW1lbnVzL2NvbnRleHQtbWVudXMuY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGVBQWUsQ0FBQzs7O0FBTzNFLE1BQU0sT0FBTyxxQkFBcUI7SUFDRSxtQkFBbUIsQ0FBdUI7SUFDbkMsMEJBQTBCLENBQXVCO0lBQ2xELHlCQUF5QixDQUF1QjtJQUNqRCx3QkFBd0IsQ0FBdUI7SUFFNUUsd0JBQXdCLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztJQUNuRCwrQkFBK0IsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO0lBQzFELDBCQUEwQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7SUFDckQsNkJBQTZCLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztJQUN4RCx5QkFBeUIsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO0lBRXZELG1CQUFtQixHQUFRLElBQUksQ0FBQztJQUV2QyxRQUFRO1FBQ04sSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsU0FBUztRQUNQLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVELFVB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LFNBQVM7dUJBQUMsNEJBQTRCO2dCQUNDLHlCQUF5QjtzQkFBaEUsU0FBUzt1QkFBQywyQkFBMkI7Z0JBQ0Msd0JBQXdCO3NCQUE5RCxTQUFTO3VCQUFDLDBCQUEwQjtnQkFFM0Isd0JBQXdCO3NCQUFqQyxNQUFNO2dCQUNHLCtCQUErQjtzQkFBeEMsTUFBTTtnQkFDRywwQkFBMEI7c0JBQW5DLE1BQU07Z0JBQ0csNkJBQTZCO3NCQUF0QyxNQUFNO2dCQUNHLHlCQUF5QjtzQkFBbEMsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgVmlld0NoaWxkLCBPdXRwdXQsIEV2ZW50RW1pdHRlciB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgQ29udGV4dE1lbnVDb21wb25lbnQgfSBmcm9tICdAa3JlYXNoL25neC1jb250ZXh0bWVudSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1jb250ZXh0LW1lbnVzJyxcbiAgdGVtcGxhdGVVcmw6ICcuL2NvbnRleHQtbWVudXMuY29tcG9uZW50Lmh0bWwnXG59KVxuZXhwb3J0IGNsYXNzIENvbnRleHRNZW51c0NvbXBvbmVudCB7XG4gIEBWaWV3Q2hpbGQoJ2VkaXROb2RlQ29udGV4dE1lbnUnKSBlZGl0Tm9kZUNvbnRleHRNZW51OiBDb250ZXh0TWVudUNvbXBvbmVudDtcbiAgQFZpZXdDaGlsZCgnZmluZENyZWF0ZU5vZGVzQ29udGV4dE1lbnUnKSBmaW5kQ3JlYXRlTm9kZXNDb250ZXh0TWVudTogQ29udGV4dE1lbnVDb21wb25lbnQ7XG4gIEBWaWV3Q2hpbGQoJ2NyZWF0ZUVkaXRMaW5rQ29udGV4dE1lbnUnKSBjcmVhdGVFZGl0TGlua0NvbnRleHRNZW51OiBDb250ZXh0TWVudUNvbXBvbmVudDtcbiAgQFZpZXdDaGlsZCgnZWRpdExpbmtMYWJlbENvbnRleHRNZW51JykgZWRpdExpbmtMYWJlbENvbnRleHRNZW51OiBDb250ZXh0TWVudUNvbXBvbmVudDtcblxuICBAT3V0cHV0KCkgZWRpdE5vZGVDb250ZXh0TWVudUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoKSBmaW5kQ3JlYXRlTm9kZXNDb250ZXh0TWVudUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoKSBjcmVhdGVMaW5rQ29udGV4dE1lbnVFdmVudCA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBAT3V0cHV0KCkgZWRpdExpbmtMYWJlbENvbnRleHRNZW51RXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgQE91dHB1dCgpIGVkaXRMaW5rc0NvbnRleHRNZW51RXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcblxuICBwdWJsaWMgY3VycmVudE1hdGNoaW5nTGluazogYW55ID0gbnVsbDtcblxuICBlZGl0Tm9kZSgpIHtcbiAgICB0aGlzLmVkaXROb2RlQ29udGV4dE1lbnVFdmVudC5lbWl0KHRydWUpO1xuICB9XG5cbiAgZmluZE5vZGVzKCkge1xuICAgIHRoaXMuZmluZENyZWF0ZU5vZGVzQ29udGV4dE1lbnVFdmVudC5lbWl0KCdmaW5kTm9kZXMnKTtcbiAgfVxuXG4gIGNyZWF0ZU5vZGUoKSB7XG4gICAgdGhpcy5maW5kQ3JlYXRlTm9kZXNDb250ZXh0TWVudUV2ZW50LmVtaXQoJ2NyZWF0ZU5vZGUnKTtcbiAgfVxuXG4gIGNyZWF0ZUxpbmsoKSB7XG4gICAgdGhpcy5jcmVhdGVMaW5rQ29udGV4dE1lbnVFdmVudC5lbWl0KHRydWUpO1xuICB9XG5cbiAgZWRpdExpbmtMYWJlbCgpIHtcbiAgICB0aGlzLmVkaXRMaW5rTGFiZWxDb250ZXh0TWVudUV2ZW50LmVtaXQodHJ1ZSk7XG4gIH1cblxuICBlZGl0TGlua3MoKSB7XG4gICAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICAgIG9wZW46IHRydWUsXG4gICAgICBkYXRhOiB0aGlzLmN1cnJlbnRNYXRjaGluZ0xpbmtcbiAgICB9O1xuICAgIGlmICh0aGlzLmN1cnJlbnRNYXRjaGluZ0xpbmspIHtcbiAgICAgIHRoaXMuZWRpdExpbmtzQ29udGV4dE1lbnVFdmVudC5lbWl0KHBheWxvYWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJObyBtYXRjaGluZyBsaW5rIHRvIGVkaXQuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBsaW5rc0V4aXN0ID0gKGl0ZW06IGFueSk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IG1hdGNoaW5nTGluayA9IHRoaXMuY2hlY2tMaW5rQmV0d2VlblNlbGVjdGVkTm9kZXMoaXRlbSk7XG5cbiAgICBpZiAobWF0Y2hpbmdMaW5rKSB7XG4gICAgICB0aGlzLmN1cnJlbnRNYXRjaGluZ0xpbmsgPSBtYXRjaGluZ0xpbms7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50TWF0Y2hpbmdMaW5rID0gbnVsbDtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgcHVibGljIGxpbmtzRG9Ob3RFeGlzdCA9IChpdGVtOiBhbnkpOiBib29sZWFuID0+IHtcbiAgICBjb25zdCBtYXRjaGluZ0xpbmsgPSB0aGlzLmNoZWNrTGlua0JldHdlZW5TZWxlY3RlZE5vZGVzKGl0ZW0pO1xuXG4gICAgaWYgKCFtYXRjaGluZ0xpbmspIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG5cbiAgcHJpdmF0ZSBjaGVja0xpbmtCZXR3ZWVuU2VsZWN0ZWROb2RlcyhwYXlsb2FkKSB7XG4gICAgaWYgKCFwYXlsb2FkIHx8ICFwYXlsb2FkLnNlbGVjdGVkTm9kZXMpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIlBheWxvYWQgb3Igc2VsZWN0ZWROb2RlcyBpcyB1bmRlZmluZWQuXCIpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZWN0ZWROb2RlcyA9IHBheWxvYWQuc2VsZWN0ZWROb2RlcztcbiAgICBjb25zdCBsaW5rcyA9IHBheWxvYWQuZ3JhcGhEYXRhLmxpbmtzO1xuXG4gICAgY29uc3Qgc291cmNlSWQgPSBzZWxlY3RlZE5vZGVzWzBdLmlkO1xuICAgIGNvbnN0IHRhcmdldElkID0gc2VsZWN0ZWROb2Rlc1sxXS5pZDtcblxuICAgIC8vIENoZWNrIGZvciBhIGxpbmsgaW4gYm90aCBkaXJlY3Rpb25zIChzb3VyY2UgLT4gdGFyZ2V0IG9yIHRhcmdldCAtPiBzb3VyY2UpXG4gICAgY29uc3QgbWF0Y2hpbmdMaW5rID0gbGlua3MuZmluZChcbiAgICAgIChsaW5rKSA9PlxuICAgICAgICAobGluay5zb3VyY2UgPT09IHNvdXJjZUlkICYmIGxpbmsudGFyZ2V0ID09PSB0YXJnZXRJZCkgfHxcbiAgICAgICAgKGxpbmsuc291cmNlID09PSB0YXJnZXRJZCAmJiBsaW5rLnRhcmdldCA9PT0gc291cmNlSWQpXG4gICAgKTtcblxuICAgIGlmIChtYXRjaGluZ0xpbmspIHtcbiAgICAgIHJldHVybiBtYXRjaGluZ0xpbms7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG59XG4iLCI8Y29udGV4dC1tZW51ICNlZGl0Tm9kZUNvbnRleHRNZW51PlxuICA8bmctdGVtcGxhdGUgY29udGV4dE1lbnVJdGVtIGxldC1pdGVtIChleGVjdXRlKT1cImVkaXROb2RlKClcIj5cbiAgICBFZGl0IE5vZGUuLi5cbiAgPC9uZy10ZW1wbGF0ZT5cbjwvY29udGV4dC1tZW51PlxuXG48Y29udGV4dC1tZW51ICNmaW5kQ3JlYXRlTm9kZXNDb250ZXh0TWVudT5cbiAgPG5nLXRlbXBsYXRlIGNvbnRleHRNZW51SXRlbSBsZXQtaXRlbSAoZXhlY3V0ZSk9XCJmaW5kTm9kZXMoKVwiPlxuICAgIFNlYXJjaCBOb2Rlcy4uLlxuICA8L25nLXRlbXBsYXRlPlxuICA8bmctdGVtcGxhdGUgY29udGV4dE1lbnVJdGVtIGxldC1pdGVtIChleGVjdXRlKT1cImNyZWF0ZU5vZGUoKVwiPlxuICAgIENyZWF0ZSBOb2RlLi4uXG4gIDwvbmctdGVtcGxhdGU+XG48L2NvbnRleHQtbWVudT5cblxuPGNvbnRleHQtbWVudSAjY3JlYXRlRWRpdExpbmtDb250ZXh0TWVudT5cbiAgPG5nLXRlbXBsYXRlIFt2aXNpYmxlXT1cImxpbmtzRG9Ob3RFeGlzdFwiIGNvbnRleHRNZW51SXRlbSBsZXQtaXRlbSAoZXhlY3V0ZSk9XCJjcmVhdGVMaW5rKClcIj5cbiAgICBDcmVhdGUgTGluay4uLlxuICA8L25nLXRlbXBsYXRlPlxuICA8bmctdGVtcGxhdGUgW3Zpc2libGVdPVwibGlua3NFeGlzdFwiIChleGVjdXRlKT1cImVkaXRMaW5rcygpXCIgY29udGV4dE1lbnVJdGVtIGxldC1pdGVtPlxuICAgIEVkaXQgTGlua3MuLi5cbiAgPC9uZy10ZW1wbGF0ZT5cbjwvY29udGV4dC1tZW51PlxuXG48Y29udGV4dC1tZW51ICNlZGl0TGlua0xhYmVsQ29udGV4dE1lbnU+XG4gIDxuZy10ZW1wbGF0ZSBjb250ZXh0TWVudUl0ZW0gbGV0LWl0ZW0gKGV4ZWN1dGUpPVwiZWRpdExpbmtMYWJlbCgpXCI+XG4gICAgRWRpdCBMaW5rIGxhYmVsLi4uXG4gIDwvbmctdGVtcGxhdGU+XG48L2NvbnRleHQtbWVudT4iXX0=