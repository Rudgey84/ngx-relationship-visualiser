import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { ContextMenuComponent } from 'ngx-contextmenu';

@Component({
  selector: 'app-context-menus',
  templateUrl: './context-menus.component.html',
  styleUrls: ['./context-menus.component.scss'],
})
export class ContextMenusComponent {
  @ViewChild('nodeContextMenu') nodeContextMenu: ContextMenuComponent;
  @ViewChild('canvasContextMenu') canvasContextMenu: ContextMenuComponent;
  @ViewChild('createLinkContextMenu')
  createLinkContextMenu: ContextMenuComponent;
  @ViewChild('editLinkContextMenu') editLinkContextMenu: ContextMenuComponent;

  @Output() entityDetailsContextMenuEvent = new EventEmitter<any>();
  @Output() findEntityContextMenuEvent = new EventEmitter<any>();
  @Output() createLinkContextMenuEvent = new EventEmitter<any>();
  @Output() editLinkContextMenuEvent = new EventEmitter<any>();

  showEntityDetails() {
    this.entityDetailsContextMenuEvent.emit(true);
  }
  findEntity() {
    this.findEntityContextMenuEvent.emit(true);
  }
  createLink() {
    this.createLinkContextMenuEvent.emit(true);
  }

  editLink() {
    this.editLinkContextMenuEvent.emit(true);
  }
}
