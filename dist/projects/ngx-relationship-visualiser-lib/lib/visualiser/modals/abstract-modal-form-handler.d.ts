import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { Link, Node } from '../../models/data.interface';
export declare abstract class AbstractModalFormHandler {
    protected fb: FormBuilder;
    createLinkForm: FormGroup;
    createNodeForm: FormGroup;
    fontAwesomeIcons: {
        id: number;
        name: string;
        icon: string;
    }[];
    constructor(fb: FormBuilder);
    get labelArray(): FormArray;
    get nodeLabelArray(): FormArray;
    addLabel(): void;
    addNodeLabel(): void;
    removeLabel(index: number): void;
    removeNodeLabel(index: number): void;
    protected resetLinksForm(): void;
    protected resetNodeForm(): void;
    protected populateEditLinkForm(data: Link): void;
    protected populateEditNodeForm(data: Node): void;
    private iconOrImageValidator;
    private minLengthArray;
}
