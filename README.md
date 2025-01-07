# ngx-relationship-visualiser

![ngx-realtionship-visualier-logo_400w](https://github.com/user-attachments/assets/a5e55520-673f-4fd4-b33e-976a2ad32ffc)

A D3 force-directed-graph, implemented in Typescript for Angular, generates a visualisation graph with customisable link lengths and multiple labels between nodes. The graph can handle new data that will update lines, nodes, links, and path labels. Whenever new nodes are added, they will be animated with a pulse effect. Additionally, the graph includes features such as brushing (multiple select and drag), zoom, and panning capabilities. Additional features include the ability to make multiple selections in sync with the brushing functionality by using Ctrl + click and drag the cursor.

## Live Demos

[Video Demo](https://github.com/user-attachments/assets/074f942a-3351-42df-ac39-c07e612db412)

Live Demo [ngx-relationship-visualiser](https://rudgey84.github.io/ngx-relationship-visualiser/)

Playground [ngx-relationship-visualiser StackBlitz playground](https://stackblitz.com/edit/ngx-relationship-visualiser)

Live Demo Premium [ngx-relationship-visualiser-premium](https://rudgey84.github.io/ngx-relationship-visualiser-premium/)

The premium version can be [procured through privjs](https://www.privjs.com/packages/ngx-relationship-visualiser-premium).

## [Premium Only] - Creating, editing and deleting

Context menus appear when right-clicking/double clicking on nodes and links, providing access to edit or create the nodes or links through the opening of modals. Here the user will also be given the option to delete and node or link.
  
When two nodes are selected that **are not** currently linked, upon right-clicking/double clicking one of the selected nodes you will be given the option to create a link between the two where you will be provided with a form to complete with an option to delete.

When two nodes are selected that **are** already linked, upon right-clicking/double clicking one of the selected nodes you will be given the option to edit the link between the two, where you will be presented with a prepopulated form to edit with an option to delete.

When right-clicking/double clicking a link label that appears between two linked nodes you will be given the option to quickly update the link label. This can also be done when editing a link between nodes in the step above.

When right-clicking/double clicking on the canvas you will be presented with two items, to either create a new node, where a form will appear to complete. The other option is to perform a node search. Upon a successful search the node will focus into view and be highlighted.

When right-clicking/double clicking on a single node, you will be presented with an option to open up a prepopulated form to edit the node with an option to delete.

## [Premium Only] - Toolbar

The toolbar can be dragged to any part of the canvas for convenience.

**Dagre Layout** - button will trigger a best fit Dagre layout.  

**Save Data** - button will save graph data and output the payload.

**Reset Data** - button will revert the positions of nodes back to the last saved event.

**Zoom in** - button will zoom in on the canvas.

**Zoom out** - button will zoom out on the canvas.

**Zoom reset** - button will zoom back to the default zoom level.

**Zoom to fit** - button will show all nodes on the graph for a best fit.

**Select all** - button will select all nodes.

**Invert selection** - button will select all the nodes that are not currently selected.

**Search** - Button will initilise a dropdown to run a node search. Any found nodes will be highlighted and panned to. If there is more than one match, the search has a forward and back button to go to every matched node.

The premium version can be [procured through privjs](https://www.privjs.com/packages/ngx-relationship-visualiser-premium).


## Installation

Install ngx-relationship-visualiser with npm

```bash
  npm install ngx-relationship-visualiser --save
```

Add the package to NgModule imports:

```bash
import { NgxRelationshipVisualiserModule } from 'ngx-relationship-visualiser';

@NgModule({
  ...
  imports: [NgxRelationshipVisualiserModule],
  ...
})
```

Add the component to your page:
```bash
<visualiser-graph
  [data]="mockedData"
  [readOnly]="false" //Premium Only 
  [zoom]="true"
  [controls]="true" //Premium Only
  [zoomToFit]="false"
  (saveGraphDataEvent)="saveGraphData($event)"
></visualiser-graph>
``` 
## Usage/Examples

```bash
[data]=""
```

This is the data recieved from a backend service that updates the graph asynchronously. The graph uses its own db for quicker updates. Example data below. 

```bash
[readOnly]="true/false"
```
[**Premium Only**] Enables/Disables right click interactions that allow for node and link create and edits.

```bash
[zoom]="true/false"
```
Enables/Disables zoom functionailty either by zoom button visibilty and mouse wheel.

```bash
[controls]="true/false"
```
[**Premium Only**] Enables/Disables visibilty of the control panel for graph interactions.

```bash
[zoomToFit]="true/false
```
Brings all nodes into view if true for a best fit on Graph initilisation, there is a button for this in premium.

```bash
(saveGraphDataEvent)="yourHandle($event)"
```
Outputs the payload below upon graph save.


#### data.interface.ts 

```bash
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
```

#### Example Data

```bash
export const MOCKEDDATA: Data = {
  dataId: '1234',
  nodes: [
    {
      id: '123',
      label: ['John Doe', '01/01/1970'],
      imageUrl: '',
      icon: '\uf007',
      fx: 1000,
      fy: 400,
      additionalIcon: '\uf3a5',
    },
    {
      id: '456',
      label: ['Richard Hill', '14/05/1982'],
      imageUrl: 'https://randomuser.me/api/portraits/thumb/men/99.jpg',
      icon: '',
      fx: 332,
      fy: 684,
      additionalIcon: '',
    },
    {
      id: '789',
      label: ['Rick Smith', 'Software Developer'],
      imageUrl: 'https://randomuser.me/api/portraits/thumb/men/21.jpg',
      icon: '',
      fx: 55,
      fy: 60,
      additionalIcon: '\uf2dc',
    },
    {
      id: '4',
      label: ['James Jones', 'BA'],
      imageUrl: 'https://randomuser.me/api/portraits/thumb/men/9.jpg',
      icon: '',
      fx: 414,
      fy: 369,
      additionalIcon: '',
    },
    {
      id: '423',
      label: ['Aston Villa', 'Football Club', 'Founded 1874'],
      imageUrl: 'https://houseofv.ghost.io/content/images/2024/01/GC72JKwWwAAuyGk.png',
      icon: '',
      fx: 313,
      fy: 255,
      additionalIcon: '\uf1e3',
    },
  ],
  links: [
    {
      source: '123',
      target: '456',
      lineStyle: 'Dotted',
      sourceArrow: false,
      targetArrow: true,
      linkId: '123_456',
      relationships: [
        {
          labelIndex: 0,
          label: 'Worked at IBM',
          source: '123',
          target: '456',
          linkIcon: true,
        },
        {
          labelIndex: 1,
          label: 'Both in same scrum team',
          source: '123',
          target: '456',
          linkIcon: true,
        },
      ],
    },
    {
      source: '456',
      target: '789',
      lineStyle: 'Solid',
      sourceArrow: true,
      targetArrow: true,
      linkId: '456_789',
      relationships: [
        {
          labelIndex: 2,
          label: 'Play in the same football team',
          source: '456',
          target: '789',
          linkIcon: false,
        },
        {
          labelIndex: 3,
          label: 'Daughters in the same class at school',
          source: '456',
          target: '789',
          linkIcon: true,
        },
        {
          labelIndex: 4,
          label: 'Went on a family holiday together last year',
          source: '456',
          target: '789',
          linkIcon: false,
        },
      ],
    },
    {
      source: '789',
      target: '123',
      lineStyle: 'Dotted',
      sourceArrow: true,
      targetArrow: true,
      linkId: '789_123',
      relationships: [
        {
          labelIndex: 5,
          label: 'Drink in the same pub',
          source: '789',
          target: '123',
          linkIcon: true,
        },
        {
          labelIndex: 6,
          label: 'Drinking friends',
          source: '789',
          target: '123',
          linkIcon: false,
        },
      ],
    },
    {
      source: '4',
      target: '123',
      lineStyle: 'Dotted',
      sourceArrow: true,
      targetArrow: false,
      linkId: '4_123',
      relationships: [
        {
          labelIndex: 7,
          label: ['Same University'],
          source: '4',
          target: '123',
          linkIcon: true,
        },
      ],
    },
  ],
};
```

An external imageUrl can be set for a node OR an icon can be set using Font Awesome Unicodes e.g. \uf2dc. In [**Premium Only**], a user will be able to select an icon from a dropdown so these codes won't need to be known.

## Summary of controls:

1. Clicking on a node or link selects it and de-selects everything else.
2. Ctrlkey + clicking on nodes selects up to two nodes, this toggles their selection status and leaves all other nodes as they are. Having selected two nodes an option to create a link between them now exists.(See point 5)
3. To select multiple nodes at once, hold down the shiftkey and click and drag the cursor to create a selection area. All nodes within the area will be selected and can be moved simultaneously by dragging any selected node. Clicking away from a node will deselect all selected nodes.
4. To select and drag an unselected node, simply click and drag it. This will deselect all other nodes.

5. When new graph data is added, new nodes are identified and animated for 3 seconds
6. Zooming is available using the mouse wheel, which focuses on the location of the pointer on the graph. Panning is available by clicking the canvas and dragging in the desired direction.
7. A save button to position the nodes' fx/fy coordinates. 
8. [**Premium Only**] A reset button allows the user to reset the graph to its previous fx/fy positions, provided the user has not saved any changes made to the node layout.
9. [**Premium Only**] Right-clicking or double clicking brings up various context menu options:

- Right-clicking on the canvas displays its own menu
- Right-clicking or double clicking on a single node displays options for that node
- Right-clicking or double clicking on a single link displays options for that link
- Right-clicking on a node after selecting at least two nodes using the method in point 2 displays options for creating a link between the selected nodes.
10. [**Premium Only**] Zoom controls are provided to enable zooming in and out of the graph without relying on the mouse scroll wheel. Additionally, a zoom reset button is available to quickly return to the default zoom level.
11. [**Premium Only**] To provide an overview of all nodes in a single canvas view, a "fit to zoom" button is included. This feature helps the user visualize the entire graph at once.
12. [**Premium Only**] The graph also includes buttons for selecting all nodes or toggling the selection of nodes that are not already selected. Similarly, there is a button to toggle the selection of nodes that are currently selected, deselecting them if they were already selected.
13. [**Premium Only**] The toolbar includes a search function that allows users to search for nodes based on their label text. The search will only consider matches that have a minimum of three characters. If no nodes are found matching the search criteria, a message will be displayed to inform the user.
14. [**Premium Only**] Dagre layout - the layout will be applied on first initialsation of the graph render. A dagre graph can only render positions for nodes with associated links. Therefore, nodes with a previous fx/fy cooridinate will be honoured and that nodes position will be fixed regardless of if that node hasnt an associted link/edge. The initial layout will only apply to those nodes and links without a fx/fy value i.e. null.
\
After applying the dagre layout following initialization(by clicking the button), nodes and links that previously had fx/fy values will be replaced with new dagre coordinates. Nodes that do not have any associated links will have their values set to null, resulting in these nodes being randomly positioned within the visible area of the canvas. It's worth noting that at any time after activating the new layout, users can reset to the original values as long as the save button was not used previously. 

## License

[MIT](https://choosealicense.com/licenses/mit/)


## 🔗 Links

[![linkedin](https://img.shields.io/badge/linkedin-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tomrudge)

