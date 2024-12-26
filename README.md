# ngx-relationship-visualiser

[View on StackBlitz ⚡️](https://stackblitz.com/~/github.com/Rudgey84/d3-visualiser)

A D3 force-directed-graph, implemented in Typescript, generates a visualisation graph with customisable link lengths and multiple labels between nodes. The graph can handle new data that will update lines, nodes, links, and path labels. Whenever new nodes are added, they will be animated with a pulse effect. Additionally, the graph includes features such as brushing (multiple select and drag), zoom, and panning capabilities. Additional features include the ability to make multiple selections in sync with the brushing functionality by using Ctrl + click. Context menus can be customized and appear when right-clicking on nodes and links, providing access to parent data and opening their own modals. The graph incorporates a dagre layout when it is initialized, and this layout can also be triggered on demand by clicking a button. Additionally, there are several other buttons and tools available to enhance the user experience of the graph. 

To summarise:

1. Clicking on a node or link selects it and de-selects everything else.
2. Ctrlkey + clicking on nodes selects up to two nodes, this toggles their selection status and leaves all other nodes as they are. Having selected two nodes an option to create a link between them now exists.(See point 5)
3. To select multiple nodes at once, hold down the shiftkey and click and drag the cursor to create a selection area. All nodes within the area will be selected and can be moved simultaneously by dragging any selected node. Clicking away from a node will deselect all selected nodes.
4. To select and drag an unselected node, simply click and drag it. This will deselect all other nodes.
5. Right-clicking brings up various context menu options:

- Right-clicking on the canvas displays its own menu
- Right-clicking on a single node displays options for that node
- Right-clicking on a single link displays options for that link
- Right-clicking on a node after selecting at least two nodes using the method in point 2 displays options for creating a link between the selected nodes.

6. When new graph data is added, new nodes are identified and animated for 3 seconds
7. Zooming is available using the mouse wheel, which focuses on the location of the pointer on the graph. Panning is available by clicking the canvas and dragging in the desired direction.
8. A save button to position the nodes' fx/fy coordinates. Another button allows the user to reset the graph to its previous fx/fy positions, provided the user has not saved any changes made to the node layout.
9. Zoom controls are provided to enable zooming in and out of the graph without relying on the mouse scroll wheel. Additionally, a zoom reset button is available to quickly return to the default zoom level.
10. To provide an overview of all nodes in a single canvas view, a "fit to zoom" button is included. This feature helps the user visualize the entire graph at once.
11. The graph also includes buttons for selecting all nodes or toggling the selection of nodes that are not already selected. Similarly, there is a button to toggle the selection of nodes that are currently selected, deselecting them if they were already selected.
12. The toolbar includes a search function that allows users to search for nodes based on their label text. The search will only consider matches that have a minimum of three characters. If no nodes are found matching the search criteria, a message will be displayed to inform the user.
13. Dagre layout - the layout will be applied on first initialsation of the graph render. A dagre graph can only render positions for nodes with associated links/edges. Therefore, nodes with a previous fx/fy cooridinate will be honoured and that nodes position will be fixed regardless of if that node hasnt an associted link/edge. The initial layout will only apply to those nodes and links/edges without a fx/fy value i.e. null.

After applying the dagre layout following initialization(clicking the button), nodes and edges/links that previously had fx/fy values will be replaced with new dagre coordinates. Nodes that do not have any associated edges or links will have their values set to null, resulting in these nodes being randomly positioned within the visible area of the canvas. It's worth noting that at any time after activating the new layout, users can reset to the original values as long as the save button was not used in the meantime. 