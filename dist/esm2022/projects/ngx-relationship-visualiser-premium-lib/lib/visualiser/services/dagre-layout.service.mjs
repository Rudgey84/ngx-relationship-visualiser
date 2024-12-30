import * as dagre from '@dagrejs/dagre';
import { Injectable } from '@angular/core';
import * as i0 from "@angular/core";
export var Orientation;
(function (Orientation) {
    Orientation["LEFT_TO_RIGHT"] = "LR";
    Orientation["RIGHT_TO_LEFT"] = "RL";
    Orientation["TOP_TO_BOTTOM"] = "TB";
    Orientation["BOTTOM_TO_TOP"] = "BT";
})(Orientation || (Orientation = {}));
export var Alignment;
(function (Alignment) {
    Alignment["CENTER"] = "C";
    Alignment["UP_LEFT"] = "UL";
    Alignment["UP_RIGHT"] = "UR";
    Alignment["DOWN_LEFT"] = "DL";
    Alignment["DOWN_RIGHT"] = "DR";
})(Alignment || (Alignment = {}));
export class DagreNodesOnlyLayout {
    defaultSettings = {
        orientation: Orientation.LEFT_TO_RIGHT,
        marginX: 70,
        marginY: 70,
        edgePadding: 200,
        rankPadding: 300,
        nodePadding: 100,
        curveDistance: 20,
        multigraph: true,
        compound: true,
        align: Alignment.UP_RIGHT,
        acyclicer: undefined,
        ranker: 'network-simplex',
    };
    dagreGraph;
    dagreNodes;
    dagreEdges;
    renderLayout(graph) {
        this.createDagreGraph(graph);
        dagre.layout(this.dagreGraph);
        for (const dagreNodeId in this.dagreGraph._nodes) {
            const dagreNode = this.dagreGraph._nodes[dagreNodeId];
            const node = graph.nodes.find((n) => n.id === dagreNode.id);
            if (node.fx === null && node.fy === null) {
                // Check if the node has any associated edges
                const hasAssociatedEdges = graph.links.some((link) => link.source === dagreNode.id || link.target === dagreNode.id);
                if (hasAssociatedEdges) {
                    node.fx = dagreNode.x;
                    node.fy = dagreNode.y;
                }
            }
            node.dimension = {
                width: dagreNode.width,
                height: dagreNode.height,
            };
        }
        return graph;
    }
    initRenderLayout(graph) {
        this.createDagreGraph(graph);
        dagre.layout(this.dagreGraph);
        let minFy = Infinity;
        for (const dagreNodeId in this.dagreGraph._nodes) {
            const dagreNode = this.dagreGraph._nodes[dagreNodeId];
            const node = graph.nodes.find((n) => n.id === dagreNode.id);
            // Check if the node has any associated edges
            const hasAssociatedEdges = graph.links.some((link) => link.source === dagreNode.id || link.target === dagreNode.id);
            if (hasAssociatedEdges) {
                node.fx = dagreNode.x;
                node.fy = dagreNode.y;
                minFy = Math.min(minFy, dagreNode.y - this.defaultSettings.marginY);
            }
            else {
                // Give them a null value to later random position them only when the layout button is pressed so they come into view
                node.fx = null;
                node.fy = null;
            }
            node.dimension = {
                width: dagreNode.width,
                height: dagreNode.height,
            };
        }
        // Adjust the fy values to start from 0 if there are associated edges
        if (minFy !== Infinity) {
            for (const node of graph.nodes) {
                if (node.fy !== null) {
                    node.fy -= minFy;
                }
            }
        }
        return graph;
    }
    createDagreGraph(graph) {
        const settings = Object.assign({}, this.defaultSettings);
        this.dagreGraph = new dagre.graphlib.Graph({
            compound: settings.compound,
            multigraph: settings.multigraph,
        });
        this.dagreGraph.setGraph({
            rankdir: settings.orientation,
            marginx: settings.marginX,
            marginy: settings.marginY,
            edgesep: settings.edgePadding,
            ranksep: settings.rankPadding,
            nodesep: settings.nodePadding,
            align: settings.align,
            acyclicer: settings.acyclicer,
            ranker: settings.ranker,
            multigraph: settings.multigraph,
            compound: settings.compound,
        });
        this.dagreNodes = graph.nodes.map((n) => {
            const node = Object.assign({}, n);
            node.width = 20;
            node.height = 20;
            node.x = n.fx;
            node.y = n.fy;
            return node;
        });
        this.dagreEdges = graph.links.map((l) => {
            const newLink = Object.assign({}, l);
            return newLink;
        });
        for (const node of this.dagreNodes) {
            if (!node.width) {
                node.width = 20;
            }
            if (!node.height) {
                node.height = 30;
            }
            // update dagre
            this.dagreGraph.setNode(node.id, node);
        }
        // update dagre
        for (const edge of this.dagreEdges) {
            if (settings.multigraph) {
                this.dagreGraph.setEdge(edge.source, edge.target, edge, edge.linkId);
            }
            else {
                this.dagreGraph.setEdge(edge.source, edge.target);
            }
        }
        return this.dagreGraph;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DagreNodesOnlyLayout, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DagreNodesOnlyLayout, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: DagreNodesOnlyLayout, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFncmUtbGF5b3V0LnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcmVsYXRpb25zaGlwLXZpc3VhbGlzZXItcHJlbWl1bS1saWIvbGliL3Zpc3VhbGlzZXIvc2VydmljZXMvZGFncmUtbGF5b3V0LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxLQUFLLEtBQUssTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDOztBQUUzQyxNQUFNLENBQU4sSUFBWSxXQUtYO0FBTEQsV0FBWSxXQUFXO0lBQ3JCLG1DQUFvQixDQUFBO0lBQ3BCLG1DQUFvQixDQUFBO0lBQ3BCLG1DQUFvQixDQUFBO0lBQ3BCLG1DQUFvQixDQUFBO0FBQ3RCLENBQUMsRUFMVyxXQUFXLEtBQVgsV0FBVyxRQUt0QjtBQUVELE1BQU0sQ0FBTixJQUFZLFNBTVg7QUFORCxXQUFZLFNBQVM7SUFDbkIseUJBQVksQ0FBQTtJQUNaLDJCQUFjLENBQUE7SUFDZCw0QkFBZSxDQUFBO0lBQ2YsNkJBQWdCLENBQUE7SUFDaEIsOEJBQWlCLENBQUE7QUFDbkIsQ0FBQyxFQU5XLFNBQVMsS0FBVCxTQUFTLFFBTXBCO0FBbUJELE1BQU0sT0FBTyxvQkFBb0I7SUFDL0IsZUFBZSxHQUFHO1FBQ2hCLFdBQVcsRUFBRSxXQUFXLENBQUMsYUFBYTtRQUN0QyxPQUFPLEVBQUUsRUFBRTtRQUNYLE9BQU8sRUFBRSxFQUFFO1FBQ1gsV0FBVyxFQUFFLEdBQUc7UUFDaEIsV0FBVyxFQUFFLEdBQUc7UUFDaEIsV0FBVyxFQUFFLEdBQUc7UUFDaEIsYUFBYSxFQUFFLEVBQUU7UUFDakIsVUFBVSxFQUFFLElBQUk7UUFDaEIsUUFBUSxFQUFFLElBQUk7UUFDZCxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVE7UUFDekIsU0FBUyxFQUFFLFNBQVM7UUFDcEIs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TSxHQUFHLEVBQUUsQ0FBQztZQUNuQixDQUFDO1lBRUQsZUFBZTtZQUNmLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELGVBQWU7UUFDZixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNuQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkUsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BELENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3pCLENBQUM7d0dBakpVLG9CQUFvQjs0R0FBcEIsb0JBQW9CLGNBRm5CLE1BQU07OzRGQUVQLG9CQUFvQjtrQkFIaEMsVUFBVTttQkFBQztvQkFDVixVQUFVLEVBQUUsTUFBTTtpQkFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBkYWdyZSBmcm9tICdAZGFncmVqcy9kYWdyZSc7XHJcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuXHJcbmV4cG9ydCBlbnVtIE9yaWVudGF0aW9uIHtcclxuICBMRUZUX1RPX1JJR0hUID0gJ0xSJyxcclxuICBSSUdIVF9UT19MRUZUID0gJ1JMJyxcclxuICBUT1BfVE9fQk9UVE9NID0gJ1RCJyxcclxuICBCT1RUT01fVE9fVE9QID0gJ0JUJyxcclxufVxyXG5cclxuZXhwb3J0IGVudW0gQWxpZ25tZW50IHtcclxuICBDRU5URVIgPSAnQycsXHJcbiAgVVBfTEVGVCA9ICdVTCcsXHJcbiAgVVBfUklHSFQgPSAnVVInLFxyXG4gIERPV05fTEVGVCA9ICdETCcsXHJcbiAgRE9XTl9SSUdIVCA9ICdEUicsXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRGFncmVTZXR0aW5ncyB7XHJcbiAgb3JpZW50YXRpb24/OiBPcmllbnRhdGlvbjtcclxuICBtYXJnaW5YPzogbnVtYmVyO1xyXG4gIG1hcmdpblk/OiBudW1iZXI7XHJcbiAgZWRnZVBhZGRpbmc/OiBudW1iZXI7XHJcbiAgcmFua1BhZGRpbmc/OiBudW1iZXI7XHJcbiAgbm9kZVBhZGRpbmc/OiBudW1iZXI7XHJcbiAgYWxpZ24/OiBBbGlnbm1lbnQ7XHJcbiAgYWN5Y2xpY2VyPzogJ2dyZWVkeSc7XHJcbiAgcmFua2VyPzogJ25ldHdvcmstc2ltcGxleCcgfCAndGlnaHQtdHJlZScgfCAnbG9uZ2VzdC1wYXRoJztcclxuICBtdWx0aWdyYXBoPzogYm9vbGVhbjtcclxuICBjb21wb3VuZD86IGJvb2xlYW47XHJcbn1cclxuXHJcbkBJbmplY3RhYmxlKHtcclxuICBwcm92aWRlZEluOiAncm9vdCcsXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBEYWdyZU5vZGVzT25seUxheW91dCB7XHJcbiAgZGVmYXVsdFNldHRpbmdzID0ge1xyXG4gICAgb3JpZW50YXRpb246IE9yaWVudGF0aW9uLkxFRlRfVE9fUklHSFQsXHJcbiAgICBtYXJnaW5YOiA3MCxcclxuICAgIG1hcmdpblk6IDcwLFxyXG4gICAgZWRnZVBhZGRpbmc6IDIwMCxcclxuICAgIHJhbmtQYWRkaW5nOiAzMDAsXHJcbiAgICBub2RlUGFkZGluZzogMTAwLFxyXG4gICAgY3VydmVEaXN0YW5jZTogMjAsXHJcbiAgICBtdWx0aWdyYXBoOiB0cnVlLFxyXG4gICAgY29tcG91bmQ6IHRydWUsXHJcbiAgICBhbGlnbjogQWxpZ25tZW50LlVQX1JJR0hULFxyXG4gICAgYWN5Y2xpY2VyOiB1bmRlZmluZWQsXHJcbiAgICByYW5rZXI6ICduZXR3b3JrLXNpbXBsZXgnLFxyXG4gIH07XHJcblxyXG4gIGRhZ3JlR3JhcGg6IGFueTtcclxuICBkYWdyZU5vZGVzOiBhbnk7XHJcbiAgZGFncmVFZGdlczogYW55O1xyXG5cclxuICBwdWJsaWMgcmVuZGVyTGF5b3V0KGdyYXBoKSB7XHJcbiAgICB0aGlzLmNyZWF0ZURhZ3JlR3JhcGgoZ3JhcGgpO1xyXG4gICAgZGFncmUubGF5b3V0KHRoaXMuZGFncmVHcmFwaCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBkYWdyZU5vZGVJZCBpbiB0aGlzLmRhZ3JlR3JhcGguX25vZGVzKSB7XHJcbiAgICAgIGNvbnN0IGRhZ3JlTm9kZSA9IHRoaXMuZGFncmVHcmFwaC5fbm9kZXNbZGFncmVOb2RlSWRdO1xyXG4gICAgICBjb25zdCBub2RlID0gZ3JhcGgubm9kZXMuZmluZCgobikgPT4gbi5pZCA9PT0gZGFncmVOb2RlLmlkKTtcclxuXHJcbiAgICAgIGlmIChub2RlLmZ4ID09PSBudWxsICYmIG5vZGUuZnkgPT09IG51bGwpIHtcclxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbm9kZSBoYXMgYW55IGFzc29jaWF0ZWQgZWRnZXNcclxuICAgICAgICBjb25zdCBoYXNBc3NvY2lhdGVkRWRnZXMgPSBncmFwaC5saW5rcy5zb21lKFxyXG4gICAgICAgICAgKGxpbmspID0+IGxpbmsuc291cmNlID09PSBkYWdyZU5vZGUuaWQgfHwgbGluay50YXJnZXQgPT09IGRhZ3JlTm9kZS5pZFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgaWYgKGhhc0Fzc29jaWF0ZWRFZGdlcykge1xyXG4gICAgICAgICAgbm9kZS5meCA9IGRhZ3JlTm9kZS54O1xyXG4gICAgICAgICAgbm9kZS5meSA9IGRhZ3JlTm9kZS55O1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgbm9kZS5kaW1lbnNpb24gPSB7XHJcbiAgICAgICAgd2lkdGg6IGRhZ3JlTm9kZS53aWR0aCxcclxuICAgICAgICBoZWlnaHQ6IGRhZ3JlTm9kZS5oZWlnaHQsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGdyYXBoO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGluaXRSZW5kZXJMYXlvdXQoZ3JhcGgpIHtcclxuICAgIHRoaXMuY3JlYXRlRGFncmVHcmFwaChncmFwaCk7XHJcbiAgICBkYWdyZS5sYXlvdXQodGhpcy5kYWdyZUdyYXBoKTtcclxuICAgIGxldCBtaW5GeSA9IEluZmluaXR5O1xyXG4gICAgZm9yIChjb25zdCBkYWdyZU5vZGVJZCBpbiB0aGlzLmRhZ3JlR3JhcGguX25vZGVzKSB7XHJcbiAgICAgIGNvbnN0IGRhZ3JlTm9kZSA9IHRoaXMuZGFncmVHcmFwaC5fbm9kZXNbZGFncmVOb2RlSWRdO1xyXG4gICAgICBjb25zdCBub2RlID0gZ3JhcGgubm9kZXMuZmluZCgobikgPT4gbi5pZCA9PT0gZGFncmVOb2RlLmlkKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHRoZSBub2RlIGhhcyBhbnkgYXNzb2NpYXRlZCBlZGdlc1xyXG4gICAgICBjb25zdCBoYXNBc3NvY2lhdGVkRWRnZXMgPSBncmFwaC5saW5rcy5zb21lKFxyXG4gICAgICAgIChsaW5rKSA9PiBsaW5rLnNvdXJjZSA9PT0gZGFncmVOb2RlLmlkIHx8IGxpbmsudGFyZ2V0ID09PSBkYWdyZU5vZGUuaWRcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmIChoYXNBc3NvY2lhdGVkRWRnZXMpIHtcclxuICAgICAgICBub2RlLmZ4ID0gZGFncmVOb2RlLng7XHJcbiAgICAgICAgbm9kZS5meSA9IGRhZ3JlTm9kZS55O1xyXG4gICAgICAgIG1pbkZ5ID0gTWF0aC5taW4obWluRnksIGRhZ3JlTm9kZS55IC0gdGhpcy5kZWZhdWx0U2V0dGluZ3MubWFyZ2luWSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gR2l2ZSB0aGVtIGEgbnVsbCB2YWx1ZSB0byBsYXRlciByYW5kb20gcG9zaXRpb24gdGhlbSBvbmx5IHdoZW4gdGhlIGxheW91dCBidXR0b24gaXMgcHJlc3NlZCBzbyB0aGV5IGNvbWUgaW50byB2aWV3XHJcbiAgICAgICAgbm9kZS5meCA9IG51bGw7XHJcbiAgICAgICAgbm9kZS5meSA9IG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIG5vZGUuZGltZW5zaW9uID0ge1xyXG4gICAgICAgIHdpZHRoOiBkYWdyZU5vZGUud2lkdGgsXHJcbiAgICAgICAgaGVpZ2h0OiBkYWdyZU5vZGUuaGVpZ2h0LFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkanVzdCB0aGUgZnkgdmFsdWVzIHRvIHN0YXJ0IGZyb20gMCBpZiB0aGVyZSBhcmUgYXNzb2NpYXRlZCBlZGdlc1xyXG4gICAgaWYgKG1pbkZ5ICE9PSBJbmZpbml0eSkge1xyXG4gICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgZ3JhcGgubm9kZXMpIHtcclxuICAgICAgICBpZiAobm9kZS5meSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgbm9kZS5meSAtPSBtaW5GeTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZ3JhcGg7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgY3JlYXRlRGFncmVHcmFwaChncmFwaCk6IGFueSB7XHJcbiAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZGVmYXVsdFNldHRpbmdzKTtcclxuICAgIHRoaXMuZGFncmVHcmFwaCA9IG5ldyBkYWdyZS5ncmFwaGxpYi5HcmFwaCh7XHJcbiAgICAgIGNvbXBvdW5kOiBzZXR0aW5ncy5jb21wb3VuZCxcclxuICAgICAgbXVsdGlncmFwaDogc2V0dGluZ3MubXVsdGlncmFwaCxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5kYWdyZUdyYXBoLnNldEdyYXBoKHtcclxuICAgICAgcmFua2Rpcjogc2V0dGluZ3Mub3JpZW50YXRpb24sXHJcbiAgICAgIG1hcmdpbng6IHNldHRpbmdzLm1hcmdpblgsXHJcbiAgICAgIG1hcmdpbnk6IHNldHRpbmdzLm1hcmdpblksXHJcbiAgICAgIGVkZ2VzZXA6IHNldHRpbmdzLmVkZ2VQYWRkaW5nLFxyXG4gICAgICByYW5rc2VwOiBzZXR0aW5ncy5yYW5rUGFkZGluZyxcclxuICAgICAgbm9kZXNlcDogc2V0dGluZ3Mubm9kZVBhZGRpbmcsXHJcbiAgICAgIGFsaWduOiBzZXR0aW5ncy5hbGlnbixcclxuICAgICAgYWN5Y2xpY2VyOiBzZXR0aW5ncy5hY3ljbGljZXIsXHJcbiAgICAgIHJhbmtlcjogc2V0dGluZ3MucmFua2VyLFxyXG4gICAgICBtdWx0aWdyYXBoOiBzZXR0aW5ncy5tdWx0aWdyYXBoLFxyXG4gICAgICBjb21wb3VuZDogc2V0dGluZ3MuY29tcG91bmQsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmRhZ3JlTm9kZXMgPSBncmFwaC5ub2Rlcy5tYXAoKG4pID0+IHtcclxuICAgICAgY29uc3Qgbm9kZTogYW55ID0gT2JqZWN0LmFzc2lnbih7fSwgbik7XHJcbiAgICAgIG5vZGUud2lkdGggPSAyMDtcclxuICAgICAgbm9kZS5oZWlnaHQgPSAyMDtcclxuICAgICAgbm9kZS54ID0gbi5meDtcclxuICAgICAgbm9kZS55ID0gbi5meTtcclxuICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmRhZ3JlRWRnZXMgPSBncmFwaC5saW5rcy5tYXAoKGwpID0+IHtcclxuICAgICAgY29uc3QgbmV3TGluazogYW55ID0gT2JqZWN0LmFzc2lnbih7fSwgbCk7XHJcbiAgICAgIHJldHVybiBuZXdMaW5rO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZm9yIChjb25zdCBub2RlIG9mIHRoaXMuZGFncmVOb2Rlcykge1xyXG4gICAgICBpZiAoIW5vZGUud2lkdGgpIHtcclxuICAgICAgICBub2RlLndpZHRoID0gMjA7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKCFub2RlLmhlaWdodCkge1xyXG4gICAgICAgIG5vZGUuaGVpZ2h0ID0gMzA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHVwZGF0ZSBkYWdyZVxyXG4gICAgICB0aGlzLmRhZ3JlR3JhcGguc2V0Tm9kZShub2RlLmlkLCBub2RlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyB1cGRhdGUgZGFncmVcclxuICAgIGZvciAoY29uc3QgZWRnZSBvZiB0aGlzLmRhZ3JlRWRnZXMpIHtcclxuICAgICAgaWYgKHNldHRpbmdzLm11bHRpZ3JhcGgpIHtcclxuICAgICAgICB0aGlzLmRhZ3JlR3JhcGguc2V0RWRnZShlZGdlLnNvdXJjZSwgZWRnZS50YXJnZXQsIGVkZ2UsIGVkZ2UubGlua0lkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmRhZ3JlR3JhcGguc2V0RWRnZShlZGdlLnNvdXJjZSwgZWRnZS50YXJnZXQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuZGFncmVHcmFwaDtcclxuICB9XHJcbn1cclxuIl19