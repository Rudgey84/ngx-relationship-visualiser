# d3-relationship-visualiser

[View on StackBlitz ⚡️](https://stackblitz.com/edit/github-dzry6q-wtjc86)

To summarise:

1. Clicking on a node or link selects it and de-selects everything else.
2. Ctrl + clicking on nodes selects up to two nodes, this toggles their selection status and leaves all other nodes as they are. Having selected two nodes an option to create a link between them now exists.(See point 5)
3. To select multiple nodes at once, hold down the s-key and click and drag the cursor to create a selection area. All nodes within the area will be selected and can be moved simultaneously by dragging any selected node. Clicking away from a node will deselect all selected nodes. 
4. To select and drag an unselected node, simply click and drag it. This will deselect all other nodes.
5. Right-clicking brings up various context menu options:
- Right-clicking on the canvas displays its own menu
- Right-clicking on a single node displays options for that node
- Right-clicking on a single link displays options for that link
- Right-clicking on a node after selecting at least two nodes using the method in point 2 displays options for creating a link between the selected nodes.
6. When new graph data is added, new nodes are identified and animated for 3 seconds
7. Zooming is available using the mouse wheel, which focuses on the location of the pointer on the graph. Panning is available by clicking the canvas and dragging in the desired direction.





