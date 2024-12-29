import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { ContextMenuComponent } from '@kreash/ngx-contextmenu';

@Component({
  selector: 'app-context-menus',
  templateUrl: './context-menus.component.html'
})
export class ContextMenusComponent {
  @ViewChild('editNodeContextMenu') editNodeContextMenu: ContextMenuComponent;
  @ViewChild('findCreateNodesContextMenu') findCreateNodesContextMenu: ContextMenuComponent;
  @ViewChild('createEditLinkContextMenu') createEditLinkContextMenu: ContextMenuComponent;
  @ViewChild('editLinkLabelContextMenu') editLinkLabelContextMenu: ContextMenuComponent;

  @Output() editNodeContextMenuEvent = new EventEmitter<any>();
  @Output() findCreateNodesContextMenuEvent = new EventEmitter<any>();
  @Output() createLinkContextMenuEvent = new EventEmitter<any>();
  @Output() editLinkLabelContextMenuEvent = new EventEmitter<any>();
  @Output() editLinksContextMenuEvent = new EventEmitter<any>();

  public currentMatchingLink: any = null;

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
    } else {
      console.warn("No matching link to edit.");
    }
  }

  public linksExist = (item: any): boolean => {
    const matchingLink = this.checkLinkBetweenSelectedNodes(item);

    if (matchingLink) {
      this.currentMatchingLink = matchingLink;
      return true;
    } else {
      this.currentMatchingLink = null;
      return false;
    }
  };

  public linksDoNotExist = (item: any): boolean => {
    const matchingLink = this.checkLinkBetweenSelectedNodes(item);

    if (!matchingLink) {
      return true;
    } else {
      return false;
    }
  };


  private checkLinkBetweenSelectedNodes(payload) {
    if (!payload || !payload.selectedNodes) {
      console.warn("Payload or selectedNodes is undefined.");
      return null;
    }

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