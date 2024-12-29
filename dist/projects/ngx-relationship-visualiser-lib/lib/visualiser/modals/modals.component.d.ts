import { EventEmitter, TemplateRef, OnChanges, SimpleChanges } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { FormBuilder } from '@angular/forms';
import { AbstractModalFormHandler } from './abstract-modal-form-handler';
import { Link, Node } from '../../models/data.interface';
import * as i0 from "@angular/core";
export declare class ModalsComponent extends AbstractModalFormHandler implements OnChanges {
    private modalService;
    editNodeData: any;
    editLinksData: any;
    closeModalEvent: EventEmitter<string>;
    createLinkEvent: EventEmitter<Link>;
    createNodeEvent: EventEmitter<Node>;
    deleteLinkEvent: EventEmitter<any>;
    deleteNodeEvent: EventEmitter<any>;
    editNodeModal: TemplateRef<any>;
    createNodeModal: TemplateRef<any>;
    createLinkModal: TemplateRef<any>;
    editLinksModal: TemplateRef<any>;
    modalRef?: BsModalRef;
    readonly defaultModalConfig: {
        class: string;
    };
    fontAwesomeIcons: {
        id: number;
        name: string;
        icon: string;
    }[];
    loading: boolean;
    iconsBuffer: any[];
    numberOfItemsFromEndBeforeFetchingMore: number;
    bufferSize: number;
    constructor(modalService: BsModalService, fb: FormBuilder);
    ngOnChanges(changes: SimpleChanges): void;
    openModal(template: TemplateRef<any>): any;
    closeModal(modalRef: string): void;
    createLink(): void;
    createNode(): void;
    deleteNode(): void;
    deleteLink(): void;
    clearImageUrl(): void;
    trackByFn(item: any): any;
    onScrollToEnd(): void;
    onScroll({ end }: {
        end: any;
    }): void;
    private fetchMore;
    static ɵfac: i0.ɵɵFactoryDeclaration<ModalsComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<ModalsComponent, "app-modals", never, { "editNodeData": { "alias": "editNodeData"; "required": false; }; "editLinksData": { "alias": "editLinksData"; "required": false; }; }, { "closeModalEvent": "closeModalEvent"; "createLinkEvent": "createLinkEvent"; "createNodeEvent": "createNodeEvent"; "deleteLinkEvent": "deleteLinkEvent"; "deleteNodeEvent": "deleteNodeEvent"; }, never, never, false, never>;
}
