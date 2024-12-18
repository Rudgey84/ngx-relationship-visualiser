import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { ContextMenuComponent } from '@kreash/ngx-contextmenu';

@Component({
  selector: 'app-context-menus',
  templateUrl: './context-menus.component.html'
})
export class ContextMenusComponent {
  @ViewChild('viewNodeContextMenu') viewNodeContextMenu: ContextMenuComponent;
  @ViewChild('findNodesContextMenu') findNodesContextMenu: ContextMenuComponent;
  @ViewChild('createLinkContextMenu') createLinkContextMenu: ContextMenuComponent;
  @ViewChild('editLinkContextMenu') editLinkContextMenu: ContextMenuComponent;

  @Output() viewNodeContextMenuEvent = new EventEmitter<any>();
  @Output() findNodesContextMenuEvent = new EventEmitter<any>();
  @Output() createLinkContextMenuEvent = new EventEmitter<any>();
  @Output() editLinkContextMenuEvent = new EventEmitter<any>();
  @Output() editLinksContextMenuEvent = new EventEmitter<any>();

  viewNode() {
    this.viewNodeContextMenuEvent.emit(true);
  }

  findNodes() {
    this.findNodesContextMenuEvent.emit(true);
  }

  createLink() {
    this.createLinkContextMenuEvent.emit(true);
  }

  editLink() {
    this.editLinkContextMenuEvent.emit(true);
  }

  editLinks() {
    this.editLinksContextMenuEvent.emit(true);
  }

  public linksExist = (item: any): boolean => {
    const matchingLink = this.checkLinkBetweenSelectedNodes(item);
  
    if (matchingLink) {
      console.log("Link details:", matchingLink);
      return true;
    } else {
      console.log("No link exists between the selected nodes.");
      return false;
    }
  };

  public linksDoNotExist = (item: any): boolean => {
    const matchingLink = this.checkLinkBetweenSelectedNodes(item);
  
    if (!matchingLink) {
      console.log("No link exists between the selected nodes.");
      return true;
    } else {
      return false;
    }
  };
  

  private checkLinkBetweenSelectedNodes(payload) {
    const selectedNodes = payload.selectedNodes;
    const links = payload.graphData.links;

    const sourceId = selectedNodes[0].id;
    const targetId = selectedNodes[1].id;

    // Check for a link in both directions (source -> target or target -> source)
    const matchingLink = links.find(
      (link) =>
        (link.source === sourceId && link.target === targetId) ||
        (link.source === targetId && link.target === sourceId)
    );

    if (matchingLink) {
      return matchingLink;
    } else {
      return null;
    }
  }

}
