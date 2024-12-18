import { Component, Input, Output, EventEmitter, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-modals',
  templateUrl: './modals.component.html',
})
export class ModalsComponent implements OnInit {
  @Input() selectedNodeId: string;
  @Input() selectedLinkArray: any[];
  @Input() editLinksData: any;
  @Output() closeModalEvent = new EventEmitter<string>();
  @Output() createLinkEvent = new EventEmitter<any>();
  @ViewChild('viewNodeModal') viewNodeModal: TemplateRef<any>;
  @ViewChild('createLinkModal') createLinkModal: TemplateRef<any>;
  @ViewChild('editLinkLabelModal') editLinkLabelModal: TemplateRef<any>;
  @ViewChild('editLinksModal') editLinksModal: TemplateRef<any>;
  public modalRef?: BsModalRef;
  readonly defaultModalConfig = { class: 'modal-xl' };

  createLinkForm: FormGroup;

  constructor(private modalService: BsModalService, private fb: FormBuilder) {}

  ngOnInit() {
    this.createLinkForm = this.fb.group({
      lineStyle: ['Unconfirmed', Validators.required],
      sourceArrow: [false],
      targetArrow: [false],
      label: this.fb.array([]),
      linkStrength: [false]
    });
  }

  get labelArray(): FormArray {
    return this.createLinkForm.get('label') as FormArray;
  }

  public addLabel() {
    this.labelArray.push(this.fb.control('', Validators.required));
  }

  public removeLabel(index: number) {
    this.labelArray.removeAt(index);
  }

  public openModal(
    template: TemplateRef<any>
  ) {
    if (!template) {
      console.error('Template is required to open a modal.');
      return null;
    }
    this.modalRef = this.modalService.show(template, this.defaultModalConfig);
  }

  public closeModal(modalRef: string): void {
    if (this[modalRef]) {
      this[modalRef].hide();
    }
  }

  public createLink(): void {
    if (this.createLinkForm.valid) {
      this.createLinkEvent.emit(this.createLinkForm.value);

      this.createLinkForm.reset({
        lineStyle: 'Unconfirmed',
        sourceArrow: false,
        targetArrow: false,
        label: [],
        linkStrength: false
      });

      this.closeModal('modalRef');
    }
  }
}
