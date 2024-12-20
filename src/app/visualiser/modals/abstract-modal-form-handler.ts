import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

export abstract class AbstractModalFormHandler {
  createLinkForm: FormGroup;
  createNodeForm: FormGroup;

  constructor(protected fb: FormBuilder) {
    this.createLinkForm = this.fb.group({
      lineStyle: ['Unconfirmed', Validators.required],
      sourceArrow: [false],
      targetArrow: [false],
      label: this.fb.array([], Validators.required),
    });

    this.createNodeForm = this.fb.group({
      label: this.fb.array([], Validators.required),
      icon: ['', Validators.required],
      linkStrength: [false],
    });
  }

  get labelArray(): FormArray {
    return this.createLinkForm.get('label') as FormArray;
  }

  get nodeLabelArray(): FormArray {
    return this.createNodeForm.get('label') as FormArray;
  }

  public addLabel() {
    const labelGroup = this.fb.group({
      label: ['', Validators.required],
      linkStrength: [false],
    });
    this.labelArray.push(labelGroup);
  }

  public addNodeLabel() {
    const labelGroup = this.fb.group({
      label: ['', Validators.required],
    });
    this.nodeLabelArray.push(labelGroup);
  }

  public removeLabel(index: number) {
    if (this.labelArray.length > 0) {
      this.labelArray.removeAt(index);
    }
  }

  public removeNodeLabel(index: number) {
    if (this.nodeLabelArray.length > 0) {
      this.nodeLabelArray.removeAt(index);
    }
  }

  protected resetForm() {
    this.createLinkForm.reset({
      lineStyle: 'Unconfirmed',
      sourceArrow: false,
      targetArrow: false,
      label: this.fb.array([]),
    });
    this.labelArray.clear();
  }

  protected resetNodeForm() {
    this.createNodeForm.reset({
      label: this.fb.array([]),
      icon: '',
      linkStrength: false,
    });
    this.nodeLabelArray.clear();
  }

  protected populateEditLinkForm(data: any) {
    this.createLinkForm.patchValue({
      lineStyle: data.lineStyle,
      sourceArrow: data.sourceArrow,
      targetArrow: data.targetArrow
    });

    if (data.relationships) {
      data.relationships.forEach((relationship) => {
        const labelGroup = this.fb.group({
          linkIndex: relationship.linkIndex,
          label: [relationship.label, Validators.required],
          linkStrength: relationship.linkStrength
        });
        this.labelArray.push(labelGroup);
      });
    }
  }
}
