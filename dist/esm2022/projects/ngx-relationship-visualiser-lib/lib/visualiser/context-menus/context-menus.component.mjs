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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC1tZW51cy5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL2NvbnRleHQtbWVudXMvY29udGV4dC1tZW51cy5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItbGliL2xpYi92aXN1YWxpc2VyL2NvbnRleHQtbWVudXMvY29udGV4dC1tZW51cy5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZUFBZSxDQUFDOzs7QUFPM0UsTUFBTSxPQUFPLHFCQUFxQjtJQUNFLG1CQUFtQixDQUF1QjtJQUNuQywwQkFBMEIsQ0FBdUI7SUFDbEQseUJBQXlCLENBQXVCO0lBQ2pELHdCQUF3QixDQUF1QjtJQUU1RSx3QkFBd0IsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO0lBQ25ELCtCQUErQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7SUFDMUQsMEJBQTBCLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztJQUNyRCw2QkFBNkIsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO0lBQ3hELHlCQUF5QixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7SUFFdkQsbUJBQW1CLEdBQVEsSUFBSSxDQUFDO0lBRXZDLFFBQVE7UUFDTixJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxTQUFTO1FBQ1AsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsVUFBVTtRQUNSLElBQUksQ0FB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NEI7Z0JBQ0MseUJBQXlCO3NCQUFoRSxTQUFTO3VCQUFDLDJCQUEyQjtnQkFDQyx3QkFBd0I7c0JBQTlELFNBQVM7dUJBQUMsMEJBQTBCO2dCQUUzQix3QkFBd0I7c0JBQWpDLE1BQU07Z0JBQ0csK0JBQStCO3NCQUF4QyxNQUFNO2dCQUNHLDBCQUEwQjtzQkFBbkMsTUFBTTtnQkFDRyw2QkFBNkI7c0JBQXRDLE1BQU07Z0JBQ0cseUJBQXlCO3NCQUFsQyxNQUFNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBWaWV3Q2hpbGQsIE91dHB1dCwgRXZlbnRFbWl0dGVyIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb250ZXh0TWVudUNvbXBvbmVudCB9IGZyb20gJ0BrcmVhc2gvbmd4LWNvbnRleHRtZW51JztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnYXBwLWNvbnRleHQtbWVudXMnLFxuICB0ZW1wbGF0ZVVybDogJy4vY29udGV4dC1tZW51cy5jb21wb25lbnQuaHRtbCdcbn0pXG5leHBvcnQgY2xhc3MgQ29udGV4dE1lbnVzQ29tcG9uZW50IHtcbiAgQFZpZXdDaGlsZCgnZWRpdE5vZGVDb250ZXh0TWVudScpIGVkaXROb2RlQ29udGV4dE1lbnU6IENvbnRleHRNZW51Q29tcG9uZW50O1xuICBAVmlld0NoaWxkKCdmaW5kQ3JlYXRlTm9kZXNDb250ZXh0TWVudScpIGZpbmRDcmVhdGVOb2Rlc0NvbnRleHRNZW51OiBDb250ZXh0TWVudUNvbXBvbmVudDtcbiAgQFZpZXdDaGlsZCgnY3JlYXRlRWRpdExpbmtDb250ZXh0TWVudScpIGNyZWF0ZUVkaXRMaW5rQ29udGV4dE1lbnU6IENvbnRleHRNZW51Q29tcG9uZW50O1xuICBAVmlld0NoaWxkKCdlZGl0TGlua0xhYmVsQ29udGV4dE1lbnUnKSBlZGl0TGlua0xhYmVsQ29udGV4dE1lbnU6IENvbnRleHRNZW51Q29tcG9uZW50O1xuXG4gIEBPdXRwdXQoKSBlZGl0Tm9kZUNvbnRleHRNZW51RXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgQE91dHB1dCgpIGZpbmRDcmVhdGVOb2Rlc0NvbnRleHRNZW51RXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgQE91dHB1dCgpIGNyZWF0ZUxpbmtDb250ZXh0TWVudUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoKSBlZGl0TGlua0xhYmVsQ29udGV4dE1lbnVFdmVudCA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBAT3V0cHV0KCkgZWRpdExpbmtzQ29udGV4dE1lbnVFdmVudCA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuXG4gIHB1YmxpYyBjdXJyZW50TWF0Y2hpbmdMaW5rOiBhbnkgPSBudWxsO1xuXG4gIGVkaXROb2RlKCkge1xuICAgIHRoaXMuZWRpdE5vZGVDb250ZXh0TWVudUV2ZW50LmVtaXQodHJ1ZSk7XG4gIH1cblxuICBmaW5kTm9kZXMoKSB7XG4gICAgdGhpcy5maW5kQ3JlYXRlTm9kZXNDb250ZXh0TWVudUV2ZW50LmVtaXQoJ2ZpbmROb2RlcycpO1xuICB9XG5cbiAgY3JlYXRlTm9kZSgpIHtcbiAgICB0aGlzLmZpbmRDcmVhdGVOb2Rlc0NvbnRleHRNZW51RXZlbnQuZW1pdCgnY3JlYXRlTm9kZScpO1xuICB9XG5cbiAgY3JlYXRlTGluaygpIHtcbiAgICB0aGlzLmNyZWF0ZUxpbmtDb250ZXh0TWVudUV2ZW50LmVtaXQodHJ1ZSk7XG4gIH1cblxuICBlZGl0TGlua0xhYmVsKCkge1xuICAgIHRoaXMuZWRpdExpbmtMYWJlbENvbnRleHRNZW51RXZlbnQuZW1pdCh0cnVlKTtcbiAgfVxuXG4gIGVkaXRMaW5rcygpIHtcbiAgICBjb25zdCBwYXlsb2FkID0ge1xuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIGRhdGE6IHRoaXMuY3VycmVudE1hdGNoaW5nTGlua1xuICAgIH07XG4gICAgaWYgKHRoaXMuY3VycmVudE1hdGNoaW5nTGluaykge1xuICAgICAgdGhpcy5lZGl0TGlua3NDb250ZXh0TWVudUV2ZW50LmVtaXQocGF5bG9hZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybihcIk5vIG1hdGNoaW5nIGxpbmsgdG8gZWRpdC5cIik7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGxpbmtzRXhpc3QgPSAoaXRlbTogYW55KTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgbWF0Y2hpbmdMaW5rID0gdGhpcy5jaGVja0xpbmtCZXR3ZWVuU2VsZWN0ZWROb2RlcyhpdGVtKTtcblxuICAgIGlmIChtYXRjaGluZ0xpbmspIHtcbiAgICAgIHRoaXMuY3VycmVudE1hdGNoaW5nTGluayA9IG1hdGNoaW5nTGluaztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmN1cnJlbnRNYXRjaGluZ0xpbmsgPSBudWxsO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICBwdWJsaWMgbGlua3NEb05vdEV4aXN0ID0gKGl0ZW06IGFueSk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IG1hdGNoaW5nTGluayA9IHRoaXMuY2hlY2tMaW5rQmV0d2VlblNlbGVjdGVkTm9kZXMoaXRlbSk7XG5cbiAgICBpZiAoIW1hdGNoaW5nTGluaykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cblxuICBwcml2YXRlIGNoZWNrTGlua0JldHdlZW5TZWxlY3RlZE5vZGVzKHBheWxvYWQpIHtcbiAgICBpZiAoIXBheWxvYWQgfHwgIXBheWxvYWQuc2VsZWN0ZWROb2Rlcykge1xuICAgICAgY29uc29sZS53YXJuKFwiUGF5bG9hZCBvciBzZWxlY3RlZE5vZGVzIGlzIHVuZGVmaW5lZC5cIik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzZWxlY3RlZE5vZGVzID0gcGF5bG9hZC5zZWxlY3RlZE5vZGVzO1xuICAgIGNvbnN0IGxpbmtzID0gcGF5bG9hZC5ncmFwaERhdGEubGlua3M7XG5cbiAgICBjb25zdCBzb3VyY2VJZCA9IHNlbGVjdGVkTm9kZXNbMF0uaWQ7XG4gICAgY29uc3QgdGFyZ2V0SWQgPSBzZWxlY3RlZE5vZGVzWzFdLmlkO1xuXG4gICAgLy8gQ2hlY2sgZm9yIGEgbGluayBpbiBib3RoIGRpcmVjdGlvbnMgKHNvdXJjZSAtPiB0YXJnZXQgb3IgdGFyZ2V0IC0+IHNvdXJjZSlcbiAgICBjb25zdCBtYXRjaGluZ0xpbmsgPSBsaW5rcy5maW5kKFxuICAgICAgKGxpbmspID0+XG4gICAgICAgIChsaW5rLnNvdXJjZSA9PT0gc291cmNlSWQgJiYgbGluay50YXJnZXQgPT09IHRhcmdldElkKSB8fFxuICAgICAgICAobGluay5zb3VyY2UgPT09IHRhcmdldElkICYmIGxpbmsudGFyZ2V0ID09PSBzb3VyY2VJZClcbiAgICApO1xuXG4gICAgaWYgKG1hdGNoaW5nTGluaykge1xuICAgICAgcmV0dXJuIG1hdGNoaW5nTGluaztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbn1cbiIsIjxjb250ZXh0LW1lbnUgI2VkaXROb2RlQ29udGV4dE1lbnU+XG4gIDxuZy10ZW1wbGF0ZSBjb250ZXh0TWVudUl0ZW0gbGV0LWl0ZW0gKGV4ZWN1dGUpPVwiZWRpdE5vZGUoKVwiPlxuICAgIEVkaXQgTm9kZS4uLlxuICA8L25nLXRlbXBsYXRlPlxuPC9jb250ZXh0LW1lbnU+XG5cbjxjb250ZXh0LW1lbnUgI2ZpbmRDcmVhdGVOb2Rlc0NvbnRleHRNZW51PlxuICA8bmctdGVtcGxhdGUgY29udGV4dE1lbnVJdGVtIGxldC1pdGVtIChleGVjdXRlKT1cImZpbmROb2RlcygpXCI+XG4gICAgU2VhcmNoIE5vZGVzLi4uXG4gIDwvbmctdGVtcGxhdGU+XG4gIDxuZy10ZW1wbGF0ZSBjb250ZXh0TWVudUl0ZW0gbGV0LWl0ZW0gKGV4ZWN1dGUpPVwiY3JlYXRlTm9kZSgpXCI+XG4gICAgQ3JlYXRlIE5vZGUuLi5cbiAgPC9uZy10ZW1wbGF0ZT5cbjwvY29udGV4dC1tZW51PlxuXG48Y29udGV4dC1tZW51ICNjcmVhdGVFZGl0TGlua0NvbnRleHRNZW51PlxuICA8bmctdGVtcGxhdGUgW3Zpc2libGVdPVwibGlua3NEb05vdEV4aXN0XCIgY29udGV4dE1lbnVJdGVtIGxldC1pdGVtIChleGVjdXRlKT1cImNyZWF0ZUxpbmsoKVwiPlxuICAgIENyZWF0ZSBMaW5rLi4uXG4gIDwvbmctdGVtcGxhdGU+XG4gIDxuZy10ZW1wbGF0ZSBbdmlzaWJsZV09XCJsaW5rc0V4aXN0XCIgKGV4ZWN1dGUpPVwiZWRpdExpbmtzKClcIiBjb250ZXh0TWVudUl0ZW0gbGV0LWl0ZW0+XG4gICAgRWRpdCBMaW5rcy4uLlxuICA8L25nLXRlbXBsYXRlPlxuPC9jb250ZXh0LW1lbnU+XG5cbjxjb250ZXh0LW1lbnUgI2VkaXRMaW5rTGFiZWxDb250ZXh0TWVudT5cbiAgPG5nLXRlbXBsYXRlIGNvbnRleHRNZW51SXRlbSBsZXQtaXRlbSAoZXhlY3V0ZSk9XCJlZGl0TGlua0xhYmVsKClcIj5cbiAgICBFZGl0IExpbmsgbGFiZWwuLi5cbiAgPC9uZy10ZW1wbGF0ZT5cbjwvY29udGV4dC1tZW51PiJdfQ==