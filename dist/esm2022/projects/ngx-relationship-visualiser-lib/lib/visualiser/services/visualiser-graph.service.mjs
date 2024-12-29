import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Subject, ReplaySubject } from 'rxjs';
import * as i0 from "@angular/core";
import * as i1 from "../../db/graphDatabase";
export class VisualiserGraphService {
    dexieService;
    constructor(dexieService) {
        this.dexieService = dexieService;
    }
    links = [];
    nodes = [];
    gBrush = null;
    brushMode = false;
    brushing = false;
    shiftKey;
    extent = null;
    zoom = false;
    zoomToFit = false;
    resetSearch;
    /** RxJS subject to listen for updates of the selection */
    selectedNodesArray = new Subject();
    dblClickNodePayload = new Subject();
    dblClickLinkPayload = new Subject();
    selectedLinkArray = new Subject();
    saveGraphData = new ReplaySubject();
    update(data, element, zoom, zoomToFit) {
        const svg = d3.select(element);
        this.zoom = zoom;
        this.zoomToFit = zoomToFit;
        return this._update(d3, svg, data);
    }
    ticked(link, node, edgepaths) {
        link.each(function (d, i, n) {
            // Total difference in x and y from source to target
            let diffX = d.target.x - d.source.x;
            let diffY = d.target.y - d.source.y;
            // Length of path from center of source node to center of target node
            let pathLength = Math.sqrt(diffX * diffX + diffY * diffY);
            // x and y distances from center to outside edge of target node
            let offsetX = (diffX * 40) / pathLength;
            let offsetY = (diffY * 40) / pathLength;
            d3.select(n[i])
                .attr('x1', d.source.x + offsetX)
                .attr('y1', d.source.y + offsetY)
                .attr('x2', d.target.x - offsetX)
                .attr('y2', d.target.y - offsetY);
        });
        node.attr('transform', function (d) {
            return `translate(${d.x}, ${d.y + 50})`;
        });
        // Sets a boundry for the nodes
        // node.attr('cx', function (d) {
        //   return (d.x = Math.max(40, Math.min(900 - 15, d.x)));
        // });
        // node.attr('cy', function (d) {
        //   return (d.y = Math.max(50, Math.min(600 - 40, d.y)));
        // });
        edgepaths.attr('d', function (d) {
            return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`;
        });
        edgepaths.attr('transform', function (d) {
            if (d.target.x < d.source.x) {
                const bbox = this.getBBox();
                const rx = bbox.x + bbox.width / 2;
                const ry = bbox.y + bbox.height / 2;
                return `rotate(180 ${rx} ${ry})`;
            }
            else {
                return 'rotate(0)';
            }
        });
    }
    initDefinitions(svg) {
        const defs = svg.append('defs');
        function createMarker(id, refX, path) {
            defs
                .append('marker')
                .attr('id', id)
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', refX)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', path)
                .attr('fill', '#b4b4b4')
                .style('stroke', 'none');
        }
        createMarker('arrowheadTarget', 0, 'M 0,-5 L 10 ,0 L 0,5');
        createMarker('arrowheadSource', 2, 'M 10 -5 L 0 0 L 10 5');
        return svg;
    }
    forceSimulation(_d3, { width, height }) {
        return _d3
            .forceSimulation()
            .velocityDecay(0.1)
            .force('link', _d3
            .forceLink()
            .id(function (d) {
            return d.id;
        })
            .distance(500)
            .strength(1))
            .force('charge', _d3.forceManyBody().strength(0.1))
            .force('center', _d3.forceCenter(width / 2, height / 2))
            .force('collision', _d3.forceCollide().radius(15));
    }
    compareAndMarkNodesNew(nodes, old_nodes) {
        // Create a map of ids to node objects for the old_nodes array
        const oldMap = old_nodes.reduce((map, node) => {
            map[node.id] = node;
            return map;
        }, {});
        // Check each node in the nodes array to see if it's new or not
        nodes.forEach((node) => {
            if (!oldMap[node.id]) {
                // Node is new, mark it with the newItem property
                node.newItem = true;
                // Remove the dagre coordinates from new nodes so we can set a random one in view
                node.fx = null;
                node.fy = null;
            }
        });
        return nodes;
    }
    removeNewItem(nodes) {
        for (const node of nodes) {
            if (node.hasOwnProperty('newItem')) {
                delete node.newItem;
            }
        }
        return nodes;
    }
    randomiseNodePositions(nodeData, width, height) {
        let minDistance = 100;
        const availableSpace = width * height;
        let adjustedRequiredSpace = nodeData.length * minDistance * minDistance;
        if (adjustedRequiredSpace > availableSpace) {
            while (adjustedRequiredSpace > availableSpace && minDistance > 0) {
                minDistance -= 10;
                adjustedRequiredSpace = nodeData.length * minDistance * minDistance;
            }
            if (adjustedRequiredSpace > availableSpace) {
                throw new Error('Not enough space to accommodate all nodes without a fixed position.');
            }
        }
        nodeData.forEach((node) => {
            if (node.fx === null && node.fy === null) {
                let currentMinDistance = minDistance;
                let canPlaceNode = false;
                while (!canPlaceNode && currentMinDistance > 0) {
                    node.fx = crypto.getRandomValues(new Uint32Array(1))[0] % width;
                    node.fy = crypto.getRandomValues(new Uint32Array(1))[0] % height;
                    canPlaceNode = !nodeData.some((otherNode) => {
                        if (otherNode.fx === null ||
                            otherNode.fy === null ||
                            otherNode === node) {
                            return false;
                        }
                        const dx = otherNode.fx - node.fx;
                        const dy = otherNode.fy - node.fy;
                        return Math.sqrt(dx * dx + dy * dy) < currentMinDistance;
                    });
                    if (!canPlaceNode) {
                        currentMinDistance--;
                    }
                }
                if (!canPlaceNode) {
                    throw new Error('Not enough space to accommodate all nodes without a fixed position.');
                }
            }
        });
        return nodeData;
    }
    async _update(_d3, svg, data) {
        const { nodes, links } = data;
        this.nodes = nodes || [];
        this.links = links || [];
        // Disable the reset btn
        let resetBtn = document.getElementById('reset_graph');
        let saveBtn = document.getElementById('save_graph');
        if (resetBtn) {
            resetBtn.setAttribute('disabled', 'true');
            saveBtn.setAttribute('disabled', 'true');
        }
        // Width/Height of canvas
        const parentWidth = _d3.select('svg').node().parentNode.clientWidth;
        const parentHeight = _d3.select('svg').node().parentNode.clientHeight;
        // Check to see if nodes are in Dexie
        const oldData = await this.dexieService.getGraphData('nodes');
        const oldNodes = oldData ? oldData.nodes : [];
        if (Array.isArray(oldNodes)) {
            // Compare and set property for new nodes
            this.nodes = this.compareAndMarkNodesNew(nodes, oldNodes);
            // Remove old nodes from Dexie
            await this.dexieService.deleteGraphData('nodes');
            // Add new nodes to Dexie
            await this.dexieService.saveGraphData({ dataId: 'nodes', nodes: data.nodes, links: data.links });
        }
        else {
            // Add first set of nodes to Dexie
            await this.dexieService.saveGraphData({ dataId: 'nodes', nodes: data.nodes, links: data.links });
        }
        // If nodes don't have a fx/fy coordinate we generate a random one - dagre nodes without links and new nodes added to canvas have null coordinates by design
        this.nodes = this.randomiseNodePositions(this.nodes, parentWidth, parentHeight);
        // Getting parents lineStyle and adding it to child objects
        const relationshipsArray = this.links.map(({ lineStyle, targetArrow, sourceArrow, relationships }) => relationships.map((r) => ({
            parentLineStyle: lineStyle,
            parentSourceArrow: sourceArrow,
            parentTargetArrow: targetArrow,
            ...r,
        })));
        // Adding dy value based on link number and position in parent
        relationshipsArray.map((linkRelationship) => {
            linkRelationship.map((linkObject, i) => {
                // dy increments of 15px
                linkObject['dy'] = 20 + i * 15;
            });
        });
        // IE11 does not like .flat
        this.links = relationshipsArray.reduce((acc, val) => acc.concat(val), []);
        d3.select('svg').append('g');
        // Zoom Start
        const zoomContainer = _d3.select('svg g');
        let currentZoom = d3.zoomTransform(d3.select('svg').node());
        const updateZoomLevel = () => {
            const currentScale = currentZoom.k;
            const maxScale = zoom.scaleExtent()[1];
            const zoomPercentage = ((currentScale - 0.5) / (maxScale - 0.5)) * 200;
            const zoomLevelDisplay = document.getElementById('zoom_level');
            const zoomLevelText = `Zoom: ${zoomPercentage.toFixed(0)}%`;
            const zoomInBtn = document.getElementById('zoom_in');
            const zoomOutBtn = document.getElementById('zoom_out');
            const zoomResetBtn = document.getElementById('zoom_reset');
            // It might not exist depending on the this.zoom boolean
            if (zoomResetBtn) {
                zoomResetBtn.setAttribute('disabled', 'true');
            }
            // Check if the zoom level has changed before updating the display / allows for panning without showing the zoom percentage
            if (zoomLevelDisplay && zoomLevelDisplay.innerHTML !== zoomLevelText) {
                zoomLevelDisplay.innerHTML = zoomLevelText;
                zoomLevelDisplay.style.opacity = '1';
                setTimeout(() => {
                    if (zoomLevelDisplay) {
                        zoomLevelDisplay.style.opacity = '0';
                    }
                }, 2000);
            }
            // Disable the zoomInBtn if the zoom level is at 200%
            if (zoomInBtn) {
                if (zoomPercentage === 200) {
                    zoomInBtn.setAttribute('disabled', 'true');
                }
                else {
                    zoomInBtn.removeAttribute('disabled');
                }
            }
            // Disable the zoomOutBtn if the zoom level is at 0%
            if (zoomOutBtn) {
                if (zoomPercentage === 0) {
                    zoomOutBtn.setAttribute('disabled', 'true');
                }
                else {
                    zoomOutBtn.removeAttribute('disabled');
                }
            }
            // Disable the zoomResetBtn if the zoom level is at 100%
            if (zoomResetBtn) {
                if (zoomPercentage === 100) {
                    zoomResetBtn.setAttribute('disabled', 'true');
                }
                else {
                    zoomResetBtn.removeAttribute('disabled');
                }
            }
        };
        let zoomedInit;
        const zoomed = () => {
            const transform = d3.event.transform;
            zoomContainer.attr('transform', `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
            currentZoom = transform;
            zoomedInit = true;
            updateZoomLevel();
        };
        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 1.5])
            .on('start', function () {
            d3.select(this).style('cursor', this.zoom ? null : 'grabbing');
        })
            .on('zoom', this.zoom ? zoomed : null)
            .on('end', function () {
            d3.select(this).style('cursor', 'grab');
        });
        svg
            .call(zoom)
            .style('cursor', 'grab')
            .on(this.zoom ? null : 'wheel.zoom', null)
            .on('dblclick.zoom', null);
        zoom.filter(() => !d3.event.shiftKey);
        // Zoom button controls
        d3.select('#zoom_in').on('click', function () {
            zoom.scaleBy(svg.transition().duration(750), 1.2);
            updateZoomLevel();
        });
        d3.select('#zoom_out').on('click', function () {
            zoom.scaleBy(svg.transition().duration(750), 0.8);
            updateZoomLevel();
        });
        d3.select('#zoom_reset').on('click', function () {
            zoom.scaleTo(svg.transition().duration(750), 1);
            updateZoomLevel();
        });
        // Zoom to fit function and Button
        const handleZoomToFit = () => {
            const nodeBBox = zoomContainer.node().getBBox();
            // Calculate scale and translate values to fit all nodes
            const padding = 30;
            const scaleX = (parentWidth - padding * 2) / nodeBBox.width;
            const scaleY = (parentHeight - padding * 2) / nodeBBox.height;
            const scale = Math.min(scaleX, scaleY, 1.0); // Restrict scale to a maximum of 1.0
            const translateX = -nodeBBox.x * scale + (parentWidth - nodeBBox.width * scale) / 2;
            const translateY = -nodeBBox.y * scale + (parentHeight - nodeBBox.height * scale) / 2;
            // Get the bounding box of all nodes
            const allNodes = zoomContainer.selectAll('.node-wrapper');
            const allNodesBBox = allNodes.nodes().reduce((acc, node) => {
                const nodeBBox = node.getBBox();
                acc.x = Math.min(acc.x, nodeBBox.x);
                acc.y = Math.min(acc.y, nodeBBox.y);
                acc.width = Math.max(acc.width, nodeBBox.x + nodeBBox.width);
                acc.height = Math.max(acc.height, nodeBBox.y + nodeBBox.height);
                return acc;
            }, { x: Infinity, y: Infinity, width: -Infinity, height: -Infinity });
            // Check if all nodes are within the viewable container
            if (allNodesBBox.x * scale >= 0 &&
                allNodesBBox.y * scale >= 0 &&
                allNodesBBox.width * scale <= parentWidth &&
                allNodesBBox.height * scale <= parentHeight) {
                // All nodes are within the viewable container, no need to apply zoom transform
                return;
            }
            // Manually reset the zoom transform
            zoomContainer
                .transition()
                .duration(750)
                .attr('transform', 'translate(0, 0) scale(1)');
            // Apply zoom transform to zoomContainer
            zoomContainer
                .transition()
                .duration(750)
                .attr('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
            // Update the currentZoom variable with the new transform
            // zoomedInit - created because if zoomToFit is called before anything else it screws up the base transform - e.g. showCurrentMatch
            if (zoomedInit) {
                currentZoom.x = translateX;
                currentZoom.y = translateY;
                currentZoom.k = scale;
            }
            updateZoomLevel();
        };
        d3.select('#zoom_to_fit').on('click', handleZoomToFit);
        // Check if zoom level is at 0% or 100% before allowing mousewheel zoom - this stabilises the canvas when the limit is reached
        svg.on('wheel', () => {
            const currentScale = currentZoom.k;
            const maxScale = zoom.scaleExtent()[1];
            const minScale = zoom.scaleExtent()[0];
            if (currentScale === maxScale || currentScale === minScale) {
                d3.event.preventDefault();
            }
        });
        // Zoom End
        // Selection buttons
        const selectAllNodes = document.getElementById('select_all');
        const handleSelectAllNodes = () => {
            const totalSize = nodeEnter.size();
            const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
            const count = nonSelectedNodes.size();
            const notSelectedSize = totalSize - count;
            if (notSelectedSize !== totalSize) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                selectAllNodes.style.opacity = '0.65';
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = true);
                });
                d3.selectAll('.nodeText')
                    .style('fill', (d) => (d.selected ? 'blue' : '#999'))
                    .style('font-weight', (d) => (d.selected ? 700 : 400));
            }
            else {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
                _d3.selectAll('.node-wrapper').classed('selected', false);
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    return (p.selected = p.previouslySelected = false);
                });
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 400)
                    .style('fill', '#212529');
            }
            // reset link style
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
        };
        d3.select('#select_all').on('click', handleSelectAllNodes);
        const handleToggleSelection = () => {
            const totalSize = nodeEnter.size();
            const selectedNodes = d3.selectAll('.node-wrapper.selected');
            const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
            const selectedCount = selectedNodes.size();
            const nonSelectedCount = nonSelectedNodes.size();
            if (selectedCount > 0) {
                // Deselect selected nodes and select non-selected nodes
                selectedNodes.classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = false);
                });
                nonSelectedNodes.classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = true);
                });
                // If there are only two nodes selected we need to update the subject selectedNodesArray so we can create a new link with the correct nodes attached.
                const selectedSize = svg.selectAll('.selected').size();
                if (selectedSize <= 2) {
                    // get data from node
                    const localselectedNodesArray = _d3.selectAll('.selected').data();
                    const filterId = localselectedNodesArray.filter((x) => x);
                    self.selectedNodesArray.next(filterId);
                }
                // Update styles of node elements
                _d3
                    .selectAll('.nodeText')
                    .style('fill', (d) => (d.selected ? 'blue' : '#212529'))
                    .style('font-weight', (d) => (d.selected ? 700 : 400));
            }
            else if (nonSelectedCount > 0) {
                // Select all nodes if none are selected
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = true);
                });
                // Update styles of node elements
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 700)
                    .style('fill', 'blue');
            }
            // Update the state of another button based on the current selection
            const updatedSelectedCount = selectedCount > 0 ? totalSize - selectedCount : totalSize;
            if (updatedSelectedCount === totalSize) {
                // Update the state of another button if all nodes are selected
                selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                selectAllNodes.style.opacity = '0.65';
            }
            else {
                // Update the state of another button if not all nodes are selected
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
            // reset link style
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
        };
        d3.select('#toggle_selection').on('click', handleToggleSelection);
        // search
        const searchBtn = document.getElementById('searchButton');
        // Check to see if exists - control bool
        if (searchBtn) {
            const searchInput = document.getElementById('searchInput');
            const clearButton = document.getElementById('clearButton');
            const handleSearch = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    performSearch();
                }
            };
            let matchingNodes = [];
            let currentMatchIndex = -1;
            const showCurrentMatch = () => {
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                const matchingNode = matchingNodes[currentMatchIndex];
                // Highlight the matching node
                const nodeWrapper = d3.selectAll('.node-wrapper').filter(function () {
                    return d3.select(this).attr('id') === matchingNode.id;
                });
                // Add a new background circle to the entire <g> node
                const bbox = nodeWrapper.node().getBBox();
                const centerX = bbox.x + bbox.width / 2;
                const centerY = bbox.y + bbox.height / 2;
                const radius = Math.max(bbox.width + 30, bbox.height) / 2;
                const backgroundCircle = nodeWrapper
                    .insert('circle', ':first-child')
                    .attr('class', 'highlight-background')
                    .attr('fill', 'yellow')
                    .attr('opacity', '0.3')
                    .attr('cx', centerX)
                    .attr('cy', centerY);
                // Animate the background circle
                backgroundCircle
                    .transition()
                    .duration(1000)
                    .attr('r', radius)
                    .transition()
                    .duration(1000)
                    .attr('r', radius / 4)
                    .attr('opacity', '0.5')
                    .transition()
                    .duration(1000)
                    .attr('r', radius)
                    .attr('opacity', '0.3');
                // Zoom to the matching node
                const zoomTransform = d3.zoomTransform(svg.node());
                const { x, y, k } = zoomTransform;
                const { fx, fy } = matchingNode;
                const newZoomTransform = d3.zoomIdentity
                    .translate(-fx * k + parentWidth / 2, -fy * k + parentHeight / 2)
                    .scale(k);
                zoomContainer
                    .transition()
                    .duration(750)
                    .call(zoom.transform, newZoomTransform);
                // Disable/Enable navigation buttons
                const prevButton = document.getElementById('prevButton');
                const nextButton = document.getElementById('nextButton');
                prevButton.disabled = currentMatchIndex === 0;
                nextButton.disabled = currentMatchIndex === matchingNodes.length - 1;
            };
            const performSearch = () => {
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                const searchTerm = searchInput.value.toLowerCase().trim();
                if (searchTerm.length >= 3) {
                    // Perform the search
                    matchingNodes = this.nodes.filter((node) => {
                        const label = node.label.map((item) => item.toLowerCase());
                        return (label.some((labelItem) => labelItem.includes(searchTerm)) ||
                            node.label.some((obj) => Object.values(obj).some((value) => String(value).toLowerCase().includes(searchTerm))));
                    });
                    if (matchingNodes.length > 0) {
                        currentMatchIndex = 0;
                        showCurrentMatch();
                    }
                    else {
                        currentMatchIndex = -1;
                        showNoMatches();
                    }
                }
                else {
                    // Clear search
                    matchingNodes = [];
                    currentMatchIndex = -1;
                    showNoMatches();
                }
                updateClearButton();
            };
            const showNoMatches = () => {
                // Reset zoom level
                const newZoomTransform = d3.zoomIdentity.translate(0, 0).scale(1);
                zoomContainer
                    .transition()
                    .duration(750)
                    .call(zoom.transform, newZoomTransform);
                updateZoomLevel();
                // Disable navigation buttons
                const prevButton = document.getElementById('prevButton');
                const nextButton = document.getElementById('nextButton');
                prevButton.disabled = true;
                nextButton.disabled = true;
                // Show "no matches found" text with fade-in transition
                const noMatchesText = document.getElementById('noMatchesText');
                if (searchInput.value !== '') {
                    noMatchesText.classList.add('show');
                    // Fade away after a few seconds
                    setTimeout(() => {
                        // Hide "no matches found" text with fade-out transition
                        noMatchesText.classList.remove('show');
                    }, 3000);
                }
            };
            const navigateNext = () => {
                if (currentMatchIndex < matchingNodes.length - 1) {
                    currentMatchIndex++;
                    showCurrentMatch();
                }
            };
            const navigatePrevious = () => {
                if (currentMatchIndex > 0) {
                    currentMatchIndex--;
                    showCurrentMatch();
                }
            };
            const clearSearchInput = () => {
                searchInput.value = '';
                searchInput.focus();
                updateClearButton();
                matchingNodes = [];
                currentMatchIndex = -1;
                // Remove any previously added background circle
                d3.selectAll('circle.highlight-background').remove();
                // Disable the nextButton & prevButton
                const nextButton = document.getElementById('nextButton');
                nextButton.disabled = true;
                const prevButton = document.getElementById('prevButton');
                prevButton.disabled = true;
            };
            const updateClearButton = () => {
                clearButton.disabled = searchInput.value.trim().length === 0;
            };
            // We reset the search when we reset the data
            if (this.resetSearch) {
                clearSearchInput();
                this.resetSearch = false;
            }
            searchInput.addEventListener('input', updateClearButton);
            searchBtn.addEventListener('click', performSearch);
            clearButton.addEventListener('click', clearSearchInput);
            document
                .getElementById('searchInput')
                .addEventListener('keydown', handleSearch);
            document
                .getElementById('nextButton')
                .addEventListener('click', navigateNext);
            document
                .getElementById('prevButton')
                .addEventListener('click', navigatePrevious);
        }
        // For arrows
        this.initDefinitions(svg);
        const simulation = this.forceSimulation(_d3, {
            width: +svg.attr('width'),
            height: +svg.attr('height'),
        });
        // Brush Start
        let gBrushHolder = svg.append('g');
        let brush = d3
            .brush()
            .on('start', () => {
            this.brushing = true;
            nodeEnter.each((d) => {
                d.previouslySelected = this.shiftKey && d.selected;
            });
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
        })
            .on('brush', () => {
            this.extent = d3.event.selection;
            if (!d3.event.sourceEvent || !this.extent || !this.brushMode)
                return;
            if (!currentZoom)
                return;
            nodeEnter
                .classed('selected', (d) => {
                return (d.selected =
                    d.previouslySelected ^
                        ((d3.event.selection[0][0] <=
                            d.x * currentZoom.k + currentZoom.x &&
                            d.x * currentZoom.k + currentZoom.x <
                                d3.event.selection[1][0] &&
                            d3.event.selection[0][1] <=
                                d.y * currentZoom.k + currentZoom.y &&
                            d.y * currentZoom.k + currentZoom.y <
                                d3.event.selection[1][1])));
            })
                .select('.nodeText')
                .classed('selected', (d) => d.selected)
                .style('fill', (d) => (d.selected ? 'blue' : '#999'))
                .style('font-weight', (d) => (d.selected ? 700 : 400));
            this.extent = d3.event.selection;
        })
            .on('end', () => {
            if (!d3.event.sourceEvent || !this.extent || !this.gBrush)
                return;
            this.gBrush.call(brush.move, null);
            if (!this.brushMode) {
                // the shift key has been release before we ended our brushing
                this.gBrush.remove();
                this.gBrush = null;
            }
            this.brushing = false;
            nodeEnter
                .select('.nodeText')
                .filter(function () {
                return !d3.select(this.parentNode).classed('selected');
            })
                .style('fill', '#212529')
                .style('font-weight', 400);
            const totalSize = nodeEnter.size();
            const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
            const count = nonSelectedNodes.size();
            const notSelectedSize = totalSize - count;
            if (notSelectedSize === totalSize) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                selectAllNodes.style.opacity = '0.65';
            }
            else {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
            // counts number of selected classes to not exceed 2
            const selectedSize = nodeEnter.selectAll('.selected').size();
            if (selectedSize <= 2) {
                // get data from node
                const localselectedNodesArray = nodeEnter
                    .selectAll('.selected')
                    .data();
                const filterId = localselectedNodesArray.filter((x) => x);
                self.selectedNodesArray.next(filterId);
                return filterId;
            }
            else {
                self.selectedNodesArray.next([]);
            }
        });
        let keyup = () => {
            this.shiftKey = false;
            this.brushMode = false;
            if (this.gBrush && !this.brushing) {
                // only remove the brush if we're not actively brushing
                // otherwise it'll be removed when the brushing ends
                this.gBrush.remove();
                this.gBrush = null;
            }
        };
        let keydown = () => {
            // Allows us to turn off default listeners for keyModifiers(shift)
            brush.filter(() => d3.event.shiftKey);
            brush.keyModifiers(false);
            // holding shift key
            if (d3.event.keyCode === 16) {
                this.shiftKey = true;
                if (!this.gBrush) {
                    this.brushMode = true;
                    this.gBrush = gBrushHolder.append('g').attr('class', 'brush');
                    this.gBrush.call(brush);
                }
            }
        };
        d3.select('body').on('keydown', keydown).on('keyup', keyup);
        // Brush End
        const filteredLine = this.links.filter(({ source, target }, index, linksArray) => {
            // Filter out any objects that have matching source and target property values
            // To display only one line (parentLineStyle) - removes html bloat and a darkened line
            return (index ===
                linksArray.findIndex((obj) => obj.source === source && obj.target === target));
        });
        const link = zoomContainer.selectAll().data(filteredLine, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('line').data(link).exit().remove();
        const linkEnter = link
            .join('line')
            .style('stroke', function (d) {
            if (d.parentLineStyle === 'Solid') {
                return '#777';
            }
            else {
                return '#b4b4b4';
            }
        })
            .style('stroke-opacity', '.6')
            .style('stroke-dasharray', function (d) {
            if (d.parentLineStyle === 'Dotted') {
                return '8,5';
            }
            return null;
        })
            .style('stroke-width', '2px')
            .attr('class', 'link')
            .attr('id', function (d) {
            const suffix = '_line';
            const source = d.source ? d.source : '';
            const target = d.target ? d.target : '';
            return `${source}_${target}${suffix}`;
        })
            .attr('marker-end', function (d) {
            if (d.parentTargetArrow === true) {
                return 'url(#arrowheadTarget)';
            }
            return null;
        })
            .attr('marker-start', function (d) {
            if (d.parentSourceArrow === true) {
                return 'url(#arrowheadSource)';
            }
            return null;
        });
        link.append('title').text(function (d) {
            return d.label;
        });
        const edgepaths = zoomContainer.selectAll().data(this.links, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('path').data(edgepaths).exit().remove();
        const edgepathsEnter = edgepaths
            .join('svg:path')
            .attr('class', 'edgepath')
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .attr('id', function (d, i) {
            return 'edgepath' + i;
        });
        const edgelabels = zoomContainer.selectAll().data(this.links, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('text').data(edgelabels).exit().remove();
        const edgelabelsEnter = edgelabels
            .enter()
            .append('text')
            .attr('class', 'edgelabel')
            .attr('id', function (d) {
            const suffix = '_text';
            const source = d.source ? d.source : '';
            const target = d.target ? d.target : '';
            return `${source}_${target}${suffix}`;
        })
            .style('text-anchor', 'middle')
            .attr('font-size', 14)
            .attr('dy', function (d) {
            return d.dy;
        });
        svg.selectAll('.edgelabel').on('dblclick', function () {
            const dblClick = d3.select(this).data();
            self.dblClickLinkPayload.next(dblClick);
        });
        edgelabelsEnter
            .append('textPath')
            .attr('xlink:href', function (d, i) {
            return '#edgepath' + i;
        })
            .style('cursor', 'pointer')
            .attr('dominant-baseline', 'bottom')
            .attr('startOffset', '50%')
            .text(function (d) {
            return d.label;
        });
        edgelabelsEnter
            .selectAll('textPath')
            .filter(function (d) {
            return d.linkIcon;
        })
            .append('tspan')
            .style('fill', '#856404')
            .style('font-weight', '700')
            .attr('class', 'fa')
            .text(' \uf0c1');
        // on normal label link click - highlight labels
        svg.selectAll('.edgelabel').on('click', function (d) {
            _d3.event.stopPropagation();
            nodeEnter.each(function (d) {
                d.selected = false;
                d.previouslySelected = false;
            });
            node.classed('selected', false);
            selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
            selectAllNodes.style.opacity = '1';
            _d3
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
            _d3.select(this).style('fill', 'blue').style('font-weight', 700);
            self.selectedNodesArray.next([]);
        });
        // on right label link click - hightlight labels and package data for context menu
        svg.selectAll('.edgelabel').on('contextmenu', function (d) {
            self.selectedNodesArray.next([]);
            _d3
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            _d3
                .selectAll('.edgelabel')
                .style('font-weight', 400)
                .style('fill', '#212529');
            _d3.select(this).style('fill', 'blue').style('font-weight', 700);
            const localSelectedLinkArray = d3.select(this).data();
            self.selectedLinkArray.next(localSelectedLinkArray);
        });
        const node = zoomContainer.selectAll().data(this.nodes, function (d) {
            return d.id;
        });
        zoomContainer.selectAll('g').data(node).exit().remove();
        const nodeEnter = node
            .join('g')
            .call(_d3
            .drag()
            .on('start', function dragstarted(d) {
            // Enable the save & reset btn
            if (resetBtn) {
                document
                    .getElementById('reset_graph')
                    .removeAttribute('disabled');
                document.getElementById('save_graph').removeAttribute('disabled');
            }
            if (!_d3.event.active)
                simulation.alphaTarget(0.9).restart();
            if (!d.selected && !this.shiftKey) {
                // if this node isn't selected, then we have to unselect every other node
                nodeEnter.classed('selected', function (p) {
                    return (p.selected = p.previouslySelected = false);
                });
                // remove the selected styling on other nodes and labels when we drag a non-selected node
                _d3
                    .selectAll('.edgelabel')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 400)
                    .style('fill', '#212529');
            }
            _d3.select(this).classed('selected', function (p) {
                d.previouslySelected = d.selected;
                return (d.selected = true);
            });
            nodeEnter
                .filter(function (d) {
                return d.selected;
            })
                .each(function (d) {
                d.fx = d.x;
                d.fy = d.y;
            });
        })
            .on('drag', function dragged(d) {
            nodeEnter
                .filter(function (d) {
                return d.selected;
            })
                .each(function (d) {
                d.fx += _d3.event.dx;
                d.fy += _d3.event.dy;
            });
        })
            .on('end', function dragended(d) {
            if (!_d3.event.active) {
                simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
            // Subscribes to updated graph positions for save
            self.saveGraphData.next(data);
        }))
            .attr('class', 'node-wrapper')
            .attr('id', function (d) {
            return d.id;
        });
        // no collision - already using this in statement
        const self = this;
        svg.selectAll('.node-wrapper').on('dblclick', function () {
            const dblClick = d3.select(this).data();
            self.dblClickNodePayload.next(dblClick);
        });
        // node click and ctrl + click
        svg.selectAll('.node-wrapper').on('click', function (d) {
            // so we don't activate the canvas .click event
            _d3.event.stopPropagation();
            // setting the select attribute to the object on single select so we can drag them
            d.selected = true;
            selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
            selectAllNodes.style.opacity = '1';
            // If ctrl key is held on click
            if (_d3.event.ctrlKey) {
                // toggle the class on and off when ctrl click is active
                const clickedNode = d3.select(this);
                const isSelected = clickedNode.classed('selected');
                clickedNode.classed('selected', !isSelected);
                d.selected = !isSelected;
                d.previouslySelected = !isSelected;
                const totalSize = nodeEnter.size();
                const nonSelectedNodes = d3.selectAll('.node-wrapper:not(.selected)');
                const count = nonSelectedNodes.size();
                const notSelectedSize = totalSize - count;
                if (notSelectedSize === totalSize) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                    selectAllNodes.style.opacity = '0.65';
                }
                // remove the single click styling on other nodes and labels
                _d3
                    .selectAll('.edgelabel')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                _d3
                    .selectAll('.nodeText')
                    .style('font-weight', 400)
                    .style('fill', '#212529');
                svg
                    .selectAll('.selected')
                    .selectAll('.nodeText')
                    .style('fill', 'blue')
                    .style('font-weight', 700);
                // counts number of selected classes to not exceed 2
                const selectedSize = svg.selectAll('.selected').size();
                if (selectedSize <= 2) {
                    // As we allow for single click without a ctrl+click to select two nodes, we have to apply d.selected to it
                    _d3
                        .selectAll('.selected')
                        .attr('selected', true)
                        .each(function (d) {
                        if (d) {
                            d.selected = true;
                        }
                    });
                    // get data from node
                    const localselectedNodesArray = _d3.selectAll('.selected').data();
                    const filterId = localselectedNodesArray.filter((x) => x);
                    self.selectedNodesArray.next(filterId);
                    return filterId;
                }
                return null;
            }
            else {
                svg.selectAll('.node-wrapper').classed('selected', false);
                d3.select(this).classed('selected', true);
                nodeEnter.each(function (d) {
                    d.selected = false;
                    d.previouslySelected = false;
                });
            }
            // remove style from selected node before the class is removed
            _d3
                .selectAll('.selected')
                .selectAll('.nodeText')
                .style('fill', '#212529');
            // Remove styles from all other nodes and labels on single left click
            _d3.selectAll('.edgelabel').style('fill', '#212529');
            _d3
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            // Add style on single left click
            _d3
                .select(this)
                .select('.nodeText')
                .style('fill', 'blue')
                .style('font-weight', 700);
            self.selectedNodesArray.next([]);
            return null;
        });
        // Right click on a node highlights for context menu
        svg.selectAll('.node-wrapper').on('contextmenu', function (d) {
            // counts number of selected classes to not exceed 2
            const selectedSize = svg
                .selectAll('.selected')
                .selectAll('.nodeText')
                .size();
            if (selectedSize !== 2) {
                // We don't want to remove style if they are obtaining the context menu for just two nodes (create link option)
                svg.selectAll('.selected').classed('selected', false);
                self.selectedNodesArray.next([]);
                _d3
                    .selectAll('.edgelabel')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                _d3
                    .selectAll('.nodeText')
                    .style('fill', '#212529')
                    .style('font-weight', 400);
                // Add style on single right click
                _d3
                    .select(this)
                    .select('.nodeText')
                    .style('fill', 'blue')
                    .style('font-weight', 700);
            }
        });
        //click on canvas to remove selected nodes
        _d3.select('svg').on('click', () => {
            nodeEnter.each(function (d) {
                d.selected = false;
                d.previouslySelected = false;
            });
            node.classed('selected', false);
            _d3
                .selectAll('.selected')
                .selectAll('.nodeText')
                .style('fill', '#212529')
                .style('font-weight', 400);
            _d3.selectAll('.selected').classed('selected', false);
            _d3
                .selectAll('.edgelabel')
                .style('fill', '#212529')
                .style('font-weight', 400);
            self.selectedNodesArray.next([]);
            selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
            selectAllNodes.style.opacity = '1';
        });
        nodeEnter
            .filter(function (d) {
            if (!d.imageUrl || d.imageUrl === '') {
                return null;
            }
            return true;
        })
            .append('image')
            .attr('xlink:href', function (d) {
            return d.imageUrl;
        })
            .attr('x', -15)
            .attr('y', -60)
            .attr('class', function (d) {
            const suffix = 'image';
            const id = d.id ? d.id : '';
            return `${id}_${suffix}`;
        })
            .attr('id', function (d) {
            const id = d.id ? d.id : '';
            return `${id}`;
        })
            .attr('width', 32)
            .attr('height', 32)
            .attr('class', 'image')
            .style('cursor', 'pointer');
        nodeEnter
            .filter(function (d) {
            if (!d.icon || d.icon === '') {
                return null;
            }
            return true;
        })
            .append('text')
            .text(function (d) {
            return d.icon;
        })
            .attr('x', -18)
            .attr('y', -30)
            .attr('class', function (d) {
            const suffix = 'icon';
            const id = d.id ? d.id : '';
            return `${id}_${suffix} fa`;
        })
            .attr('id', function (d) {
            const id = d.id ? d.id : '';
            return `${id}`;
        })
            .style('font-size', '35px')
            .style('cursor', 'pointer');
        const nodeText = nodeEnter
            .append('text')
            .attr('id', 'nodeText')
            .attr('class', 'nodeText')
            .style('text-anchor', 'middle')
            .style('cursor', 'pointer')
            .attr('dy', -3)
            .attr('y', -25)
            .attr('testhook', function (d) {
            const suffix = 'text';
            const id = d.id ? d.id : '';
            return `${id}_${suffix}`;
        });
        nodeText
            .selectAll('tspan.text')
            .data((d) => d.label)
            .enter()
            .append('tspan')
            .attr('class', 'nodeTextTspan')
            .text((d) => d)
            .style('font-size', '14px')
            .attr('x', -10)
            .attr('dx', 10)
            .attr('dy', 15);
        nodeEnter
            .filter(function (d) {
            if (!d.additionalIcon) {
                return null;
            }
            return true;
        })
            .append('text')
            .attr('id', function (d) {
            const suffix = 'additionalIcon';
            const id = d.id ? d.id : '';
            return `${id}_${suffix}`;
        })
            .attr('width', 100)
            .attr('height', 25)
            .attr('x', 30)
            .attr('y', -50)
            .attr('class', 'fa')
            .style('fill', '#856404')
            .text(function (d) {
            return d.additionalIcon;
        });
        // transition effects for new pulsating nodes
        nodeEnter
            .filter(function (d) {
            if (!d.newItem) {
                return null;
            }
            return true;
        })
            .select('text')
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 1)
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 0.1)
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 1)
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 0.1)
            .transition()
            .duration(1000)
            .attr('fill', 'blue')
            .attr('font-weight', 700)
            .attr('fill-opacity', 1)
            .transition()
            .duration(1000)
            .attr('fill', '#212529')
            .attr('font-weight', 400)
            .attr('fill-opacity', 1)
            .on('end', function () {
            return d3.select(this).call(_d3.transition);
        });
        nodeEnter
            .filter(function (d) {
            if (!d.newItem) {
                return null;
            }
            return true;
        })
            .select('image')
            .transition()
            .duration(1000)
            .attr('width', 45)
            .attr('height', 45)
            .transition()
            .duration(1000)
            .attr('width', 32)
            .attr('height', 32)
            .transition()
            .duration(1000)
            .attr('width', 45)
            .attr('height', 45)
            .transition()
            .duration(1000)
            .attr('width', 32)
            .attr('height', 32)
            .transition()
            .duration(1000)
            .attr('width', 45)
            .attr('height', 45)
            .transition()
            .duration(1000)
            .attr('width', 32)
            .attr('height', 32)
            .on('end', function () {
            return d3.select(this).call(d3.transition);
        });
        // Remove the newClass so they don't animate next time
        this.nodes = this.removeNewItem(this.nodes);
        nodeEnter.append('title').text(function (d) {
            return d.label;
        });
        const maxTicks = 30;
        let tickCount = 0;
        let zoomToFitCalled = false;
        simulation.nodes(this.nodes).on('tick', () => {
            if (this.zoomToFit && tickCount >= maxTicks && !zoomToFitCalled) {
                simulation.stop();
                handleZoomToFit();
                zoomToFitCalled = true;
            }
            else {
                this.ticked(linkEnter, nodeEnter, edgepathsEnter);
                tickCount++;
            }
        });
        simulation.force('link').links(this.links);
        self.saveGraphData.next(data);
    }
    resetGraph(initialData, element, zoom, zoomToFit) {
        // To reset the search when we reset the data
        this.resetSearch = true;
        // Reset the data to its initial state
        this.nodes = [];
        this.links = [];
        // Call the update method again to re-simulate the graph with the new data
        this.update(initialData, element, zoom, zoomToFit);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, deps: [{ token: i1.DexieService }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.12", ngImport: i0, type: VisualiserGraphService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [{ type: i1.DexieService }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXJlbGF0aW9uc2hpcC12aXN1YWxpc2VyLWxpYi9saWIvdmlzdWFsaXNlci9zZXJ2aWNlcy92aXN1YWxpc2VyLWdyYXBoLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLE1BQU0sQ0FBQzs7O0FBTTlDLE1BQU0sT0FBTyxzQkFBc0I7SUFDYjtJQUFwQixZQUFvQixZQUEwQjtRQUExQixpQkFBWSxHQUFaLFlBQVksQ0FBYztJQUFJLENBQUM7SUFDNUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNYLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDWCxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQ2QsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUNsQixRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ2pCLFFBQVEsQ0FBQztJQUNULE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDZCxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ2IsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUNsQixXQUFXLENBQUM7SUFDbkIsMERBQTBEO0lBQ25ELGtCQUFrQixHQUFHLElBQUksT0FBTyxFQUFTLENBQUM7SUFDMUMsbUJBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUNwQyxtQkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBQ3BDLGlCQUFpQixHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7SUFDbEMsYUFBYSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7SUFFcEMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVM7UUFDMUMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRU8sTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUztRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3pCLG9EQUFvRDtZQUNwRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNwQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUVwQyxxRUFBcUU7WUFDckUsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQztZQUUxRCwrREFBK0Q7WUFDL0QsSUFBSSxPQUFPLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDO1lBQ3hDLElBQUksT0FBTyxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQztZQUV4QyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDWixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztpQkFDaEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUM7aUJBQ2hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDO2lCQUNoQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDO1lBQ2hDLE9BQU8sYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFFSCwrQkFBK0I7UUFDL0IsaUNBQWlDO1FBQ2pDLDBEQUEwRDtRQUMxRCxNQUFNO1FBQ04saUNBQWlDO1FBQ2pDLDBEQUEwRDtRQUMxRCxNQUFNO1FBRU4sU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDO1lBQzdCLE9BQU8sS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxDQUFDO1FBRUgsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM1QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxPQUFPLGNBQWMsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDO1lBQ25DLENBQUM7aUJBQU0sQ0FBQztnQkFDTixPQUFPLFdBQVcsQ0FBQztZQUNyQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sZUFBZSxDQUFDLEdBQUc7UUFDekIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVoQyxTQUFTLFlBQVksQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUk7WUFDbEMsSUFBSTtpQkFDRCxNQUFNLENBQUMsUUFBUSxDQUFDO2lCQUNoQixJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztpQkFDZCxJQUFJLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQztpQkFDOUIsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUM7aUJBQ2xCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2lCQUNmLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO2lCQUN0QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztpQkFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7aUJBQ3ZCLElBQUksQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDO2lCQUM1QixNQUFNLENBQUMsVUFBVSxDQUFDO2lCQUNsQixJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztpQkFDZixJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztpQkFDdkIsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBRUQsWUFBWSxDQUFDLGlCQUFpQixFQUFFLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQzNELFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUUzRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFTyxlQUFlLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtRQUM1QyxPQUFPLEdBQUc7YUFDUCxlQUFlLEVBQUU7YUFDakIsYUFBYSxDQUFDLEdBQUcsQ0FBQzthQUNsQixLQUFLLENBQ0osTUFBTSxFQUNOLEdBQUc7YUFDQSxTQUFTLEVBQUU7YUFDWCxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ2IsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO2FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FBQzthQUNiLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FDZjthQUNBLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNsRCxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDdkQsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVPLHNCQUFzQixDQUFDLEtBQUssRUFBRSxTQUFTO1FBQzdDLDhEQUE4RDtRQUM5RCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQ3BCLE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRVAsK0RBQStEO1FBQy9ELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNyQixpREFBaUQ7Z0JBQ2pELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixpRkFBaUY7Z0JBQ2pGLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO2dCQUNmLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVPLGFBQWEsQ0FBQyxLQUFLO1FBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDekIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUN0QixDQUFDO1FBQ0gsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVPLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTTtRQUNwRCxJQUFJLFdBQVcsR0FBRyxHQUFHLENBQUM7UUFDdEIsTUFBTSxjQUFjLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUN0QyxJQUFJLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUV4RSxJQUFJLHFCQUFxQixHQUFHLGNBQWMsRUFBRSxDQUFDO1lBQzNDLE9BQU8scUJBQXFCLEdBQUcsY0FBYyxJQUFJLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakUsV0FBVyxJQUFJLEVBQUUsQ0FBQztnQkFDbEIscUJBQXFCLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBQ3RFLENBQUM7WUFFRCxJQUFJLHFCQUFxQixHQUFHLGNBQWMsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLElBQUksS0FBSyxDQUNiLHFFQUFxRSxDQUN0RSxDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDeEIsSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUN6QyxJQUFJLGtCQUFrQixHQUFHLFdBQVcsQ0FBQztnQkFDckMsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO2dCQUV6QixPQUFPLENBQUMsWUFBWSxJQUFJLGtCQUFrQixHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMvQyxJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7b0JBQ2hFLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztvQkFFakUsWUFBWSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO3dCQUMxQyxJQUNFLFNBQVMsQ0FBQyxFQUFFLEtBQUssSUFBSTs0QkFDckIsU0FBUyxDQUFDLEVBQUUsS0FBSyxJQUFJOzRCQUNyQixTQUFTLEtBQUssSUFBSSxFQUNsQixDQUFDOzRCQUNELE9BQU8sS0FBSyxDQUFDO3dCQUNmLENBQUM7d0JBRUQsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUNsQyxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ2xDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxrQkFBa0IsQ0FBQztvQkFDM0QsQ0FBQyxDQUFDLENBQUM7b0JBRUgsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO3dCQUNsQixrQkFBa0IsRUFBRSxDQUFDO29CQUN2QixDQUFDO2dCQUNILENBQUM7Z0JBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNsQixNQUFNLElBQUksS0FBSyxDQUNiLHFFQUFxRSxDQUN0RSxDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUk7UUFDakMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUV6Qix3QkFBd0I7UUFDeEIsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0RCxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3BELElBQUksUUFBUSxFQUFFLENBQUM7WUFDYixRQUFRLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxQyxPQUFPLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQ0QseUJBQXlCO1FBQ3pCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztRQUNwRSxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7UUFFdEUscUNBQXFDO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDOUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDNUIseUNBQXlDO1lBQ3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMxRCw4QkFBOEI7WUFDOUIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqRCx5QkFBeUI7WUFDekIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25HLENBQUM7YUFBTSxDQUFDO1lBQ04sa0NBQWtDO1lBQ2xDLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNuRyxDQUFDO1FBRUQsNEpBQTRKO1FBQzVKLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUN0QyxJQUFJLENBQUMsS0FBSyxFQUNWLFdBQVcsRUFDWCxZQUFZLENBQ2IsQ0FBQztRQUVGLDJEQUEyRDtRQUMzRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUN2QyxDQUFDLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLEVBQUUsRUFBRSxDQUN6RCxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3hCLGVBQWUsRUFBRSxTQUFTO1lBQzFCLGlCQUFpQixFQUFFLFdBQVc7WUFDOUIsaUJBQWlCLEVBQUUsV0FBVztZQUM5QixHQUFHLENBQUM7U0FDTCxDQUFDLENBQUMsQ0FDTixDQUFDO1FBRUYsOERBQThEO1FBQzlELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLEVBQUU7WUFDMUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNyQyx3QkFBd0I7Z0JBQ3hCLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNqQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUxRSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU3QixhQUFhO1FBQ2IsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM1RCxNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUU7WUFDM0IsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztZQUN2RSxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDL0QsTUFBTSxhQUFhLEdBQUcsU0FBUyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDNUQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNyRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFM0Qsd0RBQXdEO1lBQ3hELElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2pCLFlBQVksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFDRCwySEFBMkg7WUFDM0gsSUFBSSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLEtBQUssYUFBYSxFQUFFLENBQUM7Z0JBQ3JFLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUM7Z0JBQzNDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDO2dCQUNyQyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNkLElBQUksZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDckIsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUM7b0JBQ3ZDLENBQUM7Z0JBQ0gsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ1gsQ0FBQztZQUNELHFEQUFxRDtZQUNyRCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNkLElBQUksY0FBYyxLQUFLLEdBQUcsRUFBRSxDQUFDO29CQUMzQixTQUFTLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDN0MsQ0FBQztxQkFBTSxDQUFDO29CQUNOLFNBQVMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3hDLENBQUM7WUFDSCxDQUFDO1lBQ0Qsb0RBQW9EO1lBQ3BELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxjQUFjLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3pCLFVBQVUsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUM5QyxDQUFDO3FCQUFNLENBQUM7b0JBQ04sVUFBVSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDekMsQ0FBQztZQUNILENBQUM7WUFDRCx3REFBd0Q7WUFDeEQsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxjQUFjLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQzNCLFlBQVksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNoRCxDQUFDO3FCQUFNLENBQUM7b0JBQ04sWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDM0MsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDLENBQUM7UUFDRixJQUFJLFVBQVUsQ0FBQztRQUNmLE1BQU0sTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNsQixNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUNyQyxhQUFhLENBQUMsSUFBSSxDQUNoQixXQUFXLEVBQ1gsYUFBYSxTQUFTLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLFdBQVcsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUNsRSxDQUFDO1lBQ0YsV0FBVyxHQUFHLFNBQVMsQ0FBQztZQUN4QixVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ2xCLGVBQWUsRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQztRQUVGLE1BQU0sSUFBSSxHQUFHLEVBQUU7YUFDWixJQUFJLEVBQUU7YUFDTixXQUFXLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDdkIsRUFBRSxDQUFDLE9BQU8sRUFBRTtZQUNYLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQzthQUNELEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDckMsRUFBRSxDQUFDLEtBQUssRUFBRTtZQUNULEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztRQUNMLEdBQUc7YUFDQSxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ1YsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7YUFDdkIsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQzthQUN6QyxFQUFFLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXRDLHVCQUF1QjtRQUN2QixFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUU7WUFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2xELGVBQWUsRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFO1lBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsRCxlQUFlLEVBQUUsQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRTtZQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEQsZUFBZSxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxrQ0FBa0M7UUFDbEMsTUFBTSxlQUFlLEdBQUcsR0FBRyxFQUFFO1lBQzNCLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUVoRCx3REFBd0Q7WUFDeEQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ25CLE1BQU0sTUFBTSxHQUFHLENBQUMsV0FBVyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQzVELE1BQU0sTUFBTSxHQUFHLENBQUMsWUFBWSxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQzlELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHFDQUFxQztZQUVsRixNQUFNLFVBQVUsR0FDZCxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sVUFBVSxHQUNkLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFckUsb0NBQW9DO1lBQ3BDLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDMUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FDMUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQ1osTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNoQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdELEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNoRSxPQUFPLEdBQUcsQ0FBQztZQUNiLENBQUMsRUFDRCxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQ2xFLENBQUM7WUFFRix1REFBdUQ7WUFDdkQsSUFDRSxZQUFZLENBQUMsQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDO2dCQUMzQixZQUFZLENBQUMsQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDO2dCQUMzQixZQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssSUFBSSxXQUFXO2dCQUN6QyxZQUFZLENBQUMsTUFBTSxHQUFHLEtBQUssSUFBSSxZQUFZLEVBQzNDLENBQUM7Z0JBQ0QsK0VBQStFO2dCQUMvRSxPQUFPO1lBQ1QsQ0FBQztZQUVELG9DQUFvQztZQUNwQyxhQUFhO2lCQUNWLFVBQVUsRUFBRTtpQkFDWixRQUFRLENBQUMsR0FBRyxDQUFDO2lCQUNiLElBQUksQ0FBQyxXQUFXLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztZQUVqRCx3Q0FBd0M7WUFDeEMsYUFBYTtpQkFDVixVQUFVLEVBQUU7aUJBQ1osUUFBUSxDQUFDLEdBQUcsQ0FBQztpQkFDYixJQUFJLENBQ0gsV0FBVyxFQUNYLGFBQWEsVUFBVSxLQUFLLFVBQVUsV0FBVyxLQUFLLEdBQUcsQ0FDMUQsQ0FBQztZQUVKLHlEQUF5RDtZQUN6RCxtSUFBbUk7WUFDbkksSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDZixXQUFXLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQztnQkFDM0IsV0FBVyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUM7Z0JBQzNCLFdBQVcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQ3hCLENBQUM7WUFDRCxlQUFlLEVBQUUsQ0FBQztRQUNwQixDQUFDLENBQUM7UUFFRixFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFdkQsOEhBQThIO1FBQzlILEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNuQixNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsSUFBSSxZQUFZLEtBQUssUUFBUSxJQUFJLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDM0QsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM1QixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxXQUFXO1FBQ1gsb0JBQW9CO1FBQ3BCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDN0QsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLEVBQUU7WUFDaEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25DLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RDLE1BQU0sZUFBZSxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFFMUMsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2xDLGNBQWMsQ0FBQyxTQUFTLEdBQUcsNEJBQTRCLENBQUM7Z0JBQ3hELGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztnQkFDdEMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztvQkFDNUQsQ0FBQyxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7b0JBQ2xDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUM3QixDQUFDLENBQUMsQ0FBQztnQkFDSCxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztxQkFDdEIsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUNwRCxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sY0FBYyxDQUFDLFNBQVMsR0FBRyxpQ0FBaUMsQ0FBQztnQkFDN0QsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDO2dCQUNuQyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzFELEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7b0JBQzVELE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDckQsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsR0FBRztxQkFDQSxTQUFTLENBQUMsV0FBVyxDQUFDO3FCQUN0QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQztxQkFDekIsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM5QixDQUFDO1lBQ0QsbUJBQW1CO1lBQ25CLEdBQUc7aUJBQ0EsU0FBUyxDQUFDLFlBQVksQ0FBQztpQkFDdkIsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUM7aUJBQ3pCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDO1FBQ0YsRUFBRSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFM0QsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLEVBQUU7WUFDakMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25DLE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUM3RCxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUN0RSxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDM0MsTUFBTSxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqRCxJQUFJLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsd0RBQXdEO2dCQUN4RCxhQUFhLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7b0JBQzNDLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO29CQUNsQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDOUIsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7b0JBQzlDLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO29CQUNsQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQztnQkFDN0IsQ0FBQyxDQUFDLENBQUM7Z0JBRUgscUpBQXFKO2dCQUNySixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2RCxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDdEIscUJBQXFCO29CQUNyQixNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2xFLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzFELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7Z0JBRUQsaUNBQWlDO2dCQUNqQyxHQUFHO3FCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7cUJBQ3RCLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDdkQsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0QsQ0FBQztpQkFBTSxJQUFJLGdCQUFnQixHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNoQyx3Q0FBd0M7Z0JBQ3hDLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7b0JBQzVELENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO29CQUNsQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQztnQkFDN0IsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsaUNBQWlDO2dCQUNqQyxHQUFHO3FCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7cUJBQ3RCLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDO3FCQUN6QixLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzNCLENBQUM7WUFFRCxvRUFBb0U7WUFDcEUsTUFBTSxvQkFBb0IsR0FDeEIsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQzVELElBQUksb0JBQW9CLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3ZDLCtEQUErRDtnQkFDL0QsY0FBYyxDQUFDLFNBQVMsR0FBRyw0QkFBNEIsQ0FBQztnQkFDeEQsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1lBQ3hDLENBQUM7aUJBQU0sQ0FBQztnQkFDTixtRUFBbUU7Z0JBQ25FLGNBQWMsQ0FBQyxTQUFTLEdBQUcsaUNBQWlDLENBQUM7Z0JBQzdELGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztZQUNyQyxDQUFDO1lBQ0QsbUJBQW1CO1lBQ25CLEdBQUc7aUJBQ0EsU0FBUyxDQUFDLFlBQVksQ0FBQztpQkFDdkIsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUM7aUJBQ3pCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUVsRSxTQUFTO1FBQ1QsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxRCx3Q0FBd0M7UUFDeEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQ3pDLGFBQWEsQ0FDTSxDQUFDO1lBQ3RCLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQ3pDLGFBQWEsQ0FDTyxDQUFDO1lBQ3ZCLE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBb0IsRUFBRSxFQUFFO2dCQUM1QyxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQzFCLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDdkIsYUFBYSxFQUFFLENBQUM7Z0JBQ2xCLENBQUM7WUFDSCxDQUFDLENBQUM7WUFFRixJQUFJLGFBQWEsR0FBRyxFQUFFLENBQUM7WUFDdkIsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUUzQixNQUFNLGdCQUFnQixHQUFHLEdBQUcsRUFBRTtnQkFDNUIsZ0RBQWdEO2dCQUNoRCxFQUFFLENBQUMsU0FBUyxDQUFDLDZCQUE2QixDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBRXJELE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUN0RCw4QkFBOEI7Z0JBQzlCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsTUFBTSxDQUFDO29CQUN2RCxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksQ0FBQyxFQUFFLENBQUM7Z0JBQ3hELENBQUMsQ0FBQyxDQUFDO2dCQUVILHFEQUFxRDtnQkFDckQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMxQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRTFELE1BQU0sZ0JBQWdCLEdBQUcsV0FBVztxQkFDakMsTUFBTSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUM7cUJBQ2hDLElBQUksQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO3FCQUN0QixJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQztxQkFDdEIsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUM7cUJBQ25CLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBRXZCLGdDQUFnQztnQkFDaEMsZ0JBQWdCO3FCQUNiLFVBQVUsRUFBRTtxQkFDWixRQUFRLENBQUMsSUFBSSxDQUFDO3FCQUNkLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDO3FCQUNqQixVQUFVLEVBQUU7cUJBQ1osUUFBUSxDQUFDLElBQUksQ0FBQztxQkFDZCxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUM7cUJBQ3JCLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDO3FCQUN0QixVQUFVLEVBQUU7cUJBQ1osUUFBUSxDQUFDLElBQUksQ0FBQztxQkFDZCxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQztxQkFDakIsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFFMUIsNEJBQTRCO2dCQUM1QixNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxhQUFhLENBQUM7Z0JBQ2xDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsWUFBWSxDQUFDO2dCQUNoQyxNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxZQUFZO3FCQUNyQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUM7cUJBQ2hFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDWixhQUFhO3FCQUNWLFVBQVUsRUFBRTtxQkFDWixRQUFRLENBQUMsR0FBRyxDQUFDO3FCQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBRTFDLG9DQUFvQztnQkFDcEMsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FDeEMsWUFBWSxDQUNRLENBQUM7Z0JBQ3ZCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQ3hDLFlBQVksQ0FDUSxDQUFDO2dCQUN2QixVQUFVLENBQUMsUUFBUSxHQUFHLGlCQUFpQixLQUFLLENBQUMsQ0FBQztnQkFDOUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxpQkFBaUIsS0FBSyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUN2RSxDQUFDLENBQUM7WUFFRixNQUFNLGFBQWEsR0FBRyxHQUFHLEVBQUU7Z0JBQ3pCLGdEQUFnRDtnQkFDaEQsRUFBRSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUVyRCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUUxRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzNCLHFCQUFxQjtvQkFDckIsYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7d0JBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQzt3QkFFM0QsT0FBTyxDQUNMLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7NEJBQ3pELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDdEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNoQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUNqRCxDQUNGLENBQ0YsQ0FBQztvQkFDSixDQUFDLENBQUMsQ0FBQztvQkFFSCxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQzdCLGlCQUFpQixHQUFHLENBQUMsQ0FBQzt3QkFDdEIsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDckIsQ0FBQzt5QkFBTSxDQUFDO3dCQUNOLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUN2QixhQUFhLEVBQUUsQ0FBQztvQkFDbEIsQ0FBQztnQkFDSCxDQUFDO3FCQUFNLENBQUM7b0JBQ04sZUFBZTtvQkFDZixhQUFhLEdBQUcsRUFBRSxDQUFDO29CQUNuQixpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDdkIsYUFBYSxFQUFFLENBQUM7Z0JBQ2xCLENBQUM7Z0JBRUQsaUJBQWlCLEVBQUUsQ0FBQztZQUN0QixDQUFDLENBQUM7WUFFRixNQUFNLGFBQWEsR0FBRyxHQUFHLEVBQUU7Z0JBQ3pCLG1CQUFtQjtnQkFDbkIsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRSxhQUFhO3FCQUNWLFVBQVUsRUFBRTtxQkFDWixRQUFRLENBQUMsR0FBRyxDQUFDO3FCQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBQzFDLGVBQWUsRUFBRSxDQUFDO2dCQUNsQiw2QkFBNkI7Z0JBQzdCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQ3hDLFlBQVksQ0FDUSxDQUFDO2dCQUN2QixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUN4QyxZQUFZLENBQ1EsQ0FBQztnQkFDdkIsVUFBVSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQzNCLFVBQVUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUUzQix1REFBdUQ7Z0JBQ3ZELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQy9ELElBQUksV0FBVyxDQUFDLEtBQUssS0FBSyxFQUFFLEVBQUUsQ0FBQztvQkFDN0IsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3BDLGdDQUFnQztvQkFDaEMsVUFBVSxDQUFDLEdBQUcsRUFBRTt3QkFDZCx3REFBd0Q7d0JBQ3hELGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN6QyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ1gsQ0FBQztZQUNILENBQUMsQ0FBQztZQUVGLE1BQU0sWUFBWSxHQUFHLEdBQUcsRUFBRTtnQkFDeEIsSUFBSSxpQkFBaUIsR0FBRyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNqRCxpQkFBaUIsRUFBRSxDQUFDO29CQUNwQixnQkFBZ0IsRUFBRSxDQUFDO2dCQUNyQixDQUFDO1lBQ0gsQ0FBQyxDQUFDO1lBRUYsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLEVBQUU7Z0JBQzVCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzFCLGlCQUFpQixFQUFFLENBQUM7b0JBQ3BCLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3JCLENBQUM7WUFDSCxDQUFDLENBQUM7WUFFRixNQUFNLGdCQUFnQixHQUFHLEdBQUcsRUFBRTtnQkFDNUIsV0FBVyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEIsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsYUFBYSxHQUFHLEVBQUUsQ0FBQztnQkFDbkIsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLGdEQUFnRDtnQkFDaEQsRUFBRSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUVyRCxzQ0FBc0M7Z0JBQ3RDLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQ3hDLFlBQVksQ0FDUSxDQUFDO2dCQUN2QixVQUFVLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztnQkFDM0IsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FDeEMsWUFBWSxDQUNRLENBQUM7Z0JBQ3ZCLFVBQVUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQzdCLENBQUMsQ0FBQztZQUVGLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO2dCQUM3QixXQUFXLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztZQUMvRCxDQUFDLENBQUM7WUFFRiw2Q0FBNkM7WUFDN0MsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3JCLGdCQUFnQixFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQzNCLENBQUM7WUFFRCxXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDekQsU0FBUyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNuRCxXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDeEQsUUFBUTtpQkFDTCxjQUFjLENBQUMsYUFBYSxDQUFDO2lCQUM3QixnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDN0MsUUFBUTtpQkFDTCxjQUFjLENBQUMsWUFBWSxDQUFDO2lCQUM1QixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDM0MsUUFBUTtpQkFDTCxjQUFjLENBQUMsWUFBWSxDQUFDO2lCQUM1QixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0QsYUFBYTtRQUNiLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFMUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUU7WUFDM0MsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDekIsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsY0FBYztRQUNkLElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFbkMsSUFBSSxLQUFLLEdBQUcsRUFBRTthQUNYLEtBQUssRUFBRTthQUNQLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ2hCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBRXJCLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDbkIsQ0FBQyxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUNyRCxDQUFDLENBQUMsQ0FBQztZQUVILEdBQUc7aUJBQ0EsU0FBUyxDQUFDLFlBQVksQ0FBQztpQkFDdkIsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUM7aUJBQ3pCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDO2FBQ0QsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDaEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUNqQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVM7Z0JBQUUsT0FBTztZQUNyRSxJQUFJLENBQUMsV0FBVztnQkFBRSxPQUFPO1lBRXpCLFNBQVM7aUJBQ04sT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUN6QixPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVE7b0JBQ2hCLENBQUMsQ0FBQyxrQkFBa0I7d0JBQ2QsQ0FDSixDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDdkIsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDOzRCQUNuQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7Z0NBQ25DLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDeEIsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUN4QixDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7NEJBQ25DLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQztnQ0FDbkMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDM0IsQ0FBQyxDQUFDO1lBQ1IsQ0FBQyxDQUFDO2lCQUNELE1BQU0sQ0FBQyxXQUFXLENBQUM7aUJBQ25CLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7aUJBQ3RDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDcEQsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFekQsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztRQUNuQyxDQUFDLENBQUM7YUFDRCxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtZQUNkLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtnQkFBRSxPQUFPO1lBRWxFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsOERBQThEO2dCQUM5RCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNyQixDQUFDO1lBQ0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7WUFFdEIsU0FBUztpQkFDTixNQUFNLENBQUMsV0FBVyxDQUFDO2lCQUNuQixNQUFNLENBQUM7Z0JBQ04sT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6RCxDQUFDLENBQUM7aUJBQ0QsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUM7aUJBQ3hCLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFN0IsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25DLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RDLE1BQU0sZUFBZSxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFFMUMsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2xDLGNBQWMsQ0FBQyxTQUFTLEdBQUcsNEJBQTRCLENBQUM7Z0JBQ3hELGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztZQUN4QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sY0FBYyxDQUFDLFNBQVMsR0FBRyxpQ0FBaUMsQ0FBQztnQkFDN0QsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDO1lBQ3JDLENBQUM7WUFFRCxvREFBb0Q7WUFDcEQsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3RCxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEIscUJBQXFCO2dCQUNyQixNQUFNLHVCQUF1QixHQUFHLFNBQVM7cUJBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7cUJBQ3RCLElBQUksRUFBRSxDQUFDO2dCQUNWLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sUUFBUSxDQUFDO1lBQ2xCLENBQUM7aUJBQU0sQ0FBQztnQkFDTixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVMLElBQUksS0FBSyxHQUFHLEdBQUcsRUFBRTtZQUNmLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3ZCLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbEMsdURBQXVEO2dCQUN2RCxvREFBb0Q7Z0JBQ3BELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLENBQUM7UUFDSCxDQUFDLENBQUM7UUFFRixJQUFJLE9BQU8sR0FBRyxHQUFHLEVBQUU7WUFDakIsa0VBQWtFO1lBQ2xFLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN0QyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzFCLG9CQUFvQjtZQUNwQixJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztnQkFFckIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUM5RCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDMUIsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDLENBQUM7UUFFRixFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RCxZQUFZO1FBRVosTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQ3BDLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFO1lBQ3hDLDhFQUE4RTtZQUM5RSxzRkFBc0Y7WUFDdEYsT0FBTyxDQUNMLEtBQUs7Z0JBQ0wsVUFBVSxDQUFDLFNBQVMsQ0FDbEIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUN4RCxDQUNGLENBQUM7UUFDSixDQUFDLENBQ0YsQ0FBQztRQUVGLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQztZQUNuRSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRTNELE1BQU0sU0FBUyxHQUFHLElBQUk7YUFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUNaLEtBQUssQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDO1lBQzFCLElBQUksQ0FBQyxDQUFDLGVBQWUsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLE9BQU8sU0FBUyxDQUFDO1lBQ25CLENBQUM7UUFDSCxDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDO2FBQzdCLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUM7WUFDcEMsSUFBSSxDQUFDLENBQUMsZUFBZSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDO2FBQzVCLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDO2FBQ3JCLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO1lBQ3JCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQztZQUN2QixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDeEMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sR0FBRyxNQUFNLElBQUksTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ3hDLENBQUMsQ0FBQzthQUNELElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDO1lBQzdCLElBQUksQ0FBQyxDQUFDLGlCQUFpQixLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNqQyxPQUFPLHVCQUF1QixDQUFDO1lBQ2pDLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQzthQUNELElBQUksQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDO1lBQy9CLElBQUksQ0FBQyxDQUFDLGlCQUFpQixLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNqQyxPQUFPLHVCQUF1QixDQUFDO1lBQ2pDLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBRUwsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUM7WUFDdEUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUVoRSxNQUFNLGNBQWMsR0FBRyxTQUFTO2FBQzdCLElBQUksQ0FBQyxVQUFVLENBQUM7YUFDaEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUM7YUFDekIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7YUFDdkIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQzthQUN6QixJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDeEIsT0FBTyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO1FBRUwsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQztZQUN2RSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRWpFLE1BQU0sZUFBZSxHQUFHLFVBQVU7YUFDL0IsS0FBSyxFQUFFO2FBQ1AsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDO2FBQzFCLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO1lBQ3JCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQztZQUN2QixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDeEMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sR0FBRyxNQUFNLElBQUksTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ3hDLENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDO2FBQzlCLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO2FBQ3JCLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBRUwsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFO1lBQ3pDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztRQUVILGVBQWU7YUFDWixNQUFNLENBQUMsVUFBVSxDQUFDO2FBQ2xCLElBQUksQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxPQUFPLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDekIsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUM7YUFDMUIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQzthQUNuQyxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQzthQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2YsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO1FBRUwsZUFBZTthQUNaLFNBQVMsQ0FBQyxVQUFVLENBQUM7YUFDckIsTUFBTSxDQUFDLFVBQVUsQ0FBQztZQUNqQixPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDcEIsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQzthQUNmLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO2FBQ3hCLEtBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO2FBQzNCLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDO2FBQ25CLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuQixnREFBZ0Q7UUFDaEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQztZQUNqRCxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzVCLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUN4QixDQUFDLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztZQUMvQixDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLGNBQWMsQ0FBQyxTQUFTLEdBQUcsaUNBQWlDLENBQUM7WUFDN0QsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDO1lBQ25DLEdBQUc7aUJBQ0EsU0FBUyxDQUFDLFdBQVcsQ0FBQztpQkFDdEIsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUM7aUJBQ3hCLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDN0IsR0FBRztpQkFDQSxTQUFTLENBQUMsWUFBWSxDQUFDO2lCQUN2QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQztpQkFDekIsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNqRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO1FBRUgsa0ZBQWtGO1FBQ2xGLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUM7WUFDdkQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqQyxHQUFHO2lCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7aUJBQ3RCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO2lCQUN4QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLEdBQUc7aUJBQ0EsU0FBUyxDQUFDLFlBQVksQ0FBQztpQkFDdkIsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUM7aUJBQ3pCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDakUsTUFBTSxzQkFBc0IsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUM7WUFDakUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUV4RCxNQUFNLFNBQVMsR0FBRyxJQUFJO2FBQ25CLElBQUksQ0FBQyxHQUFHLENBQUM7YUFDVCxJQUFJLENBQ0gsR0FBRzthQUNBLElBQUksRUFBRTthQUNOLEVBQUUsQ0FBQyxPQUFPLEVBQUUsU0FBUyxXQUFXLENBQUMsQ0FBQztZQUNqQyw4QkFBOEI7WUFDOUIsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDYixRQUFRO3FCQUNMLGNBQWMsQ0FBQyxhQUFhLENBQUM7cUJBQzdCLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDL0IsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEUsQ0FBQztZQUNELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU07Z0JBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUU3RCxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbEMseUVBQXlFO2dCQUN6RSxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7b0JBQ3ZDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDckQsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gseUZBQXlGO2dCQUN6RixHQUFHO3FCQUNBLFNBQVMsQ0FBQyxZQUFZLENBQUM7cUJBQ3ZCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO3FCQUN4QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QixHQUFHO3FCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7cUJBQ3RCLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDO3FCQUN6QixLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzlCLENBQUM7WUFFRCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO2dCQUM5QyxDQUFDLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDbEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7WUFFSCxTQUFTO2lCQUNOLE1BQU0sQ0FBQyxVQUFVLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUNwQixDQUFDLENBQUM7aUJBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDZixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2IsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUM7YUFDRCxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsT0FBTyxDQUFDLENBQUM7WUFDNUIsU0FBUztpQkFDTixNQUFNLENBQUMsVUFBVSxDQUFDO2dCQUNqQixPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDcEIsQ0FBQyxDQUFDO2lCQUNELElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ2YsQ0FBQyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQzthQUNELEVBQUUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxTQUFTLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDdEIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QyxDQUFDO1lBQ0QsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsaURBQWlEO1lBQ2pELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUNMO2FBQ0EsSUFBSSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUM7YUFDN0IsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUM7WUFDckIsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFFTCxpREFBaUQ7UUFDakQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWxCLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRTtZQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQztZQUNwRCwrQ0FBK0M7WUFDL0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUU1QixrRkFBa0Y7WUFDbEYsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFFbEIsY0FBYyxDQUFDLFNBQVMsR0FBRyxpQ0FBaUMsQ0FBQztZQUM3RCxjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUM7WUFDbkMsK0JBQStCO1lBQy9CLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsd0RBQXdEO2dCQUN4RCxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNuRCxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM3QyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsVUFBVSxDQUFDO2dCQUN6QixDQUFDLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxVQUFVLENBQUM7Z0JBRW5DLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7Z0JBQ3RFLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN0QyxNQUFNLGVBQWUsR0FBRyxTQUFTLEdBQUcsS0FBSyxDQUFDO2dCQUUxQyxJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDbEMsY0FBYyxDQUFDLFNBQVMsR0FBRyw0QkFBNEIsQ0FBQztvQkFDeEQsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO2dCQUN4QyxDQUFDO2dCQUNELDREQUE0RDtnQkFDNUQsR0FBRztxQkFDQSxTQUFTLENBQUMsWUFBWSxDQUFDO3FCQUN2QixLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztxQkFDeEIsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDN0IsR0FBRztxQkFDQSxTQUFTLENBQUMsV0FBVyxDQUFDO3FCQUN0QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQztxQkFDekIsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDNUIsR0FBRztxQkFDQSxTQUFTLENBQUMsV0FBVyxDQUFDO3FCQUN0QixTQUFTLENBQUMsV0FBVyxDQUFDO3FCQUN0QixLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztxQkFDckIsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDN0Isb0RBQW9EO2dCQUNwRCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUV2RCxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDdEIsMkdBQTJHO29CQUMzRyxHQUFHO3lCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7eUJBQ3RCLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDO3lCQUN0QixJQUFJLENBQUMsVUFBVSxDQUFDO3dCQUNmLElBQUksQ0FBQyxFQUFFLENBQUM7NEJBQ04sQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7d0JBQ3BCLENBQUM7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7b0JBQ0wscUJBQXFCO29CQUNyQixNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2xFLE1BQU0sUUFBUSxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzFELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3ZDLE9BQU8sUUFBUSxDQUFDO2dCQUNsQixDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDMUQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMxQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztvQkFDeEIsQ0FBQyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7b0JBQ25CLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7Z0JBQy9CLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELDhEQUE4RDtZQUM5RCxHQUFHO2lCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7aUJBQ3RCLFNBQVMsQ0FBQyxXQUFXLENBQUM7aUJBQ3RCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUIscUVBQXFFO1lBQ3JFLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNyRCxHQUFHO2lCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7aUJBQ3RCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO2lCQUN4QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLGlDQUFpQztZQUNqQyxHQUFHO2lCQUNBLE1BQU0sQ0FBQyxJQUFJLENBQUM7aUJBQ1osTUFBTSxDQUFDLFdBQVcsQ0FBQztpQkFDbkIsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7aUJBQ3JCLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVqQyxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBRUgsb0RBQW9EO1FBQ3BELEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUM7WUFDMUQsb0RBQW9EO1lBQ3BELE1BQU0sWUFBWSxHQUFHLEdBQUc7aUJBQ3JCLFNBQVMsQ0FBQyxXQUFXLENBQUM7aUJBQ3RCLFNBQVMsQ0FBQyxXQUFXLENBQUM7aUJBQ3RCLElBQUksRUFBRSxDQUFDO1lBRVYsSUFBSSxZQUFZLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLCtHQUErRztnQkFDL0csR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQyxHQUFHO3FCQUNBLFNBQVMsQ0FBQyxZQUFZLENBQUM7cUJBQ3ZCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO3FCQUN4QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QixHQUFHO3FCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7cUJBQ3RCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO3FCQUN4QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QixrQ0FBa0M7Z0JBQ2xDLEdBQUc7cUJBQ0EsTUFBTSxDQUFDLElBQUksQ0FBQztxQkFDWixNQUFNLENBQUMsV0FBVyxDQUFDO3FCQUNuQixLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztxQkFDckIsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMvQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCwwQ0FBMEM7UUFDMUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUNqQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDeEIsQ0FBQyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7Z0JBQ25CLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7WUFDL0IsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNoQyxHQUFHO2lCQUNBLFNBQVMsQ0FBQyxXQUFXLENBQUM7aUJBQ3RCLFNBQVMsQ0FBQyxXQUFXLENBQUM7aUJBQ3RCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO2lCQUN4QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN0RCxHQUFHO2lCQUNBLFNBQVMsQ0FBQyxZQUFZLENBQUM7aUJBQ3ZCLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO2lCQUN4QixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakMsY0FBYyxDQUFDLFNBQVMsR0FBRyxpQ0FBaUMsQ0FBQztZQUM3RCxjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFTO2FBQ1IsTUFBTSxDQUFDLFVBQVUsQ0FBQztZQUNqQixJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLElBQUksQ0FBQztZQUNkLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQzthQUNDLE1BQU0sQ0FBQyxPQUFPLENBQUM7YUFDZixJQUFJLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQztZQUM3QixPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDcEIsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQzthQUNkLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7YUFDZCxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQztZQUN4QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUM7WUFDdkIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sR0FBRyxFQUFFLElBQUksTUFBTSxFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUM7WUFDckIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sR0FBRyxFQUFFLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUM7YUFDRCxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQzthQUNqQixJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQzthQUNsQixJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQzthQUN0QixLQUFLLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTVCLFNBQVM7YUFDUixNQUFNLENBQUMsVUFBVSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQzdCLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNkLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDZixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDaEIsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQzthQUNkLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7YUFDZCxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQztZQUN4QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sR0FBRyxFQUFFLElBQUksTUFBTSxLQUFLLENBQUM7UUFDOUIsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUM7WUFDckIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sR0FBRyxFQUFFLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQzthQUMxQixLQUFLLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRzlCLE1BQU0sUUFBUSxHQUFHLFNBQVM7YUFDdkIsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDO2FBQ3RCLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDO2FBQ3pCLEtBQUssQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDO2FBQzlCLEtBQUssQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDO2FBQzFCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDZCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO2FBQ2QsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7WUFDM0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDO1lBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLEdBQUcsRUFBRSxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO1FBRUwsUUFBUTthQUNMLFNBQVMsQ0FBQyxZQUFZLENBQUM7YUFDdkIsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO2FBQ3BCLEtBQUssRUFBRTthQUNQLE1BQU0sQ0FBQyxPQUFPLENBQUM7YUFDZixJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQzthQUM5QixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNkLEtBQUssQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDO2FBQzFCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7YUFDZCxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQzthQUNkLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFbEIsU0FBUzthQUNOLE1BQU0sQ0FBQyxVQUFVLENBQUM7WUFDakIsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdEIsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDO2FBQ2QsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUM7WUFDckIsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUM7WUFDaEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sR0FBRyxFQUFFLElBQUksTUFBTSxFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7YUFDbEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7YUFDbEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7YUFDYixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO2FBQ2QsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7YUFDbkIsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUM7YUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQztRQUVMLDZDQUE2QztRQUM3QyxTQUFTO2FBQ04sTUFBTSxDQUFDLFVBQVUsQ0FBQztZQUNqQixJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNmLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNkLFVBQVUsRUFBRTthQUNaLFFBQVEsQ0FBQyxJQUFJLENBQUM7YUFDZCxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQzthQUNwQixJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQzthQUN4QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQzthQUN2QixVQUFVLEVBQUU7YUFDWixRQUFRLENBQUMsSUFBSSxDQUFDO2FBQ2QsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7YUFDcEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUM7YUFDeEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUM7YUFDekIsVUFBVSxFQUFFO2FBQ1osUUFBUSxDQUFDLElBQUksQ0FBQzthQUNkLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO2FBQ3BCLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDO2FBQ3hCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZCLFVBQVUsRUFBRTthQUNaLFFBQVEsQ0FBQyxJQUFJLENBQUM7YUFDZCxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQzthQUNwQixJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQzthQUN4QixJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQzthQUN6QixVQUFVLEVBQUU7YUFDWixRQUFRLENBQUMsSUFBSSxDQUFDO2FBQ2QsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7YUFDcEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUM7YUFDeEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7YUFDdkIsVUFBVSxFQUFFO2FBQ1osUUFBUSxDQUFDLElBQUksQ0FBQzthQUNkLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO2FBQ3ZCLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDO2FBQ3hCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZCLEVBQUUsQ0FBQyxLQUFLLEVBQUU7WUFDVCxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQztRQUVMLFNBQVM7YUFDTixNQUFNLENBQUMsVUFBVSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsT0FBTyxDQUFDO2FBQ2YsVUFBVSxFQUFFO2FBQ1osUUFBUSxDQUFDLElBQUksQ0FBQzthQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2FBQ2pCLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2FBQ2xCLFVBQVUsRUFBRTthQUNaLFFBQVEsQ0FBQyxJQUFJLENBQUM7YUFDZCxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQzthQUNqQixJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQzthQUNsQixVQUFVLEVBQUU7YUFDWixRQUFRLENBQUMsSUFBSSxDQUFDO2FBQ2QsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7YUFDakIsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7YUFDbEIsVUFBVSxFQUFFO2FBQ1osUUFBUSxDQUFDLElBQUksQ0FBQzthQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2FBQ2pCLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2FBQ2xCLFVBQVUsRUFBRTthQUNaLFFBQVEsQ0FBQyxJQUFJLENBQUM7YUFDZCxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQzthQUNqQixJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQzthQUNsQixVQUFVLEVBQUU7YUFDWixRQUFRLENBQUMsSUFBSSxDQUFDO2FBQ2QsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7YUFDakIsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7YUFDbEIsRUFBRSxDQUFDLEtBQUssRUFBRTtZQUNULE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO1FBRUwsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFNUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3hDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNwQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbEIsSUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFDO1FBRTVCLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQzNDLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxTQUFTLElBQUksUUFBUSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ2hFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbEIsZUFBZSxFQUFFLENBQUM7Z0JBQ2xCLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDekIsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztnQkFDbEQsU0FBUyxFQUFFLENBQUM7WUFDZCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVNLFVBQVUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTO1FBQ3JELDZDQUE2QztRQUM3QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDaEIsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDckQsQ0FBQzt3R0E5OENVLHNCQUFzQjs0R0FBdEIsc0JBQXNCLGNBRnJCLE1BQU07OzRGQUVQLHNCQUFzQjtrQkFIbEMsVUFBVTttQkFBQztvQkFDVixVQUFVLEVBQUUsTUFBTTtpQkFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgKiBhcyBkMyBmcm9tICdkMyc7XG5pbXBvcnQgeyBTdWJqZWN0LCBSZXBsYXlTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBEZXhpZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9kYi9ncmFwaERhdGFiYXNlJztcblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCcsXG59KVxuZXhwb3J0IGNsYXNzIFZpc3VhbGlzZXJHcmFwaFNlcnZpY2Uge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRleGllU2VydmljZTogRGV4aWVTZXJ2aWNlKSB7IH1cbiAgcHVibGljIGxpbmtzID0gW107XG4gIHB1YmxpYyBub2RlcyA9IFtdO1xuICBwdWJsaWMgZ0JydXNoID0gbnVsbDtcbiAgcHVibGljIGJydXNoTW9kZSA9IGZhbHNlO1xuICBwdWJsaWMgYnJ1c2hpbmcgPSBmYWxzZTtcbiAgcHVibGljIHNoaWZ0S2V5O1xuICBwdWJsaWMgZXh0ZW50ID0gbnVsbDtcbiAgcHVibGljIHpvb20gPSBmYWxzZTtcbiAgcHVibGljIHpvb21Ub0ZpdCA9IGZhbHNlO1xuICBwdWJsaWMgcmVzZXRTZWFyY2g7XG4gIC8qKiBSeEpTIHN1YmplY3QgdG8gbGlzdGVuIGZvciB1cGRhdGVzIG9mIHRoZSBzZWxlY3Rpb24gKi9cbiAgcHVibGljIHNlbGVjdGVkTm9kZXNBcnJheSA9IG5ldyBTdWJqZWN0PGFueVtdPigpO1xuICBwdWJsaWMgZGJsQ2xpY2tOb2RlUGF5bG9hZCA9IG5ldyBTdWJqZWN0KCk7XG4gIHB1YmxpYyBkYmxDbGlja0xpbmtQYXlsb2FkID0gbmV3IFN1YmplY3QoKTtcbiAgcHVibGljIHNlbGVjdGVkTGlua0FycmF5ID0gbmV3IFN1YmplY3QoKTtcbiAgcHVibGljIHNhdmVHcmFwaERhdGEgPSBuZXcgUmVwbGF5U3ViamVjdCgpO1xuXG4gIHB1YmxpYyB1cGRhdGUoZGF0YSwgZWxlbWVudCwgem9vbSwgem9vbVRvRml0KSB7XG4gICAgY29uc3Qgc3ZnID0gZDMuc2VsZWN0KGVsZW1lbnQpO1xuICAgIHRoaXMuem9vbSA9IHpvb207XG4gICAgdGhpcy56b29tVG9GaXQgPSB6b29tVG9GaXQ7XG4gICAgcmV0dXJuIHRoaXMuX3VwZGF0ZShkMywgc3ZnLCBkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgdGlja2VkKGxpbmssIG5vZGUsIGVkZ2VwYXRocykge1xuICAgIGxpbmsuZWFjaChmdW5jdGlvbiAoZCwgaSwgbikge1xuICAgICAgLy8gVG90YWwgZGlmZmVyZW5jZSBpbiB4IGFuZCB5IGZyb20gc291cmNlIHRvIHRhcmdldFxuICAgICAgbGV0IGRpZmZYID0gZC50YXJnZXQueCAtIGQuc291cmNlLng7XG4gICAgICBsZXQgZGlmZlkgPSBkLnRhcmdldC55IC0gZC5zb3VyY2UueTtcblxuICAgICAgLy8gTGVuZ3RoIG9mIHBhdGggZnJvbSBjZW50ZXIgb2Ygc291cmNlIG5vZGUgdG8gY2VudGVyIG9mIHRhcmdldCBub2RlXG4gICAgICBsZXQgcGF0aExlbmd0aCA9IE1hdGguc3FydChkaWZmWCAqIGRpZmZYICsgZGlmZlkgKiBkaWZmWSk7XG5cbiAgICAgIC8vIHggYW5kIHkgZGlzdGFuY2VzIGZyb20gY2VudGVyIHRvIG91dHNpZGUgZWRnZSBvZiB0YXJnZXQgbm9kZVxuICAgICAgbGV0IG9mZnNldFggPSAoZGlmZlggKiA0MCkgLyBwYXRoTGVuZ3RoO1xuICAgICAgbGV0IG9mZnNldFkgPSAoZGlmZlkgKiA0MCkgLyBwYXRoTGVuZ3RoO1xuXG4gICAgICBkMy5zZWxlY3QobltpXSlcbiAgICAgICAgLmF0dHIoJ3gxJywgZC5zb3VyY2UueCArIG9mZnNldFgpXG4gICAgICAgIC5hdHRyKCd5MScsIGQuc291cmNlLnkgKyBvZmZzZXRZKVxuICAgICAgICAuYXR0cigneDInLCBkLnRhcmdldC54IC0gb2Zmc2V0WClcbiAgICAgICAgLmF0dHIoJ3kyJywgZC50YXJnZXQueSAtIG9mZnNldFkpO1xuICAgIH0pO1xuXG4gICAgbm9kZS5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGB0cmFuc2xhdGUoJHtkLnh9LCAke2QueSArIDUwfSlgO1xuICAgIH0pO1xuXG4gICAgLy8gU2V0cyBhIGJvdW5kcnkgZm9yIHRoZSBub2Rlc1xuICAgIC8vIG5vZGUuYXR0cignY3gnLCBmdW5jdGlvbiAoZCkge1xuICAgIC8vICAgcmV0dXJuIChkLnggPSBNYXRoLm1heCg0MCwgTWF0aC5taW4oOTAwIC0gMTUsIGQueCkpKTtcbiAgICAvLyB9KTtcbiAgICAvLyBub2RlLmF0dHIoJ2N5JywgZnVuY3Rpb24gKGQpIHtcbiAgICAvLyAgIHJldHVybiAoZC55ID0gTWF0aC5tYXgoNTAsIE1hdGgubWluKDYwMCAtIDQwLCBkLnkpKSk7XG4gICAgLy8gfSk7XG5cbiAgICBlZGdlcGF0aHMuYXR0cignZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gYE0gJHtkLnNvdXJjZS54fSAke2Quc291cmNlLnl9IEwgJHtkLnRhcmdldC54fSAke2QudGFyZ2V0Lnl9YDtcbiAgICB9KTtcblxuICAgIGVkZ2VwYXRocy5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbiAoZCkge1xuICAgICAgaWYgKGQudGFyZ2V0LnggPCBkLnNvdXJjZS54KSB7XG4gICAgICAgIGNvbnN0IGJib3ggPSB0aGlzLmdldEJCb3goKTtcbiAgICAgICAgY29uc3QgcnggPSBiYm94LnggKyBiYm94LndpZHRoIC8gMjtcbiAgICAgICAgY29uc3QgcnkgPSBiYm94LnkgKyBiYm94LmhlaWdodCAvIDI7XG4gICAgICAgIHJldHVybiBgcm90YXRlKDE4MCAke3J4fSAke3J5fSlgO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICdyb3RhdGUoMCknO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0RGVmaW5pdGlvbnMoc3ZnKSB7XG4gICAgY29uc3QgZGVmcyA9IHN2Zy5hcHBlbmQoJ2RlZnMnKTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZU1hcmtlcihpZCwgcmVmWCwgcGF0aCkge1xuICAgICAgZGVmc1xuICAgICAgICAuYXBwZW5kKCdtYXJrZXInKVxuICAgICAgICAuYXR0cignaWQnLCBpZClcbiAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnLTAgLTUgMTAgMTAnKVxuICAgICAgICAuYXR0cigncmVmWCcsIHJlZlgpXG4gICAgICAgIC5hdHRyKCdyZWZZJywgMClcbiAgICAgICAgLmF0dHIoJ29yaWVudCcsICdhdXRvJylcbiAgICAgICAgLmF0dHIoJ21hcmtlcldpZHRoJywgOClcbiAgICAgICAgLmF0dHIoJ21hcmtlckhlaWdodCcsIDgpXG4gICAgICAgIC5hdHRyKCd4b3ZlcmZsb3cnLCAndmlzaWJsZScpXG4gICAgICAgIC5hcHBlbmQoJ3N2ZzpwYXRoJylcbiAgICAgICAgLmF0dHIoJ2QnLCBwYXRoKVxuICAgICAgICAuYXR0cignZmlsbCcsICcjYjRiNGI0JylcbiAgICAgICAgLnN0eWxlKCdzdHJva2UnLCAnbm9uZScpO1xuICAgIH1cblxuICAgIGNyZWF0ZU1hcmtlcignYXJyb3doZWFkVGFyZ2V0JywgMCwgJ00gMCwtNSBMIDEwICwwIEwgMCw1Jyk7XG4gICAgY3JlYXRlTWFya2VyKCdhcnJvd2hlYWRTb3VyY2UnLCAyLCAnTSAxMCAtNSBMIDAgMCBMIDEwIDUnKTtcblxuICAgIHJldHVybiBzdmc7XG4gIH1cblxuICBwcml2YXRlIGZvcmNlU2ltdWxhdGlvbihfZDMsIHsgd2lkdGgsIGhlaWdodCB9KSB7XG4gICAgcmV0dXJuIF9kM1xuICAgICAgLmZvcmNlU2ltdWxhdGlvbigpXG4gICAgICAudmVsb2NpdHlEZWNheSgwLjEpXG4gICAgICAuZm9yY2UoXG4gICAgICAgICdsaW5rJyxcbiAgICAgICAgX2QzXG4gICAgICAgICAgLmZvcmNlTGluaygpXG4gICAgICAgICAgLmlkKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5kaXN0YW5jZSg1MDApXG4gICAgICAgICAgLnN0cmVuZ3RoKDEpXG4gICAgICApXG4gICAgICAuZm9yY2UoJ2NoYXJnZScsIF9kMy5mb3JjZU1hbnlCb2R5KCkuc3RyZW5ndGgoMC4xKSlcbiAgICAgIC5mb3JjZSgnY2VudGVyJywgX2QzLmZvcmNlQ2VudGVyKHdpZHRoIC8gMiwgaGVpZ2h0IC8gMikpXG4gICAgICAuZm9yY2UoJ2NvbGxpc2lvbicsIF9kMy5mb3JjZUNvbGxpZGUoKS5yYWRpdXMoMTUpKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcGFyZUFuZE1hcmtOb2Rlc05ldyhub2Rlcywgb2xkX25vZGVzKSB7XG4gICAgLy8gQ3JlYXRlIGEgbWFwIG9mIGlkcyB0byBub2RlIG9iamVjdHMgZm9yIHRoZSBvbGRfbm9kZXMgYXJyYXlcbiAgICBjb25zdCBvbGRNYXAgPSBvbGRfbm9kZXMucmVkdWNlKChtYXAsIG5vZGUpID0+IHtcbiAgICAgIG1hcFtub2RlLmlkXSA9IG5vZGU7XG4gICAgICByZXR1cm4gbWFwO1xuICAgIH0sIHt9KTtcblxuICAgIC8vIENoZWNrIGVhY2ggbm9kZSBpbiB0aGUgbm9kZXMgYXJyYXkgdG8gc2VlIGlmIGl0J3MgbmV3IG9yIG5vdFxuICAgIG5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgIGlmICghb2xkTWFwW25vZGUuaWRdKSB7XG4gICAgICAgIC8vIE5vZGUgaXMgbmV3LCBtYXJrIGl0IHdpdGggdGhlIG5ld0l0ZW0gcHJvcGVydHlcbiAgICAgICAgbm9kZS5uZXdJdGVtID0gdHJ1ZTtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBkYWdyZSBjb29yZGluYXRlcyBmcm9tIG5ldyBub2RlcyBzbyB3ZSBjYW4gc2V0IGEgcmFuZG9tIG9uZSBpbiB2aWV3XG4gICAgICAgIG5vZGUuZnggPSBudWxsO1xuICAgICAgICBub2RlLmZ5ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlcztcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlTmV3SXRlbShub2Rlcykge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKG5vZGUuaGFzT3duUHJvcGVydHkoJ25ld0l0ZW0nKSkge1xuICAgICAgICBkZWxldGUgbm9kZS5uZXdJdGVtO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG4gIH1cblxuICBwcml2YXRlIHJhbmRvbWlzZU5vZGVQb3NpdGlvbnMobm9kZURhdGEsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICBsZXQgbWluRGlzdGFuY2UgPSAxMDA7XG4gICAgY29uc3QgYXZhaWxhYmxlU3BhY2UgPSB3aWR0aCAqIGhlaWdodDtcbiAgICBsZXQgYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID0gbm9kZURhdGEubGVuZ3RoICogbWluRGlzdGFuY2UgKiBtaW5EaXN0YW5jZTtcblxuICAgIGlmIChhZGp1c3RlZFJlcXVpcmVkU3BhY2UgPiBhdmFpbGFibGVTcGFjZSkge1xuICAgICAgd2hpbGUgKGFkanVzdGVkUmVxdWlyZWRTcGFjZSA+IGF2YWlsYWJsZVNwYWNlICYmIG1pbkRpc3RhbmNlID4gMCkge1xuICAgICAgICBtaW5EaXN0YW5jZSAtPSAxMDtcbiAgICAgICAgYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID0gbm9kZURhdGEubGVuZ3RoICogbWluRGlzdGFuY2UgKiBtaW5EaXN0YW5jZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFkanVzdGVkUmVxdWlyZWRTcGFjZSA+IGF2YWlsYWJsZVNwYWNlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnTm90IGVub3VnaCBzcGFjZSB0byBhY2NvbW1vZGF0ZSBhbGwgbm9kZXMgd2l0aG91dCBhIGZpeGVkIHBvc2l0aW9uLidcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBub2RlRGF0YS5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICBpZiAobm9kZS5meCA9PT0gbnVsbCAmJiBub2RlLmZ5ID09PSBudWxsKSB7XG4gICAgICAgIGxldCBjdXJyZW50TWluRGlzdGFuY2UgPSBtaW5EaXN0YW5jZTtcbiAgICAgICAgbGV0IGNhblBsYWNlTm9kZSA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlICghY2FuUGxhY2VOb2RlICYmIGN1cnJlbnRNaW5EaXN0YW5jZSA+IDApIHtcbiAgICAgICAgICBub2RlLmZ4ID0gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDMyQXJyYXkoMSkpWzBdICUgd2lkdGg7XG4gICAgICAgICAgbm9kZS5meSA9IGNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQzMkFycmF5KDEpKVswXSAlIGhlaWdodDtcblxuICAgICAgICAgIGNhblBsYWNlTm9kZSA9ICFub2RlRGF0YS5zb21lKChvdGhlck5vZGUpID0+IHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgb3RoZXJOb2RlLmZ4ID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIG90aGVyTm9kZS5meSA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICBvdGhlck5vZGUgPT09IG5vZGVcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGR4ID0gb3RoZXJOb2RlLmZ4IC0gbm9kZS5meDtcbiAgICAgICAgICAgIGNvbnN0IGR5ID0gb3RoZXJOb2RlLmZ5IC0gbm9kZS5meTtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpIDwgY3VycmVudE1pbkRpc3RhbmNlO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKCFjYW5QbGFjZU5vZGUpIHtcbiAgICAgICAgICAgIGN1cnJlbnRNaW5EaXN0YW5jZS0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2FuUGxhY2VOb2RlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ05vdCBlbm91Z2ggc3BhY2UgdG8gYWNjb21tb2RhdGUgYWxsIG5vZGVzIHdpdGhvdXQgYSBmaXhlZCBwb3NpdGlvbi4nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGVEYXRhO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIF91cGRhdGUoX2QzLCBzdmcsIGRhdGEpIHtcbiAgICBjb25zdCB7IG5vZGVzLCBsaW5rcyB9ID0gZGF0YTtcbiAgICB0aGlzLm5vZGVzID0gbm9kZXMgfHwgW107XG4gICAgdGhpcy5saW5rcyA9IGxpbmtzIHx8IFtdO1xuXG4gICAgLy8gRGlzYWJsZSB0aGUgcmVzZXQgYnRuXG4gICAgbGV0IHJlc2V0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc2V0X2dyYXBoJyk7XG4gICAgbGV0IHNhdmVCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZV9ncmFwaCcpO1xuICAgIGlmIChyZXNldEJ0bikge1xuICAgICAgcmVzZXRCdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICBzYXZlQnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgIH1cbiAgICAvLyBXaWR0aC9IZWlnaHQgb2YgY2FudmFzXG4gICAgY29uc3QgcGFyZW50V2lkdGggPSBfZDMuc2VsZWN0KCdzdmcnKS5ub2RlKCkucGFyZW50Tm9kZS5jbGllbnRXaWR0aDtcbiAgICBjb25zdCBwYXJlbnRIZWlnaHQgPSBfZDMuc2VsZWN0KCdzdmcnKS5ub2RlKCkucGFyZW50Tm9kZS5jbGllbnRIZWlnaHQ7XG5cbiAgICAvLyBDaGVjayB0byBzZWUgaWYgbm9kZXMgYXJlIGluIERleGllXG4gICAgY29uc3Qgb2xkRGF0YSA9IGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmdldEdyYXBoRGF0YSgnbm9kZXMnKTtcbiAgICBjb25zdCBvbGROb2RlcyA9IG9sZERhdGEgPyBvbGREYXRhLm5vZGVzIDogW107XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2xkTm9kZXMpKSB7XG4gICAgICAvLyBDb21wYXJlIGFuZCBzZXQgcHJvcGVydHkgZm9yIG5ldyBub2Rlc1xuICAgICAgdGhpcy5ub2RlcyA9IHRoaXMuY29tcGFyZUFuZE1hcmtOb2Rlc05ldyhub2Rlcywgb2xkTm9kZXMpO1xuICAgICAgLy8gUmVtb3ZlIG9sZCBub2RlcyBmcm9tIERleGllXG4gICAgICBhd2FpdCB0aGlzLmRleGllU2VydmljZS5kZWxldGVHcmFwaERhdGEoJ25vZGVzJyk7XG4gICAgICAvLyBBZGQgbmV3IG5vZGVzIHRvIERleGllXG4gICAgICBhd2FpdCB0aGlzLmRleGllU2VydmljZS5zYXZlR3JhcGhEYXRhKHsgZGF0YUlkOiAnbm9kZXMnLCBub2RlczogZGF0YS5ub2RlcywgbGlua3M6IGRhdGEubGlua3MgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEFkZCBmaXJzdCBzZXQgb2Ygbm9kZXMgdG8gRGV4aWVcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoeyBkYXRhSWQ6ICdub2RlcycsIG5vZGVzOiBkYXRhLm5vZGVzLCBsaW5rczogZGF0YS5saW5rcyB9KTtcbiAgICB9XG5cbiAgICAvLyBJZiBub2RlcyBkb24ndCBoYXZlIGEgZngvZnkgY29vcmRpbmF0ZSB3ZSBnZW5lcmF0ZSBhIHJhbmRvbSBvbmUgLSBkYWdyZSBub2RlcyB3aXRob3V0IGxpbmtzIGFuZCBuZXcgbm9kZXMgYWRkZWQgdG8gY2FudmFzIGhhdmUgbnVsbCBjb29yZGluYXRlcyBieSBkZXNpZ25cbiAgICB0aGlzLm5vZGVzID0gdGhpcy5yYW5kb21pc2VOb2RlUG9zaXRpb25zKFxuICAgICAgdGhpcy5ub2RlcyxcbiAgICAgIHBhcmVudFdpZHRoLFxuICAgICAgcGFyZW50SGVpZ2h0XG4gICAgKTtcblxuICAgIC8vIEdldHRpbmcgcGFyZW50cyBsaW5lU3R5bGUgYW5kIGFkZGluZyBpdCB0byBjaGlsZCBvYmplY3RzXG4gICAgY29uc3QgcmVsYXRpb25zaGlwc0FycmF5ID0gdGhpcy5saW5rcy5tYXAoXG4gICAgICAoeyBsaW5lU3R5bGUsIHRhcmdldEFycm93LCBzb3VyY2VBcnJvdywgcmVsYXRpb25zaGlwcyB9KSA9PlxuICAgICAgICByZWxhdGlvbnNoaXBzLm1hcCgocikgPT4gKHtcbiAgICAgICAgICBwYXJlbnRMaW5lU3R5bGU6IGxpbmVTdHlsZSxcbiAgICAgICAgICBwYXJlbnRTb3VyY2VBcnJvdzogc291cmNlQXJyb3csXG4gICAgICAgICAgcGFyZW50VGFyZ2V0QXJyb3c6IHRhcmdldEFycm93LFxuICAgICAgICAgIC4uLnIsXG4gICAgICAgIH0pKVxuICAgICk7XG5cbiAgICAvLyBBZGRpbmcgZHkgdmFsdWUgYmFzZWQgb24gbGluayBudW1iZXIgYW5kIHBvc2l0aW9uIGluIHBhcmVudFxuICAgIHJlbGF0aW9uc2hpcHNBcnJheS5tYXAoKGxpbmtSZWxhdGlvbnNoaXApID0+IHtcbiAgICAgIGxpbmtSZWxhdGlvbnNoaXAubWFwKChsaW5rT2JqZWN0LCBpKSA9PiB7XG4gICAgICAgIC8vIGR5IGluY3JlbWVudHMgb2YgMTVweFxuICAgICAgICBsaW5rT2JqZWN0WydkeSddID0gMjAgKyBpICogMTU7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIElFMTEgZG9lcyBub3QgbGlrZSAuZmxhdFxuICAgIHRoaXMubGlua3MgPSByZWxhdGlvbnNoaXBzQXJyYXkucmVkdWNlKChhY2MsIHZhbCkgPT4gYWNjLmNvbmNhdCh2YWwpLCBbXSk7XG5cbiAgICBkMy5zZWxlY3QoJ3N2ZycpLmFwcGVuZCgnZycpO1xuXG4gICAgLy8gWm9vbSBTdGFydFxuICAgIGNvbnN0IHpvb21Db250YWluZXIgPSBfZDMuc2VsZWN0KCdzdmcgZycpO1xuICAgIGxldCBjdXJyZW50Wm9vbSA9IGQzLnpvb21UcmFuc2Zvcm0oZDMuc2VsZWN0KCdzdmcnKS5ub2RlKCkpO1xuICAgIGNvbnN0IHVwZGF0ZVpvb21MZXZlbCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRTY2FsZSA9IGN1cnJlbnRab29tLms7XG4gICAgICBjb25zdCBtYXhTY2FsZSA9IHpvb20uc2NhbGVFeHRlbnQoKVsxXTtcbiAgICAgIGNvbnN0IHpvb21QZXJjZW50YWdlID0gKChjdXJyZW50U2NhbGUgLSAwLjUpIC8gKG1heFNjYWxlIC0gMC41KSkgKiAyMDA7XG4gICAgICBjb25zdCB6b29tTGV2ZWxEaXNwbGF5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb21fbGV2ZWwnKTtcbiAgICAgIGNvbnN0IHpvb21MZXZlbFRleHQgPSBgWm9vbTogJHt6b29tUGVyY2VudGFnZS50b0ZpeGVkKDApfSVgO1xuICAgICAgY29uc3Qgem9vbUluQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb21faW4nKTtcbiAgICAgIGNvbnN0IHpvb21PdXRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbV9vdXQnKTtcbiAgICAgIGNvbnN0IHpvb21SZXNldEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tX3Jlc2V0Jyk7XG5cbiAgICAgIC8vIEl0IG1pZ2h0IG5vdCBleGlzdCBkZXBlbmRpbmcgb24gdGhlIHRoaXMuem9vbSBib29sZWFuXG4gICAgICBpZiAoem9vbVJlc2V0QnRuKSB7XG4gICAgICAgIHpvb21SZXNldEJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgIH1cbiAgICAgIC8vIENoZWNrIGlmIHRoZSB6b29tIGxldmVsIGhhcyBjaGFuZ2VkIGJlZm9yZSB1cGRhdGluZyB0aGUgZGlzcGxheSAvIGFsbG93cyBmb3IgcGFubmluZyB3aXRob3V0IHNob3dpbmcgdGhlIHpvb20gcGVyY2VudGFnZVxuICAgICAgaWYgKHpvb21MZXZlbERpc3BsYXkgJiYgem9vbUxldmVsRGlzcGxheS5pbm5lckhUTUwgIT09IHpvb21MZXZlbFRleHQpIHtcbiAgICAgICAgem9vbUxldmVsRGlzcGxheS5pbm5lckhUTUwgPSB6b29tTGV2ZWxUZXh0O1xuICAgICAgICB6b29tTGV2ZWxEaXNwbGF5LnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGlmICh6b29tTGV2ZWxEaXNwbGF5KSB7XG4gICAgICAgICAgICB6b29tTGV2ZWxEaXNwbGF5LnN0eWxlLm9wYWNpdHkgPSAnMCc7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAyMDAwKTtcbiAgICAgIH1cbiAgICAgIC8vIERpc2FibGUgdGhlIHpvb21JbkJ0biBpZiB0aGUgem9vbSBsZXZlbCBpcyBhdCAyMDAlXG4gICAgICBpZiAoem9vbUluQnRuKSB7XG4gICAgICAgIGlmICh6b29tUGVyY2VudGFnZSA9PT0gMjAwKSB7XG4gICAgICAgICAgem9vbUluQnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHpvb21JbkJ0bi5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIERpc2FibGUgdGhlIHpvb21PdXRCdG4gaWYgdGhlIHpvb20gbGV2ZWwgaXMgYXQgMCVcbiAgICAgIGlmICh6b29tT3V0QnRuKSB7XG4gICAgICAgIGlmICh6b29tUGVyY2VudGFnZSA9PT0gMCkge1xuICAgICAgICAgIHpvb21PdXRCdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgem9vbU91dEJ0bi5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIERpc2FibGUgdGhlIHpvb21SZXNldEJ0biBpZiB0aGUgem9vbSBsZXZlbCBpcyBhdCAxMDAlXG4gICAgICBpZiAoem9vbVJlc2V0QnRuKSB7XG4gICAgICAgIGlmICh6b29tUGVyY2VudGFnZSA9PT0gMTAwKSB7XG4gICAgICAgICAgem9vbVJlc2V0QnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHpvb21SZXNldEJ0bi5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIGxldCB6b29tZWRJbml0O1xuICAgIGNvbnN0IHpvb21lZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IGQzLmV2ZW50LnRyYW5zZm9ybTtcbiAgICAgIHpvb21Db250YWluZXIuYXR0cihcbiAgICAgICAgJ3RyYW5zZm9ybScsXG4gICAgICAgIGB0cmFuc2xhdGUoJHt0cmFuc2Zvcm0ueH0sICR7dHJhbnNmb3JtLnl9KSBzY2FsZSgke3RyYW5zZm9ybS5rfSlgXG4gICAgICApO1xuICAgICAgY3VycmVudFpvb20gPSB0cmFuc2Zvcm07XG4gICAgICB6b29tZWRJbml0ID0gdHJ1ZTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH07XG5cbiAgICBjb25zdCB6b29tID0gZDNcbiAgICAgIC56b29tKClcbiAgICAgIC5zY2FsZUV4dGVudChbMC41LCAxLjVdKVxuICAgICAgLm9uKCdzdGFydCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKCdjdXJzb3InLCB0aGlzLnpvb20gPyBudWxsIDogJ2dyYWJiaW5nJyk7XG4gICAgICB9KVxuICAgICAgLm9uKCd6b29tJywgdGhpcy56b29tID8gem9vbWVkIDogbnVsbClcbiAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoJ2N1cnNvcicsICdncmFiJyk7XG4gICAgICB9KTtcbiAgICBzdmdcbiAgICAgIC5jYWxsKHpvb20pXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdncmFiJylcbiAgICAgIC5vbih0aGlzLnpvb20gPyBudWxsIDogJ3doZWVsLnpvb20nLCBudWxsKVxuICAgICAgLm9uKCdkYmxjbGljay56b29tJywgbnVsbCk7XG4gICAgem9vbS5maWx0ZXIoKCkgPT4gIWQzLmV2ZW50LnNoaWZ0S2V5KTtcblxuICAgIC8vIFpvb20gYnV0dG9uIGNvbnRyb2xzXG4gICAgZDMuc2VsZWN0KCcjem9vbV9pbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHpvb20uc2NhbGVCeShzdmcudHJhbnNpdGlvbigpLmR1cmF0aW9uKDc1MCksIDEuMik7XG4gICAgICB1cGRhdGVab29tTGV2ZWwoKTtcbiAgICB9KTtcbiAgICBkMy5zZWxlY3QoJyN6b29tX291dCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHpvb20uc2NhbGVCeShzdmcudHJhbnNpdGlvbigpLmR1cmF0aW9uKDc1MCksIDAuOCk7XG4gICAgICB1cGRhdGVab29tTGV2ZWwoKTtcbiAgICB9KTtcbiAgICBkMy5zZWxlY3QoJyN6b29tX3Jlc2V0Jykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgem9vbS5zY2FsZVRvKHN2Zy50cmFuc2l0aW9uKCkuZHVyYXRpb24oNzUwKSwgMSk7XG4gICAgICB1cGRhdGVab29tTGV2ZWwoKTtcbiAgICB9KTtcbiAgICAvLyBab29tIHRvIGZpdCBmdW5jdGlvbiBhbmQgQnV0dG9uXG4gICAgY29uc3QgaGFuZGxlWm9vbVRvRml0ID0gKCkgPT4ge1xuICAgICAgY29uc3Qgbm9kZUJCb3ggPSB6b29tQ29udGFpbmVyLm5vZGUoKS5nZXRCQm94KCk7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBzY2FsZSBhbmQgdHJhbnNsYXRlIHZhbHVlcyB0byBmaXQgYWxsIG5vZGVzXG4gICAgICBjb25zdCBwYWRkaW5nID0gMzA7XG4gICAgICBjb25zdCBzY2FsZVggPSAocGFyZW50V2lkdGggLSBwYWRkaW5nICogMikgLyBub2RlQkJveC53aWR0aDtcbiAgICAgIGNvbnN0IHNjYWxlWSA9IChwYXJlbnRIZWlnaHQgLSBwYWRkaW5nICogMikgLyBub2RlQkJveC5oZWlnaHQ7XG4gICAgICBjb25zdCBzY2FsZSA9IE1hdGgubWluKHNjYWxlWCwgc2NhbGVZLCAxLjApOyAvLyBSZXN0cmljdCBzY2FsZSB0byBhIG1heGltdW0gb2YgMS4wXG5cbiAgICAgIGNvbnN0IHRyYW5zbGF0ZVggPVxuICAgICAgICAtbm9kZUJCb3gueCAqIHNjYWxlICsgKHBhcmVudFdpZHRoIC0gbm9kZUJCb3gud2lkdGggKiBzY2FsZSkgLyAyO1xuICAgICAgY29uc3QgdHJhbnNsYXRlWSA9XG4gICAgICAgIC1ub2RlQkJveC55ICogc2NhbGUgKyAocGFyZW50SGVpZ2h0IC0gbm9kZUJCb3guaGVpZ2h0ICogc2NhbGUpIC8gMjtcblxuICAgICAgLy8gR2V0IHRoZSBib3VuZGluZyBib3ggb2YgYWxsIG5vZGVzXG4gICAgICBjb25zdCBhbGxOb2RlcyA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJyk7XG4gICAgICBjb25zdCBhbGxOb2Rlc0JCb3ggPSBhbGxOb2Rlcy5ub2RlcygpLnJlZHVjZShcbiAgICAgICAgKGFjYywgbm9kZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5vZGVCQm94ID0gbm9kZS5nZXRCQm94KCk7XG4gICAgICAgICAgYWNjLnggPSBNYXRoLm1pbihhY2MueCwgbm9kZUJCb3gueCk7XG4gICAgICAgICAgYWNjLnkgPSBNYXRoLm1pbihhY2MueSwgbm9kZUJCb3gueSk7XG4gICAgICAgICAgYWNjLndpZHRoID0gTWF0aC5tYXgoYWNjLndpZHRoLCBub2RlQkJveC54ICsgbm9kZUJCb3gud2lkdGgpO1xuICAgICAgICAgIGFjYy5oZWlnaHQgPSBNYXRoLm1heChhY2MuaGVpZ2h0LCBub2RlQkJveC55ICsgbm9kZUJCb3guaGVpZ2h0KTtcbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LFxuICAgICAgICB7IHg6IEluZmluaXR5LCB5OiBJbmZpbml0eSwgd2lkdGg6IC1JbmZpbml0eSwgaGVpZ2h0OiAtSW5maW5pdHkgfVxuICAgICAgKTtcblxuICAgICAgLy8gQ2hlY2sgaWYgYWxsIG5vZGVzIGFyZSB3aXRoaW4gdGhlIHZpZXdhYmxlIGNvbnRhaW5lclxuICAgICAgaWYgKFxuICAgICAgICBhbGxOb2Rlc0JCb3gueCAqIHNjYWxlID49IDAgJiZcbiAgICAgICAgYWxsTm9kZXNCQm94LnkgKiBzY2FsZSA+PSAwICYmXG4gICAgICAgIGFsbE5vZGVzQkJveC53aWR0aCAqIHNjYWxlIDw9IHBhcmVudFdpZHRoICYmXG4gICAgICAgIGFsbE5vZGVzQkJveC5oZWlnaHQgKiBzY2FsZSA8PSBwYXJlbnRIZWlnaHRcbiAgICAgICkge1xuICAgICAgICAvLyBBbGwgbm9kZXMgYXJlIHdpdGhpbiB0aGUgdmlld2FibGUgY29udGFpbmVyLCBubyBuZWVkIHRvIGFwcGx5IHpvb20gdHJhbnNmb3JtXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTWFudWFsbHkgcmVzZXQgdGhlIHpvb20gdHJhbnNmb3JtXG4gICAgICB6b29tQ29udGFpbmVyXG4gICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgLmR1cmF0aW9uKDc1MClcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoMCwgMCkgc2NhbGUoMSknKTtcblxuICAgICAgLy8gQXBwbHkgem9vbSB0cmFuc2Zvcm0gdG8gem9vbUNvbnRhaW5lclxuICAgICAgem9vbUNvbnRhaW5lclxuICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbig3NTApXG4gICAgICAgIC5hdHRyKFxuICAgICAgICAgICd0cmFuc2Zvcm0nLFxuICAgICAgICAgIGB0cmFuc2xhdGUoJHt0cmFuc2xhdGVYfSwgJHt0cmFuc2xhdGVZfSkgc2NhbGUoJHtzY2FsZX0pYFxuICAgICAgICApO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnRab29tIHZhcmlhYmxlIHdpdGggdGhlIG5ldyB0cmFuc2Zvcm1cbiAgICAgIC8vIHpvb21lZEluaXQgLSBjcmVhdGVkIGJlY2F1c2UgaWYgem9vbVRvRml0IGlzIGNhbGxlZCBiZWZvcmUgYW55dGhpbmcgZWxzZSBpdCBzY3Jld3MgdXAgdGhlIGJhc2UgdHJhbnNmb3JtIC0gZS5nLiBzaG93Q3VycmVudE1hdGNoXG4gICAgICBpZiAoem9vbWVkSW5pdCkge1xuICAgICAgICBjdXJyZW50Wm9vbS54ID0gdHJhbnNsYXRlWDtcbiAgICAgICAgY3VycmVudFpvb20ueSA9IHRyYW5zbGF0ZVk7XG4gICAgICAgIGN1cnJlbnRab29tLmsgPSBzY2FsZTtcbiAgICAgIH1cbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH07XG5cbiAgICBkMy5zZWxlY3QoJyN6b29tX3RvX2ZpdCcpLm9uKCdjbGljaycsIGhhbmRsZVpvb21Ub0ZpdCk7XG5cbiAgICAvLyBDaGVjayBpZiB6b29tIGxldmVsIGlzIGF0IDAlIG9yIDEwMCUgYmVmb3JlIGFsbG93aW5nIG1vdXNld2hlZWwgem9vbSAtIHRoaXMgc3RhYmlsaXNlcyB0aGUgY2FudmFzIHdoZW4gdGhlIGxpbWl0IGlzIHJlYWNoZWRcbiAgICBzdmcub24oJ3doZWVsJywgKCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudFNjYWxlID0gY3VycmVudFpvb20uaztcbiAgICAgIGNvbnN0IG1heFNjYWxlID0gem9vbS5zY2FsZUV4dGVudCgpWzFdO1xuICAgICAgY29uc3QgbWluU2NhbGUgPSB6b29tLnNjYWxlRXh0ZW50KClbMF07XG4gICAgICBpZiAoY3VycmVudFNjYWxlID09PSBtYXhTY2FsZSB8fCBjdXJyZW50U2NhbGUgPT09IG1pblNjYWxlKSB7XG4gICAgICAgIGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBab29tIEVuZFxuICAgIC8vIFNlbGVjdGlvbiBidXR0b25zXG4gICAgY29uc3Qgc2VsZWN0QWxsTm9kZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VsZWN0X2FsbCcpO1xuICAgIGNvbnN0IGhhbmRsZVNlbGVjdEFsbE5vZGVzID0gKCkgPT4ge1xuICAgICAgY29uc3QgdG90YWxTaXplID0gbm9kZUVudGVyLnNpemUoKTtcbiAgICAgIGNvbnN0IG5vblNlbGVjdGVkTm9kZXMgPSBkMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXI6bm90KC5zZWxlY3RlZCknKTtcbiAgICAgIGNvbnN0IGNvdW50ID0gbm9uU2VsZWN0ZWROb2Rlcy5zaXplKCk7XG4gICAgICBjb25zdCBub3RTZWxlY3RlZFNpemUgPSB0b3RhbFNpemUgLSBjb3VudDtcblxuICAgICAgaWYgKG5vdFNlbGVjdGVkU2l6ZSAhPT0gdG90YWxTaXplKSB7XG4gICAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWRcIj48L2k+JztcbiAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcwLjY1JztcbiAgICAgICAgX2QzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICBwLnByZXZpb3VzbHlTZWxlY3RlZCA9IHAuc2VsZWN0ZWQ7XG4gICAgICAgICAgcmV0dXJuIChwLnNlbGVjdGVkID0gdHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBkMy5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgKGQpID0+IChkLnNlbGVjdGVkID8gJ2JsdWUnIDogJyM5OTknKSlcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgKGQpID0+IChkLnNlbGVjdGVkID8gNzAwIDogNDAwKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+JztcbiAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgICAgX2QzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLmNsYXNzZWQoJ3NlbGVjdGVkJywgZmFsc2UpO1xuICAgICAgICBfZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgIHJldHVybiAocC5zZWxlY3RlZCA9IHAucHJldmlvdXNseVNlbGVjdGVkID0gZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICB9XG4gICAgICAvLyByZXNldCBsaW5rIHN0eWxlXG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgfTtcbiAgICBkMy5zZWxlY3QoJyNzZWxlY3RfYWxsJykub24oJ2NsaWNrJywgaGFuZGxlU2VsZWN0QWxsTm9kZXMpO1xuXG4gICAgY29uc3QgaGFuZGxlVG9nZ2xlU2VsZWN0aW9uID0gKCkgPT4ge1xuICAgICAgY29uc3QgdG90YWxTaXplID0gbm9kZUVudGVyLnNpemUoKTtcbiAgICAgIGNvbnN0IHNlbGVjdGVkTm9kZXMgPSBkMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXIuc2VsZWN0ZWQnKTtcbiAgICAgIGNvbnN0IG5vblNlbGVjdGVkTm9kZXMgPSBkMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXI6bm90KC5zZWxlY3RlZCknKTtcbiAgICAgIGNvbnN0IHNlbGVjdGVkQ291bnQgPSBzZWxlY3RlZE5vZGVzLnNpemUoKTtcbiAgICAgIGNvbnN0IG5vblNlbGVjdGVkQ291bnQgPSBub25TZWxlY3RlZE5vZGVzLnNpemUoKTtcblxuICAgICAgaWYgKHNlbGVjdGVkQ291bnQgPiAwKSB7XG4gICAgICAgIC8vIERlc2VsZWN0IHNlbGVjdGVkIG5vZGVzIGFuZCBzZWxlY3Qgbm9uLXNlbGVjdGVkIG5vZGVzXG4gICAgICAgIHNlbGVjdGVkTm9kZXMuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgIHAucHJldmlvdXNseVNlbGVjdGVkID0gcC5zZWxlY3RlZDtcbiAgICAgICAgICByZXR1cm4gKHAuc2VsZWN0ZWQgPSBmYWxzZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5vblNlbGVjdGVkTm9kZXMuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgIHAucHJldmlvdXNseVNlbGVjdGVkID0gcC5zZWxlY3RlZDtcbiAgICAgICAgICByZXR1cm4gKHAuc2VsZWN0ZWQgPSB0cnVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG9ubHkgdHdvIG5vZGVzIHNlbGVjdGVkIHdlIG5lZWQgdG8gdXBkYXRlIHRoZSBzdWJqZWN0IHNlbGVjdGVkTm9kZXNBcnJheSBzbyB3ZSBjYW4gY3JlYXRlIGEgbmV3IGxpbmsgd2l0aCB0aGUgY29ycmVjdCBub2RlcyBhdHRhY2hlZC5cbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRTaXplID0gc3ZnLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuc2l6ZSgpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRTaXplIDw9IDIpIHtcbiAgICAgICAgICAvLyBnZXQgZGF0YSBmcm9tIG5vZGVcbiAgICAgICAgICBjb25zdCBsb2NhbHNlbGVjdGVkTm9kZXNBcnJheSA9IF9kMy5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpLmRhdGEoKTtcbiAgICAgICAgICBjb25zdCBmaWx0ZXJJZCA9IGxvY2Fsc2VsZWN0ZWROb2Rlc0FycmF5LmZpbHRlcigoeCkgPT4geCk7XG4gICAgICAgICAgc2VsZi5zZWxlY3RlZE5vZGVzQXJyYXkubmV4dChmaWx0ZXJJZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgc3R5bGVzIG9mIG5vZGUgZWxlbWVudHNcbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAoZCkgPT4gKGQuc2VsZWN0ZWQgPyAnYmx1ZScgOiAnIzIxMjUyOScpKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCAoZCkgPT4gKGQuc2VsZWN0ZWQgPyA3MDAgOiA0MDApKTtcbiAgICAgIH0gZWxzZSBpZiAobm9uU2VsZWN0ZWRDb3VudCA+IDApIHtcbiAgICAgICAgLy8gU2VsZWN0IGFsbCBub2RlcyBpZiBub25lIGFyZSBzZWxlY3RlZFxuICAgICAgICBfZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgIHAucHJldmlvdXNseVNlbGVjdGVkID0gcC5zZWxlY3RlZDtcbiAgICAgICAgICByZXR1cm4gKHAuc2VsZWN0ZWQgPSB0cnVlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0eWxlcyBvZiBub2RlIGVsZW1lbnRzXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnYmx1ZScpO1xuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgdGhlIHN0YXRlIG9mIGFub3RoZXIgYnV0dG9uIGJhc2VkIG9uIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgY29uc3QgdXBkYXRlZFNlbGVjdGVkQ291bnQgPVxuICAgICAgICBzZWxlY3RlZENvdW50ID4gMCA/IHRvdGFsU2l6ZSAtIHNlbGVjdGVkQ291bnQgOiB0b3RhbFNpemU7XG4gICAgICBpZiAodXBkYXRlZFNlbGVjdGVkQ291bnQgPT09IHRvdGFsU2l6ZSkge1xuICAgICAgICAvLyBVcGRhdGUgdGhlIHN0YXRlIG9mIGFub3RoZXIgYnV0dG9uIGlmIGFsbCBub2RlcyBhcmUgc2VsZWN0ZWRcbiAgICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZFwiPjwvaT4nO1xuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzAuNjUnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVXBkYXRlIHRoZSBzdGF0ZSBvZiBhbm90aGVyIGJ1dHRvbiBpZiBub3QgYWxsIG5vZGVzIGFyZSBzZWxlY3RlZFxuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+JztcbiAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgIH1cbiAgICAgIC8vIHJlc2V0IGxpbmsgc3R5bGVcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICB9O1xuXG4gICAgZDMuc2VsZWN0KCcjdG9nZ2xlX3NlbGVjdGlvbicpLm9uKCdjbGljaycsIGhhbmRsZVRvZ2dsZVNlbGVjdGlvbik7XG5cbiAgICAvLyBzZWFyY2hcbiAgICBjb25zdCBzZWFyY2hCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VhcmNoQnV0dG9uJyk7XG4gICAgLy8gQ2hlY2sgdG8gc2VlIGlmIGV4aXN0cyAtIGNvbnRyb2wgYm9vbFxuICAgIGlmIChzZWFyY2hCdG4pIHtcbiAgICAgIGNvbnN0IHNlYXJjaElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICdzZWFyY2hJbnB1dCdcbiAgICAgICkgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICAgIGNvbnN0IGNsZWFyQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICdjbGVhckJ1dHRvbidcbiAgICAgICkgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgICBjb25zdCBoYW5kbGVTZWFyY2ggPSAoZXZlbnQ6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgcGVyZm9ybVNlYXJjaCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBsZXQgbWF0Y2hpbmdOb2RlcyA9IFtdO1xuICAgICAgbGV0IGN1cnJlbnRNYXRjaEluZGV4ID0gLTE7XG5cbiAgICAgIGNvbnN0IHNob3dDdXJyZW50TWF0Y2ggPSAoKSA9PiB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXNseSBhZGRlZCBiYWNrZ3JvdW5kIGNpcmNsZVxuICAgICAgICBkMy5zZWxlY3RBbGwoJ2NpcmNsZS5oaWdobGlnaHQtYmFja2dyb3VuZCcpLnJlbW92ZSgpO1xuXG4gICAgICAgIGNvbnN0IG1hdGNoaW5nTm9kZSA9IG1hdGNoaW5nTm9kZXNbY3VycmVudE1hdGNoSW5kZXhdO1xuICAgICAgICAvLyBIaWdobGlnaHQgdGhlIG1hdGNoaW5nIG5vZGVcbiAgICAgICAgY29uc3Qgbm9kZVdyYXBwZXIgPSBkMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5maWx0ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcykuYXR0cignaWQnKSA9PT0gbWF0Y2hpbmdOb2RlLmlkO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgYSBuZXcgYmFja2dyb3VuZCBjaXJjbGUgdG8gdGhlIGVudGlyZSA8Zz4gbm9kZVxuICAgICAgICBjb25zdCBiYm94ID0gbm9kZVdyYXBwZXIubm9kZSgpLmdldEJCb3goKTtcbiAgICAgICAgY29uc3QgY2VudGVyWCA9IGJib3gueCArIGJib3gud2lkdGggLyAyO1xuICAgICAgICBjb25zdCBjZW50ZXJZID0gYmJveC55ICsgYmJveC5oZWlnaHQgLyAyO1xuICAgICAgICBjb25zdCByYWRpdXMgPSBNYXRoLm1heChiYm94LndpZHRoICsgMzAsIGJib3guaGVpZ2h0KSAvIDI7XG5cbiAgICAgICAgY29uc3QgYmFja2dyb3VuZENpcmNsZSA9IG5vZGVXcmFwcGVyXG4gICAgICAgICAgLmluc2VydCgnY2lyY2xlJywgJzpmaXJzdC1jaGlsZCcpXG4gICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2hpZ2hsaWdodC1iYWNrZ3JvdW5kJylcbiAgICAgICAgICAuYXR0cignZmlsbCcsICd5ZWxsb3cnKVxuICAgICAgICAgIC5hdHRyKCdvcGFjaXR5JywgJzAuMycpXG4gICAgICAgICAgLmF0dHIoJ2N4JywgY2VudGVyWClcbiAgICAgICAgICAuYXR0cignY3knLCBjZW50ZXJZKTtcblxuICAgICAgICAvLyBBbmltYXRlIHRoZSBiYWNrZ3JvdW5kIGNpcmNsZVxuICAgICAgICBiYWNrZ3JvdW5kQ2lyY2xlXG4gICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgICAgIC5hdHRyKCdyJywgcmFkaXVzKVxuICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgICAgICAuYXR0cigncicsIHJhZGl1cyAvIDQpXG4gICAgICAgICAgLmF0dHIoJ29wYWNpdHknLCAnMC41JylcbiAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAgICAgLmF0dHIoJ3InLCByYWRpdXMpXG4gICAgICAgICAgLmF0dHIoJ29wYWNpdHknLCAnMC4zJyk7XG5cbiAgICAgICAgLy8gWm9vbSB0byB0aGUgbWF0Y2hpbmcgbm9kZVxuICAgICAgICBjb25zdCB6b29tVHJhbnNmb3JtID0gZDMuem9vbVRyYW5zZm9ybShzdmcubm9kZSgpKTtcbiAgICAgICAgY29uc3QgeyB4LCB5LCBrIH0gPSB6b29tVHJhbnNmb3JtO1xuICAgICAgICBjb25zdCB7IGZ4LCBmeSB9ID0gbWF0Y2hpbmdOb2RlO1xuICAgICAgICBjb25zdCBuZXdab29tVHJhbnNmb3JtID0gZDMuem9vbUlkZW50aXR5XG4gICAgICAgICAgLnRyYW5zbGF0ZSgtZnggKiBrICsgcGFyZW50V2lkdGggLyAyLCAtZnkgKiBrICsgcGFyZW50SGVpZ2h0IC8gMilcbiAgICAgICAgICAuc2NhbGUoayk7XG4gICAgICAgIHpvb21Db250YWluZXJcbiAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKDc1MClcbiAgICAgICAgICAuY2FsbCh6b29tLnRyYW5zZm9ybSwgbmV3Wm9vbVRyYW5zZm9ybSk7XG5cbiAgICAgICAgLy8gRGlzYWJsZS9FbmFibGUgbmF2aWdhdGlvbiBidXR0b25zXG4gICAgICAgIGNvbnN0IHByZXZCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAncHJldkJ1dHRvbidcbiAgICAgICAgKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICAgICAgY29uc3QgbmV4dEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICduZXh0QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBwcmV2QnV0dG9uLmRpc2FibGVkID0gY3VycmVudE1hdGNoSW5kZXggPT09IDA7XG4gICAgICAgIG5leHRCdXR0b24uZGlzYWJsZWQgPSBjdXJyZW50TWF0Y2hJbmRleCA9PT0gbWF0Y2hpbmdOb2Rlcy5sZW5ndGggLSAxO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgcGVyZm9ybVNlYXJjaCA9ICgpID0+IHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91c2x5IGFkZGVkIGJhY2tncm91bmQgY2lyY2xlXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnY2lyY2xlLmhpZ2hsaWdodC1iYWNrZ3JvdW5kJykucmVtb3ZlKCk7XG5cbiAgICAgICAgY29uc3Qgc2VhcmNoVGVybSA9IHNlYXJjaElucHV0LnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgICAgIGlmIChzZWFyY2hUZXJtLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgLy8gUGVyZm9ybSB0aGUgc2VhcmNoXG4gICAgICAgICAgbWF0Y2hpbmdOb2RlcyA9IHRoaXMubm9kZXMuZmlsdGVyKChub2RlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IG5vZGUubGFiZWwubWFwKChpdGVtKSA9PiBpdGVtLnRvTG93ZXJDYXNlKCkpO1xuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICBsYWJlbC5zb21lKChsYWJlbEl0ZW0pID0+IGxhYmVsSXRlbS5pbmNsdWRlcyhzZWFyY2hUZXJtKSkgfHxcbiAgICAgICAgICAgICAgbm9kZS5sYWJlbC5zb21lKChvYmopID0+XG4gICAgICAgICAgICAgICAgT2JqZWN0LnZhbHVlcyhvYmopLnNvbWUoKHZhbHVlKSA9PlxuICAgICAgICAgICAgICAgICAgU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaFRlcm0pXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKG1hdGNoaW5nTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY3VycmVudE1hdGNoSW5kZXggPSAwO1xuICAgICAgICAgICAgc2hvd0N1cnJlbnRNYXRjaCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdXJyZW50TWF0Y2hJbmRleCA9IC0xO1xuICAgICAgICAgICAgc2hvd05vTWF0Y2hlcygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBDbGVhciBzZWFyY2hcbiAgICAgICAgICBtYXRjaGluZ05vZGVzID0gW107XG4gICAgICAgICAgY3VycmVudE1hdGNoSW5kZXggPSAtMTtcbiAgICAgICAgICBzaG93Tm9NYXRjaGVzKCk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGVDbGVhckJ1dHRvbigpO1xuICAgICAgfTtcblxuICAgICAgY29uc3Qgc2hvd05vTWF0Y2hlcyA9ICgpID0+IHtcbiAgICAgICAgLy8gUmVzZXQgem9vbSBsZXZlbFxuICAgICAgICBjb25zdCBuZXdab29tVHJhbnNmb3JtID0gZDMuem9vbUlkZW50aXR5LnRyYW5zbGF0ZSgwLCAwKS5zY2FsZSgxKTtcbiAgICAgICAgem9vbUNvbnRhaW5lclxuICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24oNzUwKVxuICAgICAgICAgIC5jYWxsKHpvb20udHJhbnNmb3JtLCBuZXdab29tVHJhbnNmb3JtKTtcbiAgICAgICAgdXBkYXRlWm9vbUxldmVsKCk7XG4gICAgICAgIC8vIERpc2FibGUgbmF2aWdhdGlvbiBidXR0b25zXG4gICAgICAgIGNvbnN0IHByZXZCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAncHJldkJ1dHRvbidcbiAgICAgICAgKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICAgICAgY29uc3QgbmV4dEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICduZXh0QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBwcmV2QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgbmV4dEJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gU2hvdyBcIm5vIG1hdGNoZXMgZm91bmRcIiB0ZXh0IHdpdGggZmFkZS1pbiB0cmFuc2l0aW9uXG4gICAgICAgIGNvbnN0IG5vTWF0Y2hlc1RleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbm9NYXRjaGVzVGV4dCcpO1xuICAgICAgICBpZiAoc2VhcmNoSW5wdXQudmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgbm9NYXRjaGVzVGV4dC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG4gICAgICAgICAgLy8gRmFkZSBhd2F5IGFmdGVyIGEgZmV3IHNlY29uZHNcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIC8vIEhpZGUgXCJubyBtYXRjaGVzIGZvdW5kXCIgdGV4dCB3aXRoIGZhZGUtb3V0IHRyYW5zaXRpb25cbiAgICAgICAgICAgIG5vTWF0Y2hlc1RleHQuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBuYXZpZ2F0ZU5leHQgPSAoKSA9PiB7XG4gICAgICAgIGlmIChjdXJyZW50TWF0Y2hJbmRleCA8IG1hdGNoaW5nTm9kZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIGN1cnJlbnRNYXRjaEluZGV4Kys7XG4gICAgICAgICAgc2hvd0N1cnJlbnRNYXRjaCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBuYXZpZ2F0ZVByZXZpb3VzID0gKCkgPT4ge1xuICAgICAgICBpZiAoY3VycmVudE1hdGNoSW5kZXggPiAwKSB7XG4gICAgICAgICAgY3VycmVudE1hdGNoSW5kZXgtLTtcbiAgICAgICAgICBzaG93Q3VycmVudE1hdGNoKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNsZWFyU2VhcmNoSW5wdXQgPSAoKSA9PiB7XG4gICAgICAgIHNlYXJjaElucHV0LnZhbHVlID0gJyc7XG4gICAgICAgIHNlYXJjaElucHV0LmZvY3VzKCk7XG4gICAgICAgIHVwZGF0ZUNsZWFyQnV0dG9uKCk7XG4gICAgICAgIG1hdGNoaW5nTm9kZXMgPSBbXTtcbiAgICAgICAgY3VycmVudE1hdGNoSW5kZXggPSAtMTtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91c2x5IGFkZGVkIGJhY2tncm91bmQgY2lyY2xlXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnY2lyY2xlLmhpZ2hsaWdodC1iYWNrZ3JvdW5kJykucmVtb3ZlKCk7XG5cbiAgICAgICAgLy8gRGlzYWJsZSB0aGUgbmV4dEJ1dHRvbiAmIHByZXZCdXR0b25cbiAgICAgICAgY29uc3QgbmV4dEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICduZXh0QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBuZXh0QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcHJldkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICdwcmV2QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBwcmV2QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHVwZGF0ZUNsZWFyQnV0dG9uID0gKCkgPT4ge1xuICAgICAgICBjbGVhckJ1dHRvbi5kaXNhYmxlZCA9IHNlYXJjaElucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPT09IDA7XG4gICAgICB9O1xuXG4gICAgICAvLyBXZSByZXNldCB0aGUgc2VhcmNoIHdoZW4gd2UgcmVzZXQgdGhlIGRhdGFcbiAgICAgIGlmICh0aGlzLnJlc2V0U2VhcmNoKSB7XG4gICAgICAgIGNsZWFyU2VhcmNoSW5wdXQoKTtcbiAgICAgICAgdGhpcy5yZXNldFNlYXJjaCA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBzZWFyY2hJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIHVwZGF0ZUNsZWFyQnV0dG9uKTtcbiAgICAgIHNlYXJjaEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBlcmZvcm1TZWFyY2gpO1xuICAgICAgY2xlYXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbGVhclNlYXJjaElucHV0KTtcbiAgICAgIGRvY3VtZW50XG4gICAgICAgIC5nZXRFbGVtZW50QnlJZCgnc2VhcmNoSW5wdXQnKVxuICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZVNlYXJjaCk7XG4gICAgICBkb2N1bWVudFxuICAgICAgICAuZ2V0RWxlbWVudEJ5SWQoJ25leHRCdXR0b24nKVxuICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuYXZpZ2F0ZU5leHQpO1xuICAgICAgZG9jdW1lbnRcbiAgICAgICAgLmdldEVsZW1lbnRCeUlkKCdwcmV2QnV0dG9uJylcbiAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmF2aWdhdGVQcmV2aW91cyk7XG4gICAgfVxuICAgIC8vIEZvciBhcnJvd3NcbiAgICB0aGlzLmluaXREZWZpbml0aW9ucyhzdmcpO1xuXG4gICAgY29uc3Qgc2ltdWxhdGlvbiA9IHRoaXMuZm9yY2VTaW11bGF0aW9uKF9kMywge1xuICAgICAgd2lkdGg6ICtzdmcuYXR0cignd2lkdGgnKSxcbiAgICAgIGhlaWdodDogK3N2Zy5hdHRyKCdoZWlnaHQnKSxcbiAgICB9KTtcblxuICAgIC8vIEJydXNoIFN0YXJ0XG4gICAgbGV0IGdCcnVzaEhvbGRlciA9IHN2Zy5hcHBlbmQoJ2cnKTtcblxuICAgIGxldCBicnVzaCA9IGQzXG4gICAgICAuYnJ1c2goKVxuICAgICAgLm9uKCdzdGFydCcsICgpID0+IHtcbiAgICAgICAgdGhpcy5icnVzaGluZyA9IHRydWU7XG5cbiAgICAgICAgbm9kZUVudGVyLmVhY2goKGQpID0+IHtcbiAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IHRoaXMuc2hpZnRLZXkgJiYgZC5zZWxlY3RlZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgfSlcbiAgICAgIC5vbignYnJ1c2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZXh0ZW50ID0gZDMuZXZlbnQuc2VsZWN0aW9uO1xuICAgICAgICBpZiAoIWQzLmV2ZW50LnNvdXJjZUV2ZW50IHx8ICF0aGlzLmV4dGVudCB8fCAhdGhpcy5icnVzaE1vZGUpIHJldHVybjtcbiAgICAgICAgaWYgKCFjdXJyZW50Wm9vbSkgcmV0dXJuO1xuXG4gICAgICAgIG5vZGVFbnRlclxuICAgICAgICAgIC5jbGFzc2VkKCdzZWxlY3RlZCcsIChkKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gKGQuc2VsZWN0ZWQgPVxuICAgICAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCBeXG4gICAgICAgICAgICAgICg8YW55PihcbiAgICAgICAgICAgICAgICAoZDMuZXZlbnQuc2VsZWN0aW9uWzBdWzBdIDw9XG4gICAgICAgICAgICAgICAgICBkLnggKiBjdXJyZW50Wm9vbS5rICsgY3VycmVudFpvb20ueCAmJlxuICAgICAgICAgICAgICAgICAgZC54ICogY3VycmVudFpvb20uayArIGN1cnJlbnRab29tLnggPFxuICAgICAgICAgICAgICAgICAgZDMuZXZlbnQuc2VsZWN0aW9uWzFdWzBdICYmXG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5zZWxlY3Rpb25bMF1bMV0gPD1cbiAgICAgICAgICAgICAgICAgIGQueSAqIGN1cnJlbnRab29tLmsgKyBjdXJyZW50Wm9vbS55ICYmXG4gICAgICAgICAgICAgICAgICBkLnkgKiBjdXJyZW50Wm9vbS5rICsgY3VycmVudFpvb20ueSA8XG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5zZWxlY3Rpb25bMV1bMV0pXG4gICAgICAgICAgICAgICkpKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zZWxlY3QoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLmNsYXNzZWQoJ3NlbGVjdGVkJywgKGQpID0+IGQuc2VsZWN0ZWQpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgKGQpID0+IChkLnNlbGVjdGVkID8gJ2JsdWUnIDogJyM5OTknKSlcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgKGQpID0+IChkLnNlbGVjdGVkID8gNzAwIDogNDAwKSk7XG5cbiAgICAgICAgdGhpcy5leHRlbnQgPSBkMy5ldmVudC5zZWxlY3Rpb247XG4gICAgICB9KVxuICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGlmICghZDMuZXZlbnQuc291cmNlRXZlbnQgfHwgIXRoaXMuZXh0ZW50IHx8ICF0aGlzLmdCcnVzaCkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuZ0JydXNoLmNhbGwoYnJ1c2gubW92ZSwgbnVsbCk7XG4gICAgICAgIGlmICghdGhpcy5icnVzaE1vZGUpIHtcbiAgICAgICAgICAvLyB0aGUgc2hpZnQga2V5IGhhcyBiZWVuIHJlbGVhc2UgYmVmb3JlIHdlIGVuZGVkIG91ciBicnVzaGluZ1xuICAgICAgICAgIHRoaXMuZ0JydXNoLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMuZ0JydXNoID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJydXNoaW5nID0gZmFsc2U7XG5cbiAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgLnNlbGVjdCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuY2xhc3NlZCgnc2VsZWN0ZWQnKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcblxuICAgICAgICBjb25zdCB0b3RhbFNpemUgPSBub2RlRW50ZXIuc2l6ZSgpO1xuICAgICAgICBjb25zdCBub25TZWxlY3RlZE5vZGVzID0gZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyOm5vdCguc2VsZWN0ZWQpJyk7XG4gICAgICAgIGNvbnN0IGNvdW50ID0gbm9uU2VsZWN0ZWROb2Rlcy5zaXplKCk7XG4gICAgICAgIGNvbnN0IG5vdFNlbGVjdGVkU2l6ZSA9IHRvdGFsU2l6ZSAtIGNvdW50O1xuXG4gICAgICAgIGlmIChub3RTZWxlY3RlZFNpemUgPT09IHRvdGFsU2l6ZSkge1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWRcIj48L2k+JztcbiAgICAgICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzAuNjUnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWQtZmlsbFwiPjwvaT4nO1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb3VudHMgbnVtYmVyIG9mIHNlbGVjdGVkIGNsYXNzZXMgdG8gbm90IGV4Y2VlZCAyXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkU2l6ZSA9IG5vZGVFbnRlci5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpLnNpemUoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkU2l6ZSA8PSAyKSB7XG4gICAgICAgICAgLy8gZ2V0IGRhdGEgZnJvbSBub2RlXG4gICAgICAgICAgY29uc3QgbG9jYWxzZWxlY3RlZE5vZGVzQXJyYXkgPSBub2RlRW50ZXJcbiAgICAgICAgICAgIC5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpXG4gICAgICAgICAgICAuZGF0YSgpO1xuICAgICAgICAgIGNvbnN0IGZpbHRlcklkID0gbG9jYWxzZWxlY3RlZE5vZGVzQXJyYXkuZmlsdGVyKCh4KSA9PiB4KTtcbiAgICAgICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KGZpbHRlcklkKTtcbiAgICAgICAgICByZXR1cm4gZmlsdGVySWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZi5zZWxlY3RlZE5vZGVzQXJyYXkubmV4dChbXSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgbGV0IGtleXVwID0gKCkgPT4ge1xuICAgICAgdGhpcy5zaGlmdEtleSA9IGZhbHNlO1xuICAgICAgdGhpcy5icnVzaE1vZGUgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLmdCcnVzaCAmJiAhdGhpcy5icnVzaGluZykge1xuICAgICAgICAvLyBvbmx5IHJlbW92ZSB0aGUgYnJ1c2ggaWYgd2UncmUgbm90IGFjdGl2ZWx5IGJydXNoaW5nXG4gICAgICAgIC8vIG90aGVyd2lzZSBpdCdsbCBiZSByZW1vdmVkIHdoZW4gdGhlIGJydXNoaW5nIGVuZHNcbiAgICAgICAgdGhpcy5nQnJ1c2gucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuZ0JydXNoID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbGV0IGtleWRvd24gPSAoKSA9PiB7XG4gICAgICAvLyBBbGxvd3MgdXMgdG8gdHVybiBvZmYgZGVmYXVsdCBsaXN0ZW5lcnMgZm9yIGtleU1vZGlmaWVycyhzaGlmdClcbiAgICAgIGJydXNoLmZpbHRlcigoKSA9PiBkMy5ldmVudC5zaGlmdEtleSk7XG4gICAgICBicnVzaC5rZXlNb2RpZmllcnMoZmFsc2UpO1xuICAgICAgLy8gaG9sZGluZyBzaGlmdCBrZXlcbiAgICAgIGlmIChkMy5ldmVudC5rZXlDb2RlID09PSAxNikge1xuICAgICAgICB0aGlzLnNoaWZ0S2V5ID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXRoaXMuZ0JydXNoKSB7XG4gICAgICAgICAgdGhpcy5icnVzaE1vZGUgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuZ0JydXNoID0gZ0JydXNoSG9sZGVyLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ2JydXNoJyk7XG4gICAgICAgICAgdGhpcy5nQnJ1c2guY2FsbChicnVzaCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgZDMuc2VsZWN0KCdib2R5Jykub24oJ2tleWRvd24nLCBrZXlkb3duKS5vbigna2V5dXAnLCBrZXl1cCk7XG4gICAgLy8gQnJ1c2ggRW5kXG5cbiAgICBjb25zdCBmaWx0ZXJlZExpbmUgPSB0aGlzLmxpbmtzLmZpbHRlcihcbiAgICAgICh7IHNvdXJjZSwgdGFyZ2V0IH0sIGluZGV4LCBsaW5rc0FycmF5KSA9PiB7XG4gICAgICAgIC8vIEZpbHRlciBvdXQgYW55IG9iamVjdHMgdGhhdCBoYXZlIG1hdGNoaW5nIHNvdXJjZSBhbmQgdGFyZ2V0IHByb3BlcnR5IHZhbHVlc1xuICAgICAgICAvLyBUbyBkaXNwbGF5IG9ubHkgb25lIGxpbmUgKHBhcmVudExpbmVTdHlsZSkgLSByZW1vdmVzIGh0bWwgYmxvYXQgYW5kIGEgZGFya2VuZWQgbGluZVxuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgIGluZGV4ID09PVxuICAgICAgICAgIGxpbmtzQXJyYXkuZmluZEluZGV4KFxuICAgICAgICAgICAgKG9iaikgPT4gb2JqLnNvdXJjZSA9PT0gc291cmNlICYmIG9iai50YXJnZXQgPT09IHRhcmdldFxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgbGluayA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCkuZGF0YShmaWx0ZXJlZExpbmUsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5pZDtcbiAgICB9KTtcblxuICAgIHpvb21Db250YWluZXIuc2VsZWN0QWxsKCdsaW5lJykuZGF0YShsaW5rKS5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICBjb25zdCBsaW5rRW50ZXIgPSBsaW5rXG4gICAgICAuam9pbignbGluZScpXG4gICAgICAuc3R5bGUoJ3N0cm9rZScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmIChkLnBhcmVudExpbmVTdHlsZSA9PT0gJ1NvbGlkJykge1xuICAgICAgICAgIHJldHVybiAnIzc3Nyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuICcjYjRiNGI0JztcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdHlsZSgnc3Ryb2tlLW9wYWNpdHknLCAnLjYnKVxuICAgICAgLnN0eWxlKCdzdHJva2UtZGFzaGFycmF5JywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKGQucGFyZW50TGluZVN0eWxlID09PSAnRG90dGVkJykge1xuICAgICAgICAgIHJldHVybiAnOCw1JztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ3N0cm9rZS13aWR0aCcsICcycHgnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2xpbmsnKVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ19saW5lJztcbiAgICAgICAgY29uc3Qgc291cmNlID0gZC5zb3VyY2UgPyBkLnNvdXJjZSA6ICcnO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBkLnRhcmdldCA/IGQudGFyZ2V0IDogJyc7XG4gICAgICAgIHJldHVybiBgJHtzb3VyY2V9XyR7dGFyZ2V0fSR7c3VmZml4fWA7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ21hcmtlci1lbmQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoZC5wYXJlbnRUYXJnZXRBcnJvdyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHJldHVybiAndXJsKCNhcnJvd2hlYWRUYXJnZXQpJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignbWFya2VyLXN0YXJ0JywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKGQucGFyZW50U291cmNlQXJyb3cgPT09IHRydWUpIHtcbiAgICAgICAgICByZXR1cm4gJ3VybCgjYXJyb3doZWFkU291cmNlKSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9KTtcblxuICAgIGxpbmsuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmxhYmVsO1xuICAgIH0pO1xuXG4gICAgY29uc3QgZWRnZXBhdGhzID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoKS5kYXRhKHRoaXMubGlua3MsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5pZDtcbiAgICB9KTtcblxuICAgIHpvb21Db250YWluZXIuc2VsZWN0QWxsKCdwYXRoJykuZGF0YShlZGdlcGF0aHMpLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgIGNvbnN0IGVkZ2VwYXRoc0VudGVyID0gZWRnZXBhdGhzXG4gICAgICAuam9pbignc3ZnOnBhdGgnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2VkZ2VwYXRoJylcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAwKVxuICAgICAgLmF0dHIoJ3N0cm9rZS1vcGFjaXR5JywgMClcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgIHJldHVybiAnZWRnZXBhdGgnICsgaTtcbiAgICAgIH0pO1xuXG4gICAgY29uc3QgZWRnZWxhYmVscyA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCkuZGF0YSh0aGlzLmxpbmtzLCBmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgfSk7XG5cbiAgICB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgndGV4dCcpLmRhdGEoZWRnZWxhYmVscykuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgY29uc3QgZWRnZWxhYmVsc0VudGVyID0gZWRnZWxhYmVsc1xuICAgICAgLmVudGVyKClcbiAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2VkZ2VsYWJlbCcpXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnX3RleHQnO1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBkLnNvdXJjZSA/IGQuc291cmNlIDogJyc7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGQudGFyZ2V0ID8gZC50YXJnZXQgOiAnJztcbiAgICAgICAgcmV0dXJuIGAke3NvdXJjZX1fJHt0YXJnZXR9JHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXG4gICAgICAuYXR0cignZm9udC1zaXplJywgMTQpXG4gICAgICAuYXR0cignZHknLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5keTtcbiAgICAgIH0pO1xuXG4gICAgc3ZnLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IGRibENsaWNrID0gZDMuc2VsZWN0KHRoaXMpLmRhdGEoKTtcbiAgICAgIHNlbGYuZGJsQ2xpY2tMaW5rUGF5bG9hZC5uZXh0KGRibENsaWNrKTtcbiAgICB9KTtcblxuICAgIGVkZ2VsYWJlbHNFbnRlclxuICAgICAgLmFwcGVuZCgndGV4dFBhdGgnKVxuICAgICAgLmF0dHIoJ3hsaW5rOmhyZWYnLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICByZXR1cm4gJyNlZGdlcGF0aCcgKyBpO1xuICAgICAgfSlcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKVxuICAgICAgLmF0dHIoJ2RvbWluYW50LWJhc2VsaW5lJywgJ2JvdHRvbScpXG4gICAgICAuYXR0cignc3RhcnRPZmZzZXQnLCAnNTAlJylcbiAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmxhYmVsO1xuICAgICAgfSk7XG5cbiAgICBlZGdlbGFiZWxzRW50ZXJcbiAgICAgIC5zZWxlY3RBbGwoJ3RleHRQYXRoJylcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQubGlua0ljb247XG4gICAgICB9KVxuICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgLnN0eWxlKCdmaWxsJywgJyM4NTY0MDQnKVxuICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsICc3MDAnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ZhJylcbiAgICAgIC50ZXh0KCcgXFx1ZjBjMScpO1xuICAgIC8vIG9uIG5vcm1hbCBsYWJlbCBsaW5rIGNsaWNrIC0gaGlnaGxpZ2h0IGxhYmVsc1xuICAgIHN2Zy5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xuICAgICAgX2QzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgbm9kZUVudGVyLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgZC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgICBub2RlLmNsYXNzZWQoJ3NlbGVjdGVkJywgZmFsc2UpO1xuICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZC1maWxsXCI+PC9pPic7XG4gICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICBfZDMuc2VsZWN0KHRoaXMpLnN0eWxlKCdmaWxsJywgJ2JsdWUnKS5zdHlsZSgnZm9udC13ZWlnaHQnLCA3MDApO1xuICAgICAgc2VsZi5zZWxlY3RlZE5vZGVzQXJyYXkubmV4dChbXSk7XG4gICAgfSk7XG5cbiAgICAvLyBvbiByaWdodCBsYWJlbCBsaW5rIGNsaWNrIC0gaGlnaHRsaWdodCBsYWJlbHMgYW5kIHBhY2thZ2UgZGF0YSBmb3IgY29udGV4dCBtZW51XG4gICAgc3ZnLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpLm9uKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KFtdKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgX2QzLnNlbGVjdCh0aGlzKS5zdHlsZSgnZmlsbCcsICdibHVlJykuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNzAwKTtcbiAgICAgIGNvbnN0IGxvY2FsU2VsZWN0ZWRMaW5rQXJyYXkgPSBkMy5zZWxlY3QodGhpcykuZGF0YSgpO1xuICAgICAgc2VsZi5zZWxlY3RlZExpbmtBcnJheS5uZXh0KGxvY2FsU2VsZWN0ZWRMaW5rQXJyYXkpO1xuICAgIH0pO1xuXG4gICAgY29uc3Qgbm9kZSA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCkuZGF0YSh0aGlzLm5vZGVzLCBmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgfSk7XG5cbiAgICB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgnZycpLmRhdGEobm9kZSkuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgY29uc3Qgbm9kZUVudGVyID0gbm9kZVxuICAgICAgLmpvaW4oJ2cnKVxuICAgICAgLmNhbGwoXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5kcmFnKClcbiAgICAgICAgICAub24oJ3N0YXJ0JywgZnVuY3Rpb24gZHJhZ3N0YXJ0ZWQoZCkge1xuICAgICAgICAgICAgLy8gRW5hYmxlIHRoZSBzYXZlICYgcmVzZXQgYnRuXG4gICAgICAgICAgICBpZiAocmVzZXRCdG4pIHtcbiAgICAgICAgICAgICAgZG9jdW1lbnRcbiAgICAgICAgICAgICAgICAuZ2V0RWxlbWVudEJ5SWQoJ3Jlc2V0X2dyYXBoJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZV9ncmFwaCcpLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghX2QzLmV2ZW50LmFjdGl2ZSkgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwLjkpLnJlc3RhcnQoKTtcblxuICAgICAgICAgICAgaWYgKCFkLnNlbGVjdGVkICYmICF0aGlzLnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAgIC8vIGlmIHRoaXMgbm9kZSBpc24ndCBzZWxlY3RlZCwgdGhlbiB3ZSBoYXZlIHRvIHVuc2VsZWN0IGV2ZXJ5IG90aGVyIG5vZGVcbiAgICAgICAgICAgICAgbm9kZUVudGVyLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHAuc2VsZWN0ZWQgPSBwLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgc2VsZWN0ZWQgc3R5bGluZyBvbiBvdGhlciBub2RlcyBhbmQgbGFiZWxzIHdoZW4gd2UgZHJhZyBhIG5vbi1zZWxlY3RlZCBub2RlXG4gICAgICAgICAgICAgIF9kM1xuICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgICAgICAgICAgX2QzXG4gICAgICAgICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9kMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmdW5jdGlvbiAocCkge1xuICAgICAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGQuc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgIHJldHVybiAoZC5zZWxlY3RlZCA9IHRydWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG5vZGVFbnRlclxuICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgZC5meCA9IGQueDtcbiAgICAgICAgICAgICAgICBkLmZ5ID0gZC55O1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vbignZHJhZycsIGZ1bmN0aW9uIGRyYWdnZWQoZCkge1xuICAgICAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5zZWxlY3RlZDtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBkLmZ4ICs9IF9kMy5ldmVudC5keDtcbiAgICAgICAgICAgICAgICBkLmZ5ICs9IF9kMy5ldmVudC5keTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uIGRyYWdlbmRlZChkKSB7XG4gICAgICAgICAgICBpZiAoIV9kMy5ldmVudC5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwLjMpLnJlc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGQuZnggPSBkLng7XG4gICAgICAgICAgICBkLmZ5ID0gZC55O1xuICAgICAgICAgICAgLy8gU3Vic2NyaWJlcyB0byB1cGRhdGVkIGdyYXBoIHBvc2l0aW9ucyBmb3Igc2F2ZVxuICAgICAgICAgICAgc2VsZi5zYXZlR3JhcGhEYXRhLm5leHQoZGF0YSk7XG4gICAgICAgICAgfSlcbiAgICAgIClcbiAgICAgIC5hdHRyKCdjbGFzcycsICdub2RlLXdyYXBwZXInKVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgICB9KTtcblxuICAgIC8vIG5vIGNvbGxpc2lvbiAtIGFscmVhZHkgdXNpbmcgdGhpcyBpbiBzdGF0ZW1lbnRcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIHN2Zy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5vbignZGJsY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBkYmxDbGljayA9IGQzLnNlbGVjdCh0aGlzKS5kYXRhKCk7XG4gICAgICBzZWxmLmRibENsaWNrTm9kZVBheWxvYWQubmV4dChkYmxDbGljayk7XG4gICAgfSk7XG5cbiAgICAvLyBub2RlIGNsaWNrIGFuZCBjdHJsICsgY2xpY2tcbiAgICBzdmcuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIC8vIHNvIHdlIGRvbid0IGFjdGl2YXRlIHRoZSBjYW52YXMgLmNsaWNrIGV2ZW50XG4gICAgICBfZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgIC8vIHNldHRpbmcgdGhlIHNlbGVjdCBhdHRyaWJ1dGUgdG8gdGhlIG9iamVjdCBvbiBzaW5nbGUgc2VsZWN0IHNvIHdlIGNhbiBkcmFnIHRoZW1cbiAgICAgIGQuc2VsZWN0ZWQgPSB0cnVlO1xuXG4gICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+JztcbiAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAvLyBJZiBjdHJsIGtleSBpcyBoZWxkIG9uIGNsaWNrXG4gICAgICBpZiAoX2QzLmV2ZW50LmN0cmxLZXkpIHtcbiAgICAgICAgLy8gdG9nZ2xlIHRoZSBjbGFzcyBvbiBhbmQgb2ZmIHdoZW4gY3RybCBjbGljayBpcyBhY3RpdmVcbiAgICAgICAgY29uc3QgY2xpY2tlZE5vZGUgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBjbGlja2VkTm9kZS5jbGFzc2VkKCdzZWxlY3RlZCcpO1xuICAgICAgICBjbGlja2VkTm9kZS5jbGFzc2VkKCdzZWxlY3RlZCcsICFpc1NlbGVjdGVkKTtcbiAgICAgICAgZC5zZWxlY3RlZCA9ICFpc1NlbGVjdGVkO1xuICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9ICFpc1NlbGVjdGVkO1xuXG4gICAgICAgIGNvbnN0IHRvdGFsU2l6ZSA9IG5vZGVFbnRlci5zaXplKCk7XG4gICAgICAgIGNvbnN0IG5vblNlbGVjdGVkTm9kZXMgPSBkMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXI6bm90KC5zZWxlY3RlZCknKTtcbiAgICAgICAgY29uc3QgY291bnQgPSBub25TZWxlY3RlZE5vZGVzLnNpemUoKTtcbiAgICAgICAgY29uc3Qgbm90U2VsZWN0ZWRTaXplID0gdG90YWxTaXplIC0gY291bnQ7XG5cbiAgICAgICAgaWYgKG5vdFNlbGVjdGVkU2l6ZSA9PT0gdG90YWxTaXplKSB7XG4gICAgICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZFwiPjwvaT4nO1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMC42NSc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBzaW5nbGUgY2xpY2sgc3R5bGluZyBvbiBvdGhlciBub2RlcyBhbmQgbGFiZWxzXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICAgIHN2Z1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDcwMCk7XG4gICAgICAgIC8vIGNvdW50cyBudW1iZXIgb2Ygc2VsZWN0ZWQgY2xhc3NlcyB0byBub3QgZXhjZWVkIDJcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRTaXplID0gc3ZnLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuc2l6ZSgpO1xuXG4gICAgICAgIGlmIChzZWxlY3RlZFNpemUgPD0gMikge1xuICAgICAgICAgIC8vIEFzIHdlIGFsbG93IGZvciBzaW5nbGUgY2xpY2sgd2l0aG91dCBhIGN0cmwrY2xpY2sgdG8gc2VsZWN0IHR3byBub2Rlcywgd2UgaGF2ZSB0byBhcHBseSBkLnNlbGVjdGVkIHRvIGl0XG4gICAgICAgICAgX2QzXG4gICAgICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAgICAgLmF0dHIoJ3NlbGVjdGVkJywgdHJ1ZSlcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICAgICAgZC5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIGdldCBkYXRhIGZyb20gbm9kZVxuICAgICAgICAgIGNvbnN0IGxvY2Fsc2VsZWN0ZWROb2Rlc0FycmF5ID0gX2QzLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuZGF0YSgpO1xuICAgICAgICAgIGNvbnN0IGZpbHRlcklkID0gbG9jYWxzZWxlY3RlZE5vZGVzQXJyYXkuZmlsdGVyKCh4KSA9PiB4KTtcbiAgICAgICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KGZpbHRlcklkKTtcbiAgICAgICAgICByZXR1cm4gZmlsdGVySWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdmcuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgIGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICBub2RlRW50ZXIuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgIGQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIHN0eWxlIGZyb20gc2VsZWN0ZWQgbm9kZSBiZWZvcmUgdGhlIGNsYXNzIGlzIHJlbW92ZWRcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgLy8gUmVtb3ZlIHN0eWxlcyBmcm9tIGFsbCBvdGhlciBub2RlcyBhbmQgbGFiZWxzIG9uIHNpbmdsZSBsZWZ0IGNsaWNrXG4gICAgICBfZDMuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJykuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICAvLyBBZGQgc3R5bGUgb24gc2luZ2xlIGxlZnQgY2xpY2tcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0KHRoaXMpXG4gICAgICAgIC5zZWxlY3QoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICdibHVlJylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDcwMCk7XG4gICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KFtdKTtcblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSk7XG5cbiAgICAvLyBSaWdodCBjbGljayBvbiBhIG5vZGUgaGlnaGxpZ2h0cyBmb3IgY29udGV4dCBtZW51XG4gICAgc3ZnLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLm9uKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAvLyBjb3VudHMgbnVtYmVyIG9mIHNlbGVjdGVkIGNsYXNzZXMgdG8gbm90IGV4Y2VlZCAyXG4gICAgICBjb25zdCBzZWxlY3RlZFNpemUgPSBzdmdcbiAgICAgICAgLnNlbGVjdEFsbCgnLnNlbGVjdGVkJylcbiAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgLnNpemUoKTtcblxuICAgICAgaWYgKHNlbGVjdGVkU2l6ZSAhPT0gMikge1xuICAgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIHJlbW92ZSBzdHlsZSBpZiB0aGV5IGFyZSBvYnRhaW5pbmcgdGhlIGNvbnRleHQgbWVudSBmb3IganVzdCB0d28gbm9kZXMgKGNyZWF0ZSBsaW5rIG9wdGlvbilcbiAgICAgICAgc3ZnLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoW10pO1xuICAgICAgICBfZDNcbiAgICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgICAvLyBBZGQgc3R5bGUgb24gc2luZ2xlIHJpZ2h0IGNsaWNrXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3QodGhpcylcbiAgICAgICAgICAuc2VsZWN0KCcubm9kZVRleHQnKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICdibHVlJylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNzAwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vY2xpY2sgb24gY2FudmFzIHRvIHJlbW92ZSBzZWxlY3RlZCBub2Rlc1xuICAgIF9kMy5zZWxlY3QoJ3N2ZycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgIG5vZGVFbnRlci5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgZC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgICAgbm9kZS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgX2QzLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KFtdKTtcbiAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWQtZmlsbFwiPjwvaT4nO1xuICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICB9KTtcblxuICAgIG5vZGVFbnRlclxuICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgIGlmICghZC5pbWFnZVVybCB8fCBkLmltYWdlVXJsID09PSAnJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pXG4gICAgICAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAuYXR0cigneGxpbms6aHJlZicsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmltYWdlVXJsO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd4JywgLTE1KVxuICAgICAgLmF0dHIoJ3knLCAtNjApXG4gICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnaW1hZ2UnO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1gO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDMyKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDMyKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ltYWdlJylcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKTtcblxuICAgICAgbm9kZUVudGVyXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmICghZC5pY29uIHx8IGQuaWNvbiA9PT0gJycpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmljb247XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3gnLCAtMTgpXG4gICAgICAuYXR0cigneScsIC0zMClcbiAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICdpY29uJztcbiAgICAgICAgY29uc3QgaWQgPSBkLmlkID8gZC5pZCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7aWR9XyR7c3VmZml4fSBmYWA7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3QgaWQgPSBkLmlkID8gZC5pZCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7aWR9YDtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsICczNXB4JylcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKTtcbiAgICBcblxuICAgIGNvbnN0IG5vZGVUZXh0ID0gbm9kZUVudGVyXG4gICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC5hdHRyKCdpZCcsICdub2RlVGV4dCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnbm9kZVRleHQnKVxuICAgICAgLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAuYXR0cignZHknLCAtMylcbiAgICAgIC5hdHRyKCd5JywgLTI1KVxuICAgICAgLmF0dHIoJ3Rlc3Rob29rJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ3RleHQnO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9YDtcbiAgICAgIH0pO1xuXG4gICAgbm9kZVRleHRcbiAgICAgIC5zZWxlY3RBbGwoJ3RzcGFuLnRleHQnKVxuICAgICAgLmRhdGEoKGQpID0+IGQubGFiZWwpXG4gICAgICAuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVUZXh0VHNwYW4nKVxuICAgICAgLnRleHQoKGQpID0+IGQpXG4gICAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsICcxNHB4JylcbiAgICAgIC5hdHRyKCd4JywgLTEwKVxuICAgICAgLmF0dHIoJ2R4JywgMTApXG4gICAgICAuYXR0cignZHknLCAxNSk7XG5cbiAgICBub2RlRW50ZXJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKCFkLmFkZGl0aW9uYWxJY29uKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnYWRkaXRpb25hbEljb24nO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignd2lkdGgnLCAxMDApXG4gICAgICAuYXR0cignaGVpZ2h0JywgMjUpXG4gICAgICAuYXR0cigneCcsIDMwKVxuICAgICAgLmF0dHIoJ3knLCAtNTApXG4gICAgICAuYXR0cignY2xhc3MnLCAnZmEnKVxuICAgICAgLnN0eWxlKCdmaWxsJywgJyM4NTY0MDQnKVxuICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuYWRkaXRpb25hbEljb247XG4gICAgICB9KTtcblxuICAgIC8vIHRyYW5zaXRpb24gZWZmZWN0cyBmb3IgbmV3IHB1bHNhdGluZyBub2Rlc1xuICAgIG5vZGVFbnRlclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoIWQubmV3SXRlbSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zZWxlY3QoJ3RleHQnKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICdibHVlJylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAxKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICdibHVlJylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAwLjEpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDEpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDAuMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMSlcbiAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLmNhbGwoX2QzLnRyYW5zaXRpb24pO1xuICAgICAgfSk7XG5cbiAgICBub2RlRW50ZXJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKCFkLm5ld0l0ZW0pIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuc2VsZWN0KCdpbWFnZScpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDQ1KVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDQ1KVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCAzMilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAzMilcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgNDUpXG4gICAgICAuYXR0cignaGVpZ2h0JywgNDUpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDMyKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDMyKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCA0NSlcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCA0NSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgMzIpXG4gICAgICAuYXR0cignaGVpZ2h0JywgMzIpXG4gICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS5jYWxsKGQzLnRyYW5zaXRpb24pO1xuICAgICAgfSk7XG5cbiAgICAvLyBSZW1vdmUgdGhlIG5ld0NsYXNzIHNvIHRoZXkgZG9uJ3QgYW5pbWF0ZSBuZXh0IHRpbWVcbiAgICB0aGlzLm5vZGVzID0gdGhpcy5yZW1vdmVOZXdJdGVtKHRoaXMubm9kZXMpO1xuXG4gICAgbm9kZUVudGVyLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5sYWJlbDtcbiAgICB9KTtcblxuICAgIGNvbnN0IG1heFRpY2tzID0gMzA7XG4gICAgbGV0IHRpY2tDb3VudCA9IDA7XG4gICAgbGV0IHpvb21Ub0ZpdENhbGxlZCA9IGZhbHNlO1xuXG4gICAgc2ltdWxhdGlvbi5ub2Rlcyh0aGlzLm5vZGVzKS5vbigndGljaycsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnpvb21Ub0ZpdCAmJiB0aWNrQ291bnQgPj0gbWF4VGlja3MgJiYgIXpvb21Ub0ZpdENhbGxlZCkge1xuICAgICAgICBzaW11bGF0aW9uLnN0b3AoKTtcbiAgICAgICAgaGFuZGxlWm9vbVRvRml0KCk7XG4gICAgICAgIHpvb21Ub0ZpdENhbGxlZCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRpY2tlZChsaW5rRW50ZXIsIG5vZGVFbnRlciwgZWRnZXBhdGhzRW50ZXIpO1xuICAgICAgICB0aWNrQ291bnQrKztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHNpbXVsYXRpb24uZm9yY2UoJ2xpbmsnKS5saW5rcyh0aGlzLmxpbmtzKTtcbiAgICBzZWxmLnNhdmVHcmFwaERhdGEubmV4dChkYXRhKTtcbiAgfVxuXG4gIHB1YmxpYyByZXNldEdyYXBoKGluaXRpYWxEYXRhLCBlbGVtZW50LCB6b29tLCB6b29tVG9GaXQpIHtcbiAgICAvLyBUbyByZXNldCB0aGUgc2VhcmNoIHdoZW4gd2UgcmVzZXQgdGhlIGRhdGFcbiAgICB0aGlzLnJlc2V0U2VhcmNoID0gdHJ1ZTtcbiAgICAvLyBSZXNldCB0aGUgZGF0YSB0byBpdHMgaW5pdGlhbCBzdGF0ZVxuICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgICB0aGlzLmxpbmtzID0gW107XG4gICAgLy8gQ2FsbCB0aGUgdXBkYXRlIG1ldGhvZCBhZ2FpbiB0byByZS1zaW11bGF0ZSB0aGUgZ3JhcGggd2l0aCB0aGUgbmV3IGRhdGFcbiAgICB0aGlzLnVwZGF0ZShpbml0aWFsRGF0YSwgZWxlbWVudCwgem9vbSwgem9vbVRvRml0KTtcbiAgfVxufVxuIl19