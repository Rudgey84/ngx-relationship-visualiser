# d3-relationship-visualiser

[View on StackBlitz ⚡️](https://stackblitz.com/edit/github-dzry6q-wtjc86)

A D3 directed-force-graph, implemented in Typescript, generates a visualisation graph with customisable link lengths and multiple labels between nodes. The graph can handle new data that will update lines, nodes, links, and path labels. Whenever new nodes are added, they will be animated with a pulse effect. Additionally, the graph includes features such as brushing (multiple select and drag), zoom, and panning capabilities.

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
