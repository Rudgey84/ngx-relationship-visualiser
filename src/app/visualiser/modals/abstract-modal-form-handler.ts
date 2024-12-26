import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Link, Relationship, Node } from '../../models/data.interface';
import fontAwesomeIcons from '../../models/font-awesome-icons';

export abstract class AbstractModalFormHandler {
  createLinkForm: FormGroup;
  createNodeForm: FormGroup;
  public fontAwesomeIcons = fontAwesomeIcons;

  constructor(protected fb: FormBuilder) {
    this.createLinkForm = this.fb.group({
      lineStyle: ['Unconfirmed', Validators.required],
      sourceArrow: [false],
      targetArrow: [false],
      label: this.fb.array([], Validators.required),
    });

    this.createNodeForm = this.fb.group({
      id: '',
      label: this.fb.array([], Validators.required),
      icon: ['', Validators.required],
      fx: [null],
      fy: [null],
      additionalIcon: [''],
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

  protected resetLinksForm() {
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
      additionalIcon: false,
    });
    this.nodeLabelArray.clear();
  }

  protected populateEditLinkForm(data: Link) {
    this.createLinkForm.patchValue({
      lineStyle: data.lineStyle,
      sourceArrow: data.sourceArrow,
      targetArrow: data.targetArrow
    });

    if (data.relationships && Array.isArray(data.relationships)) {
      data.relationships.forEach((relationship: Relationship) => {
        const labelGroup = this.fb.group({
          linkIndex: [relationship.linkIndex, Validators.required],
          label: [relationship.label, Validators.required],
          linkStrength: [relationship.linkStrength]
        });
        this.labelArray.push(labelGroup);
      });
    }
  }

  protected populateEditNodeForm(data: Node) {
    this.createNodeForm.patchValue({
      id: data.id,
      icon: data.icon,
      fx: data.fx,
      fy: data.fy,
      additionalIcon: data.additionalIcon,
    });

    this.createNodeForm.setControl('label', this.fb.array(
      data.label.map(label => this.fb.group({ label: [label, Validators.required] }))
    ));
  }
}
