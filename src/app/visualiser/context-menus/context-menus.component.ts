import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { ContextMenuComponent } from '@kreash/ngx-contextmenu';

@Component({
  selector: 'app-context-menus',
  templateUrl: './context-menus.component.html'
})
export class ContextMenusComponent {
  @ViewChild('viewNodeContextMenu') viewNodeContextMenu: ContextMenuComponent;
  @ViewChild('canvasContextMenu') canvasContextMenu: ContextMenuComponent;
  @ViewChild('createLinkContextMenu') createLinkContextMenu: ContextMenuComponent;
  @ViewChild('viewLinkContextMenu') viewLinkContextMenu: ContextMenuComponent;

  @Output() viewNodeContextMenuEvent = new EventEmitter<any>();
  @Output() findEntityContextMenuEvent = new EventEmitter<any>();
  @Output() createLinkContextMenuEvent = new EventEmitter<any>();
  @Output() viewLinkContextMenuEvent = new EventEmitter<any>();

  viewNode() {
    this.viewNodeContextMenuEvent.emit(true);
  }

  findEntity() {
    this.findEntityContextMenuEvent.emit(true);
  }
  
  createLink() {
    this.createLinkContextMenuEvent.emit(true);
  }

  viewLink() {
    this.viewLinkContextMenuEvent.emit(true);
  }
}
