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

  linkForm: FormGroup;

  constructor(private modalService: BsModalService, private fb: FormBuilder) {}

  ngOnInit() {
    this.linkForm = this.fb.group({
      lineStyle: ['Confirmed', Validators.required],
      sourceArrow: [false],
      targetArrow: [true],
      label: this.fb.array([
        this.fb.control('test', Validators.required),
        this.fb.control('Another Test', Validators.required)
      ]),
      linkStrength: [false]
    });
  }

  get labelArray(): FormArray {
    return this.linkForm.get('label') as FormArray;
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
    if (this.linkForm.valid) {
      this.createLinkEvent.emit(this.linkForm.value);
      this.closeModal('modalRef');
    }
  }
}
