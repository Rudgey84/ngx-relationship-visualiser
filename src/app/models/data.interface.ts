// data.interface.ts

export interface Relationship {
    label: string | string[];
    lineStyle: string;
    source: string;
    sourceArrow: boolean;
    target: string;
    targetArrow: boolean;
    attachedToAuthorisedIRs: boolean;
    attachedToUnauthorisedIRs: boolean;
  }
  
  export interface Link {
    source: string;
    target: string;
    label: string[];
    lineStyle: string;
    sourceArrow: boolean;
    targetArrow: boolean;
    linkId: string;
    relationships: Relationship[];
  }
  
  export interface Node {
    id: string;
    version: number;
    label: string[];
    icon: string;
    xpos: number;
    ypos: number;
    x: number;
    y: number;
    fx: number | null;
    fy: number | null;
    attachedToAuthorisedIRs: boolean;
    attachedToUnauthorisedIRs: boolean;
  }
  
  export interface Data {
    irUrn: string;
    nodes: Node[];
    links: Link[];
  }
  