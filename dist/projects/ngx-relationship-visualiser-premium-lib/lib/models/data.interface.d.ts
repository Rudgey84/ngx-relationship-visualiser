export interface Relationship {
    labelIndex: number;
    label: string | string[];
    source: string;
    target: string;
    linkIcon: boolean;
}
export interface Link {
    source: string;
    target: string;
    lineStyle: string;
    sourceArrow: boolean;
    targetArrow: boolean;
    linkId: string;
    relationships: Relationship[];
}
export interface Node {
    id: string;
    label: string[];
    imageUrl: string;
    icon: string;
    fx: number | null;
    fy: number | null;
    additionalIcon: string;
}
export interface Data {
    dataId: string;
    nodes: Node[];
    links: Link[];
}
