import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { ContextMenuComponent } from '@perfectmemory/ngx-contextmenu';

@Component({
  selector: 'app-context-menus',
  templateUrl: './context-menus.component.html',
  styleUrls: ['./context-menus.component.scss']
})
export class ContextMenusComponent {
  @ViewChild('viewNodeContextMenu') viewNodeContextMenu: ContextMenuComponent<any>;
  @ViewChild('canvasContextMenu') canvasContextMenu: ContextMenuComponent<any>;
  @ViewChild('createLinkContextMenu')
  createLinkContextMenu: ContextMenuComponent<any>;
  @ViewChild('viewLinkContextMenu') viewLinkContextMenu: ContextMenuComponent<any>;

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
