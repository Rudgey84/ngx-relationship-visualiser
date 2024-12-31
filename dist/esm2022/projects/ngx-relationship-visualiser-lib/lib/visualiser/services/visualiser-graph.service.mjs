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
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                    selectAllNodes.style.opacity = '0.65';
                }
                _d3.selectAll('.node-wrapper').classed('selected', function (p) {
                    p.previouslySelected = p.selected;
                    return (p.selected = true);
                });
                d3.selectAll('.nodeText')
                    .style('fill', (d) => (d.selected ? 'blue' : '#999'))
                    .style('font-weight', (d) => (d.selected ? 700 : 400));
            }
            else {
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                    selectAllNodes.style.opacity = '1';
                }
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
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                    selectAllNodes.style.opacity = '0.65';
                }
            }
            else {
                // Update the state of another button if not all nodes are selected
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                    selectAllNodes.style.opacity = '1';
                }
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
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                    selectAllNodes.style.opacity = '0.65';
                }
            }
            else {
                if (selectAllNodes) {
                    selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                    selectAllNodes.style.opacity = '1';
                }
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
            if (selectAllNodes) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
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
            if (selectAllNodes) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
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
                    if (selectAllNodes) {
                        selectAllNodes.innerHTML = '<i class="bi bi-grid"></i>';
                        selectAllNodes.style.opacity = '0.65';
                    }
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
            if (selectAllNodes) {
                selectAllNodes.innerHTML = '<i class="bi bi-grid-fill"></i>';
                selectAllNodes.style.opacity = '1';
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlzdWFsaXNlci1ncmFwaC5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LXJlbGF0aW9uc2hpcC12aXN1YWxpc2VyLWxpYi9saWIvdmlzdWFsaXNlci9zZXJ2aWNlcy92aXN1YWxpc2VyLWdyYXBoLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMzQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLE1BQU0sQ0FBQzs7O0FBTTlDLE1BQU0sT0FBTyxzQkFBc0I7SUFDYjtJQUFwQixZQUFvQixZQUEwQjtRQUExQixpQkFBWSxHQUFaLFlBQVksQ0FBYztJQUFJLENBQUM7SUFDNUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNYLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDWCxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQ2QsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUNsQixRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ2pCLFFBQVEsQ0FBQztJQUNULE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDZCxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ2IsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUNsQixXQUFXLENBQUM7SUFDbkIsMERBQTBEO0lBQ25ELGtCQUFrQixHQUFHLElBQUksT0FBTyxFQUFTLENBQUM7SUFDMUMsbUJBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQUNwQyxtQkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO0lBQ3BDLGlCQUFpQixHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7SUFDbEMsYUFBYSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7SUFFcEMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUs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S0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQiwwRUFBMEU7UUFDMUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNyRCxDQUFDO3dHQWwrQ1Usc0JBQXNCOzRHQUF0QixzQkFBc0IsY0FGckIsTUFBTTs7NEZBRVAsc0JBQXNCO2tCQUhsQyxVQUFVO21CQUFDO29CQUNWLFVBQVUsRUFBRSxNQUFNO2lCQUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCAqIGFzIGQzIGZyb20gJ2QzJztcbmltcG9ydCB7IFN1YmplY3QsIFJlcGxheVN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IERleGllU2VydmljZSB9IGZyb20gJy4uLy4uL2RiL2dyYXBoRGF0YWJhc2UnO1xuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290Jyxcbn0pXG5leHBvcnQgY2xhc3MgVmlzdWFsaXNlckdyYXBoU2VydmljZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGV4aWVTZXJ2aWNlOiBEZXhpZVNlcnZpY2UpIHsgfVxuICBwdWJsaWMgbGlua3MgPSBbXTtcbiAgcHVibGljIG5vZGVzID0gW107XG4gIHB1YmxpYyBnQnJ1c2ggPSBudWxsO1xuICBwdWJsaWMgYnJ1c2hNb2RlID0gZmFsc2U7XG4gIHB1YmxpYyBicnVzaGluZyA9IGZhbHNlO1xuICBwdWJsaWMgc2hpZnRLZXk7XG4gIHB1YmxpYyBleHRlbnQgPSBudWxsO1xuICBwdWJsaWMgem9vbSA9IGZhbHNlO1xuICBwdWJsaWMgem9vbVRvRml0ID0gZmFsc2U7XG4gIHB1YmxpYyByZXNldFNlYXJjaDtcbiAgLyoqIFJ4SlMgc3ViamVjdCB0byBsaXN0ZW4gZm9yIHVwZGF0ZXMgb2YgdGhlIHNlbGVjdGlvbiAqL1xuICBwdWJsaWMgc2VsZWN0ZWROb2Rlc0FycmF5ID0gbmV3IFN1YmplY3Q8YW55W10+KCk7XG4gIHB1YmxpYyBkYmxDbGlja05vZGVQYXlsb2FkID0gbmV3IFN1YmplY3QoKTtcbiAgcHVibGljIGRibENsaWNrTGlua1BheWxvYWQgPSBuZXcgU3ViamVjdCgpO1xuICBwdWJsaWMgc2VsZWN0ZWRMaW5rQXJyYXkgPSBuZXcgU3ViamVjdCgpO1xuICBwdWJsaWMgc2F2ZUdyYXBoRGF0YSA9IG5ldyBSZXBsYXlTdWJqZWN0KCk7XG5cbiAgcHVibGljIHVwZGF0ZShkYXRhLCBlbGVtZW50LCB6b29tLCB6b29tVG9GaXQpIHtcbiAgICBjb25zdCBzdmcgPSBkMy5zZWxlY3QoZWxlbWVudCk7XG4gICAgdGhpcy56b29tID0gem9vbTtcbiAgICB0aGlzLnpvb21Ub0ZpdCA9IHpvb21Ub0ZpdDtcbiAgICByZXR1cm4gdGhpcy5fdXBkYXRlKGQzLCBzdmcsIGRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSB0aWNrZWQobGluaywgbm9kZSwgZWRnZXBhdGhzKSB7XG4gICAgbGluay5lYWNoKGZ1bmN0aW9uIChkLCBpLCBuKSB7XG4gICAgICAvLyBUb3RhbCBkaWZmZXJlbmNlIGluIHggYW5kIHkgZnJvbSBzb3VyY2UgdG8gdGFyZ2V0XG4gICAgICBsZXQgZGlmZlggPSBkLnRhcmdldC54IC0gZC5zb3VyY2UueDtcbiAgICAgIGxldCBkaWZmWSA9IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55O1xuXG4gICAgICAvLyBMZW5ndGggb2YgcGF0aCBmcm9tIGNlbnRlciBvZiBzb3VyY2Ugbm9kZSB0byBjZW50ZXIgb2YgdGFyZ2V0IG5vZGVcbiAgICAgIGxldCBwYXRoTGVuZ3RoID0gTWF0aC5zcXJ0KGRpZmZYICogZGlmZlggKyBkaWZmWSAqIGRpZmZZKTtcblxuICAgICAgLy8geCBhbmQgeSBkaXN0YW5jZXMgZnJvbSBjZW50ZXIgdG8gb3V0c2lkZSBlZGdlIG9mIHRhcmdldCBub2RlXG4gICAgICBsZXQgb2Zmc2V0WCA9IChkaWZmWCAqIDQwKSAvIHBhdGhMZW5ndGg7XG4gICAgICBsZXQgb2Zmc2V0WSA9IChkaWZmWSAqIDQwKSAvIHBhdGhMZW5ndGg7XG5cbiAgICAgIGQzLnNlbGVjdChuW2ldKVxuICAgICAgICAuYXR0cigneDEnLCBkLnNvdXJjZS54ICsgb2Zmc2V0WClcbiAgICAgICAgLmF0dHIoJ3kxJywgZC5zb3VyY2UueSArIG9mZnNldFkpXG4gICAgICAgIC5hdHRyKCd4MicsIGQudGFyZ2V0LnggLSBvZmZzZXRYKVxuICAgICAgICAuYXR0cigneTInLCBkLnRhcmdldC55IC0gb2Zmc2V0WSk7XG4gICAgfSk7XG5cbiAgICBub2RlLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gYHRyYW5zbGF0ZSgke2QueH0sICR7ZC55ICsgNTB9KWA7XG4gICAgfSk7XG5cbiAgICAvLyBTZXRzIGEgYm91bmRyeSBmb3IgdGhlIG5vZGVzXG4gICAgLy8gbm9kZS5hdHRyKCdjeCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgLy8gICByZXR1cm4gKGQueCA9IE1hdGgubWF4KDQwLCBNYXRoLm1pbig5MDAgLSAxNSwgZC54KSkpO1xuICAgIC8vIH0pO1xuICAgIC8vIG5vZGUuYXR0cignY3knLCBmdW5jdGlvbiAoZCkge1xuICAgIC8vICAgcmV0dXJuIChkLnkgPSBNYXRoLm1heCg1MCwgTWF0aC5taW4oNjAwIC0gNDAsIGQueSkpKTtcbiAgICAvLyB9KTtcblxuICAgIGVkZ2VwYXRocy5hdHRyKCdkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBgTSAke2Quc291cmNlLnh9ICR7ZC5zb3VyY2UueX0gTCAke2QudGFyZ2V0Lnh9ICR7ZC50YXJnZXQueX1gO1xuICAgIH0pO1xuXG4gICAgZWRnZXBhdGhzLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICBpZiAoZC50YXJnZXQueCA8IGQuc291cmNlLngpIHtcbiAgICAgICAgY29uc3QgYmJveCA9IHRoaXMuZ2V0QkJveCgpO1xuICAgICAgICBjb25zdCByeCA9IGJib3gueCArIGJib3gud2lkdGggLyAyO1xuICAgICAgICBjb25zdCByeSA9IGJib3gueSArIGJib3guaGVpZ2h0IC8gMjtcbiAgICAgICAgcmV0dXJuIGByb3RhdGUoMTgwICR7cnh9ICR7cnl9KWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJ3JvdGF0ZSgwKSc7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGluaXREZWZpbml0aW9ucyhzdmcpIHtcbiAgICBjb25zdCBkZWZzID0gc3ZnLmFwcGVuZCgnZGVmcycpO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlTWFya2VyKGlkLCByZWZYLCBwYXRoKSB7XG4gICAgICBkZWZzXG4gICAgICAgIC5hcHBlbmQoJ21hcmtlcicpXG4gICAgICAgIC5hdHRyKCdpZCcsIGlkKVxuICAgICAgICAuYXR0cigndmlld0JveCcsICctMCAtNSAxMCAxMCcpXG4gICAgICAgIC5hdHRyKCdyZWZYJywgcmVmWClcbiAgICAgICAgLmF0dHIoJ3JlZlknLCAwKVxuICAgICAgICAuYXR0cignb3JpZW50JywgJ2F1dG8nKVxuICAgICAgICAuYXR0cignbWFya2VyV2lkdGgnLCA4KVxuICAgICAgICAuYXR0cignbWFya2VySGVpZ2h0JywgOClcbiAgICAgICAgLmF0dHIoJ3hvdmVyZmxvdycsICd2aXNpYmxlJylcbiAgICAgICAgLmFwcGVuZCgnc3ZnOnBhdGgnKVxuICAgICAgICAuYXR0cignZCcsIHBhdGgpXG4gICAgICAgIC5hdHRyKCdmaWxsJywgJyNiNGI0YjQnKVxuICAgICAgICAuc3R5bGUoJ3N0cm9rZScsICdub25lJyk7XG4gICAgfVxuXG4gICAgY3JlYXRlTWFya2VyKCdhcnJvd2hlYWRUYXJnZXQnLCAwLCAnTSAwLC01IEwgMTAgLDAgTCAwLDUnKTtcbiAgICBjcmVhdGVNYXJrZXIoJ2Fycm93aGVhZFNvdXJjZScsIDIsICdNIDEwIC01IEwgMCAwIEwgMTAgNScpO1xuXG4gICAgcmV0dXJuIHN2ZztcbiAgfVxuXG4gIHByaXZhdGUgZm9yY2VTaW11bGF0aW9uKF9kMywgeyB3aWR0aCwgaGVpZ2h0IH0pIHtcbiAgICByZXR1cm4gX2QzXG4gICAgICAuZm9yY2VTaW11bGF0aW9uKClcbiAgICAgIC52ZWxvY2l0eURlY2F5KDAuMSlcbiAgICAgIC5mb3JjZShcbiAgICAgICAgJ2xpbmsnLFxuICAgICAgICBfZDNcbiAgICAgICAgICAuZm9yY2VMaW5rKClcbiAgICAgICAgICAuaWQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBkLmlkO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmRpc3RhbmNlKDUwMClcbiAgICAgICAgICAuc3RyZW5ndGgoMSlcbiAgICAgIClcbiAgICAgIC5mb3JjZSgnY2hhcmdlJywgX2QzLmZvcmNlTWFueUJvZHkoKS5zdHJlbmd0aCgwLjEpKVxuICAgICAgLmZvcmNlKCdjZW50ZXInLCBfZDMuZm9yY2VDZW50ZXIod2lkdGggLyAyLCBoZWlnaHQgLyAyKSlcbiAgICAgIC5mb3JjZSgnY29sbGlzaW9uJywgX2QzLmZvcmNlQ29sbGlkZSgpLnJhZGl1cygxNSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wYXJlQW5kTWFya05vZGVzTmV3KG5vZGVzLCBvbGRfbm9kZXMpIHtcbiAgICAvLyBDcmVhdGUgYSBtYXAgb2YgaWRzIHRvIG5vZGUgb2JqZWN0cyBmb3IgdGhlIG9sZF9ub2RlcyBhcnJheVxuICAgIGNvbnN0IG9sZE1hcCA9IG9sZF9ub2Rlcy5yZWR1Y2UoKG1hcCwgbm9kZSkgPT4ge1xuICAgICAgbWFwW25vZGUuaWRdID0gbm9kZTtcbiAgICAgIHJldHVybiBtYXA7XG4gICAgfSwge30pO1xuXG4gICAgLy8gQ2hlY2sgZWFjaCBub2RlIGluIHRoZSBub2RlcyBhcnJheSB0byBzZWUgaWYgaXQncyBuZXcgb3Igbm90XG4gICAgbm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgaWYgKCFvbGRNYXBbbm9kZS5pZF0pIHtcbiAgICAgICAgLy8gTm9kZSBpcyBuZXcsIG1hcmsgaXQgd2l0aCB0aGUgbmV3SXRlbSBwcm9wZXJ0eVxuICAgICAgICBub2RlLm5ld0l0ZW0gPSB0cnVlO1xuICAgICAgICAvLyBSZW1vdmUgdGhlIGRhZ3JlIGNvb3JkaW5hdGVzIGZyb20gbmV3IG5vZGVzIHNvIHdlIGNhbiBzZXQgYSByYW5kb20gb25lIGluIHZpZXdcbiAgICAgICAgbm9kZS5meCA9IG51bGw7XG4gICAgICAgIG5vZGUuZnkgPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGVzO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVOZXdJdGVtKG5vZGVzKSB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBpZiAobm9kZS5oYXNPd25Qcm9wZXJ0eSgnbmV3SXRlbScpKSB7XG4gICAgICAgIGRlbGV0ZSBub2RlLm5ld0l0ZW07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfVxuXG4gIHByaXZhdGUgcmFuZG9taXNlTm9kZVBvc2l0aW9ucyhub2RlRGF0YSwgd2lkdGgsIGhlaWdodCkge1xuICAgIGxldCBtaW5EaXN0YW5jZSA9IDEwMDtcbiAgICBjb25zdCBhdmFpbGFibGVTcGFjZSA9IHdpZHRoICogaGVpZ2h0O1xuICAgIGxldCBhZGp1c3RlZFJlcXVpcmVkU3BhY2UgPSBub2RlRGF0YS5sZW5ndGggKiBtaW5EaXN0YW5jZSAqIG1pbkRpc3RhbmNlO1xuXG4gICAgaWYgKGFkanVzdGVkUmVxdWlyZWRTcGFjZSA+IGF2YWlsYWJsZVNwYWNlKSB7XG4gICAgICB3aGlsZSAoYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID4gYXZhaWxhYmxlU3BhY2UgJiYgbWluRGlzdGFuY2UgPiAwKSB7XG4gICAgICAgIG1pbkRpc3RhbmNlIC09IDEwO1xuICAgICAgICBhZGp1c3RlZFJlcXVpcmVkU3BhY2UgPSBub2RlRGF0YS5sZW5ndGggKiBtaW5EaXN0YW5jZSAqIG1pbkRpc3RhbmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWRqdXN0ZWRSZXF1aXJlZFNwYWNlID4gYXZhaWxhYmxlU3BhY2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdOb3QgZW5vdWdoIHNwYWNlIHRvIGFjY29tbW9kYXRlIGFsbCBub2RlcyB3aXRob3V0IGEgZml4ZWQgcG9zaXRpb24uJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVEYXRhLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgIGlmIChub2RlLmZ4ID09PSBudWxsICYmIG5vZGUuZnkgPT09IG51bGwpIHtcbiAgICAgICAgbGV0IGN1cnJlbnRNaW5EaXN0YW5jZSA9IG1pbkRpc3RhbmNlO1xuICAgICAgICBsZXQgY2FuUGxhY2VOb2RlID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKCFjYW5QbGFjZU5vZGUgJiYgY3VycmVudE1pbkRpc3RhbmNlID4gMCkge1xuICAgICAgICAgIG5vZGUuZnggPSBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50MzJBcnJheSgxKSlbMF0gJSB3aWR0aDtcbiAgICAgICAgICBub2RlLmZ5ID0gY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDMyQXJyYXkoMSkpWzBdICUgaGVpZ2h0O1xuXG4gICAgICAgICAgY2FuUGxhY2VOb2RlID0gIW5vZGVEYXRhLnNvbWUoKG90aGVyTm9kZSkgPT4ge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBvdGhlck5vZGUuZnggPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgb3RoZXJOb2RlLmZ5ID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIG90aGVyTm9kZSA9PT0gbm9kZVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZHggPSBvdGhlck5vZGUuZnggLSBub2RlLmZ4O1xuICAgICAgICAgICAgY29uc3QgZHkgPSBvdGhlck5vZGUuZnkgLSBub2RlLmZ5O1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSkgPCBjdXJyZW50TWluRGlzdGFuY2U7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoIWNhblBsYWNlTm9kZSkge1xuICAgICAgICAgICAgY3VycmVudE1pbkRpc3RhbmNlLS07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjYW5QbGFjZU5vZGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnTm90IGVub3VnaCBzcGFjZSB0byBhY2NvbW1vZGF0ZSBhbGwgbm9kZXMgd2l0aG91dCBhIGZpeGVkIHBvc2l0aW9uLidcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZURhdGE7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgX3VwZGF0ZShfZDMsIHN2ZywgZGF0YSkge1xuICAgIGNvbnN0IHsgbm9kZXMsIGxpbmtzIH0gPSBkYXRhO1xuICAgIHRoaXMubm9kZXMgPSBub2RlcyB8fCBbXTtcbiAgICB0aGlzLmxpbmtzID0gbGlua3MgfHwgW107XG5cbiAgICAvLyBEaXNhYmxlIHRoZSByZXNldCBidG5cbiAgICBsZXQgcmVzZXRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzZXRfZ3JhcGgnKTtcbiAgICBsZXQgc2F2ZUJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlX2dyYXBoJyk7XG4gICAgaWYgKHJlc2V0QnRuKSB7XG4gICAgICByZXNldEJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgIHNhdmVCdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgfVxuICAgIC8vIFdpZHRoL0hlaWdodCBvZiBjYW52YXNcbiAgICBjb25zdCBwYXJlbnRXaWR0aCA9IF9kMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKS5wYXJlbnROb2RlLmNsaWVudFdpZHRoO1xuICAgIGNvbnN0IHBhcmVudEhlaWdodCA9IF9kMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKS5wYXJlbnROb2RlLmNsaWVudEhlaWdodDtcblxuICAgIC8vIENoZWNrIHRvIHNlZSBpZiBub2RlcyBhcmUgaW4gRGV4aWVcbiAgICBjb25zdCBvbGREYXRhID0gYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2UuZ2V0R3JhcGhEYXRhKCdub2RlcycpO1xuICAgIGNvbnN0IG9sZE5vZGVzID0gb2xkRGF0YSA/IG9sZERhdGEubm9kZXMgOiBbXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvbGROb2RlcykpIHtcbiAgICAgIC8vIENvbXBhcmUgYW5kIHNldCBwcm9wZXJ0eSBmb3IgbmV3IG5vZGVzXG4gICAgICB0aGlzLm5vZGVzID0gdGhpcy5jb21wYXJlQW5kTWFya05vZGVzTmV3KG5vZGVzLCBvbGROb2Rlcyk7XG4gICAgICAvLyBSZW1vdmUgb2xkIG5vZGVzIGZyb20gRGV4aWVcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLmRlbGV0ZUdyYXBoRGF0YSgnbm9kZXMnKTtcbiAgICAgIC8vIEFkZCBuZXcgbm9kZXMgdG8gRGV4aWVcbiAgICAgIGF3YWl0IHRoaXMuZGV4aWVTZXJ2aWNlLnNhdmVHcmFwaERhdGEoeyBkYXRhSWQ6ICdub2RlcycsIG5vZGVzOiBkYXRhLm5vZGVzLCBsaW5rczogZGF0YS5saW5rcyB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQWRkIGZpcnN0IHNldCBvZiBub2RlcyB0byBEZXhpZVxuICAgICAgYXdhaXQgdGhpcy5kZXhpZVNlcnZpY2Uuc2F2ZUdyYXBoRGF0YSh7IGRhdGFJZDogJ25vZGVzJywgbm9kZXM6IGRhdGEubm9kZXMsIGxpbmtzOiBkYXRhLmxpbmtzIH0pO1xuICAgIH1cblxuICAgIC8vIElmIG5vZGVzIGRvbid0IGhhdmUgYSBmeC9meSBjb29yZGluYXRlIHdlIGdlbmVyYXRlIGEgcmFuZG9tIG9uZSAtIGRhZ3JlIG5vZGVzIHdpdGhvdXQgbGlua3MgYW5kIG5ldyBub2RlcyBhZGRlZCB0byBjYW52YXMgaGF2ZSBudWxsIGNvb3JkaW5hdGVzIGJ5IGRlc2lnblxuICAgIHRoaXMubm9kZXMgPSB0aGlzLnJhbmRvbWlzZU5vZGVQb3NpdGlvbnMoXG4gICAgICB0aGlzLm5vZGVzLFxuICAgICAgcGFyZW50V2lkdGgsXG4gICAgICBwYXJlbnRIZWlnaHRcbiAgICApO1xuXG4gICAgLy8gR2V0dGluZyBwYXJlbnRzIGxpbmVTdHlsZSBhbmQgYWRkaW5nIGl0IHRvIGNoaWxkIG9iamVjdHNcbiAgICBjb25zdCByZWxhdGlvbnNoaXBzQXJyYXkgPSB0aGlzLmxpbmtzLm1hcChcbiAgICAgICh7IGxpbmVTdHlsZSwgdGFyZ2V0QXJyb3csIHNvdXJjZUFycm93LCByZWxhdGlvbnNoaXBzIH0pID0+XG4gICAgICAgIHJlbGF0aW9uc2hpcHMubWFwKChyKSA9PiAoe1xuICAgICAgICAgIHBhcmVudExpbmVTdHlsZTogbGluZVN0eWxlLFxuICAgICAgICAgIHBhcmVudFNvdXJjZUFycm93OiBzb3VyY2VBcnJvdyxcbiAgICAgICAgICBwYXJlbnRUYXJnZXRBcnJvdzogdGFyZ2V0QXJyb3csXG4gICAgICAgICAgLi4ucixcbiAgICAgICAgfSkpXG4gICAgKTtcblxuICAgIC8vIEFkZGluZyBkeSB2YWx1ZSBiYXNlZCBvbiBsaW5rIG51bWJlciBhbmQgcG9zaXRpb24gaW4gcGFyZW50XG4gICAgcmVsYXRpb25zaGlwc0FycmF5Lm1hcCgobGlua1JlbGF0aW9uc2hpcCkgPT4ge1xuICAgICAgbGlua1JlbGF0aW9uc2hpcC5tYXAoKGxpbmtPYmplY3QsIGkpID0+IHtcbiAgICAgICAgLy8gZHkgaW5jcmVtZW50cyBvZiAxNXB4XG4gICAgICAgIGxpbmtPYmplY3RbJ2R5J10gPSAyMCArIGkgKiAxNTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gSUUxMSBkb2VzIG5vdCBsaWtlIC5mbGF0XG4gICAgdGhpcy5saW5rcyA9IHJlbGF0aW9uc2hpcHNBcnJheS5yZWR1Y2UoKGFjYywgdmFsKSA9PiBhY2MuY29uY2F0KHZhbCksIFtdKTtcblxuICAgIGQzLnNlbGVjdCgnc3ZnJykuYXBwZW5kKCdnJyk7XG5cbiAgICAvLyBab29tIFN0YXJ0XG4gICAgY29uc3Qgem9vbUNvbnRhaW5lciA9IF9kMy5zZWxlY3QoJ3N2ZyBnJyk7XG4gICAgbGV0IGN1cnJlbnRab29tID0gZDMuem9vbVRyYW5zZm9ybShkMy5zZWxlY3QoJ3N2ZycpLm5vZGUoKSk7XG4gICAgY29uc3QgdXBkYXRlWm9vbUxldmVsID0gKCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudFNjYWxlID0gY3VycmVudFpvb20uaztcbiAgICAgIGNvbnN0IG1heFNjYWxlID0gem9vbS5zY2FsZUV4dGVudCgpWzFdO1xuICAgICAgY29uc3Qgem9vbVBlcmNlbnRhZ2UgPSAoKGN1cnJlbnRTY2FsZSAtIDAuNSkgLyAobWF4U2NhbGUgLSAwLjUpKSAqIDIwMDtcbiAgICAgIGNvbnN0IHpvb21MZXZlbERpc3BsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbV9sZXZlbCcpO1xuICAgICAgY29uc3Qgem9vbUxldmVsVGV4dCA9IGBab29tOiAke3pvb21QZXJjZW50YWdlLnRvRml4ZWQoMCl9JWA7XG4gICAgICBjb25zdCB6b29tSW5CdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbV9pbicpO1xuICAgICAgY29uc3Qgem9vbU91dEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tX291dCcpO1xuICAgICAgY29uc3Qgem9vbVJlc2V0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb21fcmVzZXQnKTtcblxuICAgICAgLy8gSXQgbWlnaHQgbm90IGV4aXN0IGRlcGVuZGluZyBvbiB0aGUgdGhpcy56b29tIGJvb2xlYW5cbiAgICAgIGlmICh6b29tUmVzZXRCdG4pIHtcbiAgICAgICAgem9vbVJlc2V0QnRuLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHpvb20gbGV2ZWwgaGFzIGNoYW5nZWQgYmVmb3JlIHVwZGF0aW5nIHRoZSBkaXNwbGF5IC8gYWxsb3dzIGZvciBwYW5uaW5nIHdpdGhvdXQgc2hvd2luZyB0aGUgem9vbSBwZXJjZW50YWdlXG4gICAgICBpZiAoem9vbUxldmVsRGlzcGxheSAmJiB6b29tTGV2ZWxEaXNwbGF5LmlubmVySFRNTCAhPT0gem9vbUxldmVsVGV4dCkge1xuICAgICAgICB6b29tTGV2ZWxEaXNwbGF5LmlubmVySFRNTCA9IHpvb21MZXZlbFRleHQ7XG4gICAgICAgIHpvb21MZXZlbERpc3BsYXkuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgaWYgKHpvb21MZXZlbERpc3BsYXkpIHtcbiAgICAgICAgICAgIHpvb21MZXZlbERpc3BsYXkuc3R5bGUub3BhY2l0eSA9ICcwJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMDApO1xuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbUluQnRuIGlmIHRoZSB6b29tIGxldmVsIGlzIGF0IDIwMCVcbiAgICAgIGlmICh6b29tSW5CdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAyMDApIHtcbiAgICAgICAgICB6b29tSW5CdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgem9vbUluQnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbU91dEJ0biBpZiB0aGUgem9vbSBsZXZlbCBpcyBhdCAwJVxuICAgICAgaWYgKHpvb21PdXRCdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAwKSB7XG4gICAgICAgICAgem9vbU91dEJ0bi5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB6b29tT3V0QnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRGlzYWJsZSB0aGUgem9vbVJlc2V0QnRuIGlmIHRoZSB6b29tIGxldmVsIGlzIGF0IDEwMCVcbiAgICAgIGlmICh6b29tUmVzZXRCdG4pIHtcbiAgICAgICAgaWYgKHpvb21QZXJjZW50YWdlID09PSAxMDApIHtcbiAgICAgICAgICB6b29tUmVzZXRCdG4uc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgem9vbVJlc2V0QnRuLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgbGV0IHpvb21lZEluaXQ7XG4gICAgY29uc3Qgem9vbWVkID0gKCkgPT4ge1xuICAgICAgY29uc3QgdHJhbnNmb3JtID0gZDMuZXZlbnQudHJhbnNmb3JtO1xuICAgICAgem9vbUNvbnRhaW5lci5hdHRyKFxuICAgICAgICAndHJhbnNmb3JtJyxcbiAgICAgICAgYHRyYW5zbGF0ZSgke3RyYW5zZm9ybS54fSwgJHt0cmFuc2Zvcm0ueX0pIHNjYWxlKCR7dHJhbnNmb3JtLmt9KWBcbiAgICAgICk7XG4gICAgICBjdXJyZW50Wm9vbSA9IHRyYW5zZm9ybTtcbiAgICAgIHpvb21lZEluaXQgPSB0cnVlO1xuICAgICAgdXBkYXRlWm9vbUxldmVsKCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHpvb20gPSBkM1xuICAgICAgLnpvb20oKVxuICAgICAgLnNjYWxlRXh0ZW50KFswLjUsIDEuNV0pXG4gICAgICAub24oJ3N0YXJ0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoJ2N1cnNvcicsIHRoaXMuem9vbSA/IG51bGwgOiAnZ3JhYmJpbmcnKTtcbiAgICAgIH0pXG4gICAgICAub24oJ3pvb20nLCB0aGlzLnpvb20gPyB6b29tZWQgOiBudWxsKVxuICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZSgnY3Vyc29yJywgJ2dyYWInKTtcbiAgICAgIH0pO1xuICAgIHN2Z1xuICAgICAgLmNhbGwoem9vbSlcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ2dyYWInKVxuICAgICAgLm9uKHRoaXMuem9vbSA/IG51bGwgOiAnd2hlZWwuem9vbScsIG51bGwpXG4gICAgICAub24oJ2RibGNsaWNrLnpvb20nLCBudWxsKTtcbiAgICB6b29tLmZpbHRlcigoKSA9PiAhZDMuZXZlbnQuc2hpZnRLZXkpO1xuXG4gICAgLy8gWm9vbSBidXR0b24gY29udHJvbHNcbiAgICBkMy5zZWxlY3QoJyN6b29tX2luJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgem9vbS5zY2FsZUJ5KHN2Zy50cmFuc2l0aW9uKCkuZHVyYXRpb24oNzUwKSwgMS4yKTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIGQzLnNlbGVjdCgnI3pvb21fb3V0Jykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgem9vbS5zY2FsZUJ5KHN2Zy50cmFuc2l0aW9uKCkuZHVyYXRpb24oNzUwKSwgMC44KTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIGQzLnNlbGVjdCgnI3pvb21fcmVzZXQnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICB6b29tLnNjYWxlVG8oc3ZnLnRyYW5zaXRpb24oKS5kdXJhdGlvbig3NTApLCAxKTtcbiAgICAgIHVwZGF0ZVpvb21MZXZlbCgpO1xuICAgIH0pO1xuICAgIC8vIFpvb20gdG8gZml0IGZ1bmN0aW9uIGFuZCBCdXR0b25cbiAgICBjb25zdCBoYW5kbGVab29tVG9GaXQgPSAoKSA9PiB7XG4gICAgICBjb25zdCBub2RlQkJveCA9IHpvb21Db250YWluZXIubm9kZSgpLmdldEJCb3goKTtcblxuICAgICAgLy8gQ2FsY3VsYXRlIHNjYWxlIGFuZCB0cmFuc2xhdGUgdmFsdWVzIHRvIGZpdCBhbGwgbm9kZXNcbiAgICAgIGNvbnN0IHBhZGRpbmcgPSAzMDtcbiAgICAgIGNvbnN0IHNjYWxlWCA9IChwYXJlbnRXaWR0aCAtIHBhZGRpbmcgKiAyKSAvIG5vZGVCQm94LndpZHRoO1xuICAgICAgY29uc3Qgc2NhbGVZID0gKHBhcmVudEhlaWdodCAtIHBhZGRpbmcgKiAyKSAvIG5vZGVCQm94LmhlaWdodDtcbiAgICAgIGNvbnN0IHNjYWxlID0gTWF0aC5taW4oc2NhbGVYLCBzY2FsZVksIDEuMCk7IC8vIFJlc3RyaWN0IHNjYWxlIHRvIGEgbWF4aW11bSBvZiAxLjBcblxuICAgICAgY29uc3QgdHJhbnNsYXRlWCA9XG4gICAgICAgIC1ub2RlQkJveC54ICogc2NhbGUgKyAocGFyZW50V2lkdGggLSBub2RlQkJveC53aWR0aCAqIHNjYWxlKSAvIDI7XG4gICAgICBjb25zdCB0cmFuc2xhdGVZID1cbiAgICAgICAgLW5vZGVCQm94LnkgKiBzY2FsZSArIChwYXJlbnRIZWlnaHQgLSBub2RlQkJveC5oZWlnaHQgKiBzY2FsZSkgLyAyO1xuXG4gICAgICAvLyBHZXQgdGhlIGJvdW5kaW5nIGJveCBvZiBhbGwgbm9kZXNcbiAgICAgIGNvbnN0IGFsbE5vZGVzID0gem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKTtcbiAgICAgIGNvbnN0IGFsbE5vZGVzQkJveCA9IGFsbE5vZGVzLm5vZGVzKCkucmVkdWNlKFxuICAgICAgICAoYWNjLCBub2RlKSA9PiB7XG4gICAgICAgICAgY29uc3Qgbm9kZUJCb3ggPSBub2RlLmdldEJCb3goKTtcbiAgICAgICAgICBhY2MueCA9IE1hdGgubWluKGFjYy54LCBub2RlQkJveC54KTtcbiAgICAgICAgICBhY2MueSA9IE1hdGgubWluKGFjYy55LCBub2RlQkJveC55KTtcbiAgICAgICAgICBhY2Mud2lkdGggPSBNYXRoLm1heChhY2Mud2lkdGgsIG5vZGVCQm94LnggKyBub2RlQkJveC53aWR0aCk7XG4gICAgICAgICAgYWNjLmhlaWdodCA9IE1hdGgubWF4KGFjYy5oZWlnaHQsIG5vZGVCQm94LnkgKyBub2RlQkJveC5oZWlnaHQpO1xuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sXG4gICAgICAgIHsgeDogSW5maW5pdHksIHk6IEluZmluaXR5LCB3aWR0aDogLUluZmluaXR5LCBoZWlnaHQ6IC1JbmZpbml0eSB9XG4gICAgICApO1xuXG4gICAgICAvLyBDaGVjayBpZiBhbGwgbm9kZXMgYXJlIHdpdGhpbiB0aGUgdmlld2FibGUgY29udGFpbmVyXG4gICAgICBpZiAoXG4gICAgICAgIGFsbE5vZGVzQkJveC54ICogc2NhbGUgPj0gMCAmJlxuICAgICAgICBhbGxOb2Rlc0JCb3gueSAqIHNjYWxlID49IDAgJiZcbiAgICAgICAgYWxsTm9kZXNCQm94LndpZHRoICogc2NhbGUgPD0gcGFyZW50V2lkdGggJiZcbiAgICAgICAgYWxsTm9kZXNCQm94LmhlaWdodCAqIHNjYWxlIDw9IHBhcmVudEhlaWdodFxuICAgICAgKSB7XG4gICAgICAgIC8vIEFsbCBub2RlcyBhcmUgd2l0aGluIHRoZSB2aWV3YWJsZSBjb250YWluZXIsIG5vIG5lZWQgdG8gYXBwbHkgem9vbSB0cmFuc2Zvcm1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBNYW51YWxseSByZXNldCB0aGUgem9vbSB0cmFuc2Zvcm1cbiAgICAgIHpvb21Db250YWluZXJcbiAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAuZHVyYXRpb24oNzUwKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCAwKSBzY2FsZSgxKScpO1xuXG4gICAgICAvLyBBcHBseSB6b29tIHRyYW5zZm9ybSB0byB6b29tQ29udGFpbmVyXG4gICAgICB6b29tQ29udGFpbmVyXG4gICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgLmR1cmF0aW9uKDc1MClcbiAgICAgICAgLmF0dHIoXG4gICAgICAgICAgJ3RyYW5zZm9ybScsXG4gICAgICAgICAgYHRyYW5zbGF0ZSgke3RyYW5zbGF0ZVh9LCAke3RyYW5zbGF0ZVl9KSBzY2FsZSgke3NjYWxlfSlgXG4gICAgICAgICk7XG5cbiAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudFpvb20gdmFyaWFibGUgd2l0aCB0aGUgbmV3IHRyYW5zZm9ybVxuICAgICAgLy8gem9vbWVkSW5pdCAtIGNyZWF0ZWQgYmVjYXVzZSBpZiB6b29tVG9GaXQgaXMgY2FsbGVkIGJlZm9yZSBhbnl0aGluZyBlbHNlIGl0IHNjcmV3cyB1cCB0aGUgYmFzZSB0cmFuc2Zvcm0gLSBlLmcuIHNob3dDdXJyZW50TWF0Y2hcbiAgICAgIGlmICh6b29tZWRJbml0KSB7XG4gICAgICAgIGN1cnJlbnRab29tLnggPSB0cmFuc2xhdGVYO1xuICAgICAgICBjdXJyZW50Wm9vbS55ID0gdHJhbnNsYXRlWTtcbiAgICAgICAgY3VycmVudFpvb20uayA9IHNjYWxlO1xuICAgICAgfVxuICAgICAgdXBkYXRlWm9vbUxldmVsKCk7XG4gICAgfTtcblxuICAgIGQzLnNlbGVjdCgnI3pvb21fdG9fZml0Jykub24oJ2NsaWNrJywgaGFuZGxlWm9vbVRvRml0KTtcblxuICAgIC8vIENoZWNrIGlmIHpvb20gbGV2ZWwgaXMgYXQgMCUgb3IgMTAwJSBiZWZvcmUgYWxsb3dpbmcgbW91c2V3aGVlbCB6b29tIC0gdGhpcyBzdGFiaWxpc2VzIHRoZSBjYW52YXMgd2hlbiB0aGUgbGltaXQgaXMgcmVhY2hlZFxuICAgIHN2Zy5vbignd2hlZWwnLCAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50U2NhbGUgPSBjdXJyZW50Wm9vbS5rO1xuICAgICAgY29uc3QgbWF4U2NhbGUgPSB6b29tLnNjYWxlRXh0ZW50KClbMV07XG4gICAgICBjb25zdCBtaW5TY2FsZSA9IHpvb20uc2NhbGVFeHRlbnQoKVswXTtcbiAgICAgIGlmIChjdXJyZW50U2NhbGUgPT09IG1heFNjYWxlIHx8IGN1cnJlbnRTY2FsZSA9PT0gbWluU2NhbGUpIHtcbiAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFpvb20gRW5kXG4gICAgLy8gU2VsZWN0aW9uIGJ1dHRvbnNcbiAgICBjb25zdCBzZWxlY3RBbGxOb2RlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZWxlY3RfYWxsJyk7XG4gICAgY29uc3QgaGFuZGxlU2VsZWN0QWxsTm9kZXMgPSAoKSA9PiB7XG4gICAgICBjb25zdCB0b3RhbFNpemUgPSBub2RlRW50ZXIuc2l6ZSgpO1xuICAgICAgY29uc3Qgbm9uU2VsZWN0ZWROb2RlcyA9IGQzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcjpub3QoLnNlbGVjdGVkKScpO1xuICAgICAgY29uc3QgY291bnQgPSBub25TZWxlY3RlZE5vZGVzLnNpemUoKTtcbiAgICAgIGNvbnN0IG5vdFNlbGVjdGVkU2l6ZSA9IHRvdGFsU2l6ZSAtIGNvdW50O1xuXG4gICAgICBpZiAobm90U2VsZWN0ZWRTaXplICE9PSB0b3RhbFNpemUpIHtcbiAgICAgICAgaWYgKHNlbGVjdEFsbE5vZGVzKSB7XG4gICAgICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZFwiPjwvaT4nO1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMC42NSc7XG4gICAgICAgIH1cbiAgICAgICAgX2QzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICBwLnByZXZpb3VzbHlTZWxlY3RlZCA9IHAuc2VsZWN0ZWQ7XG4gICAgICAgICAgcmV0dXJuIChwLnNlbGVjdGVkID0gdHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBkMy5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgKGQpID0+IChkLnNlbGVjdGVkID8gJ2JsdWUnIDogJyM5OTknKSlcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgKGQpID0+IChkLnNlbGVjdGVkID8gNzAwIDogNDAwKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc2VsZWN0QWxsTm9kZXMpIHtcbiAgICAgICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+JztcbiAgICAgICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgICB9XG4gICAgICAgIF9kMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgICAgX2QzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICByZXR1cm4gKHAuc2VsZWN0ZWQgPSBwLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgfVxuICAgICAgLy8gcmVzZXQgbGluayBzdHlsZVxuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgIH07XG4gICAgZDMuc2VsZWN0KCcjc2VsZWN0X2FsbCcpLm9uKCdjbGljaycsIGhhbmRsZVNlbGVjdEFsbE5vZGVzKTtcblxuICAgIGNvbnN0IGhhbmRsZVRvZ2dsZVNlbGVjdGlvbiA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHRvdGFsU2l6ZSA9IG5vZGVFbnRlci5zaXplKCk7XG4gICAgICBjb25zdCBzZWxlY3RlZE5vZGVzID0gZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyLnNlbGVjdGVkJyk7XG4gICAgICBjb25zdCBub25TZWxlY3RlZE5vZGVzID0gZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyOm5vdCguc2VsZWN0ZWQpJyk7XG4gICAgICBjb25zdCBzZWxlY3RlZENvdW50ID0gc2VsZWN0ZWROb2Rlcy5zaXplKCk7XG4gICAgICBjb25zdCBub25TZWxlY3RlZENvdW50ID0gbm9uU2VsZWN0ZWROb2Rlcy5zaXplKCk7XG5cbiAgICAgIGlmIChzZWxlY3RlZENvdW50ID4gMCkge1xuICAgICAgICAvLyBEZXNlbGVjdCBzZWxlY3RlZCBub2RlcyBhbmQgc2VsZWN0IG5vbi1zZWxlY3RlZCBub2Rlc1xuICAgICAgICBzZWxlY3RlZE5vZGVzLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICBwLnByZXZpb3VzbHlTZWxlY3RlZCA9IHAuc2VsZWN0ZWQ7XG4gICAgICAgICAgcmV0dXJuIChwLnNlbGVjdGVkID0gZmFsc2UpO1xuICAgICAgICB9KTtcblxuICAgICAgICBub25TZWxlY3RlZE5vZGVzLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICBwLnByZXZpb3VzbHlTZWxlY3RlZCA9IHAuc2VsZWN0ZWQ7XG4gICAgICAgICAgcmV0dXJuIChwLnNlbGVjdGVkID0gdHJ1ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElmIHRoZXJlIGFyZSBvbmx5IHR3byBub2RlcyBzZWxlY3RlZCB3ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgc3ViamVjdCBzZWxlY3RlZE5vZGVzQXJyYXkgc28gd2UgY2FuIGNyZWF0ZSBhIG5ldyBsaW5rIHdpdGggdGhlIGNvcnJlY3Qgbm9kZXMgYXR0YWNoZWQuXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkU2l6ZSA9IHN2Zy5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpLnNpemUoKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkU2l6ZSA8PSAyKSB7XG4gICAgICAgICAgLy8gZ2V0IGRhdGEgZnJvbSBub2RlXG4gICAgICAgICAgY29uc3QgbG9jYWxzZWxlY3RlZE5vZGVzQXJyYXkgPSBfZDMuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKS5kYXRhKCk7XG4gICAgICAgICAgY29uc3QgZmlsdGVySWQgPSBsb2NhbHNlbGVjdGVkTm9kZXNBcnJheS5maWx0ZXIoKHgpID0+IHgpO1xuICAgICAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoZmlsdGVySWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0eWxlcyBvZiBub2RlIGVsZW1lbnRzXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgKGQpID0+IChkLnNlbGVjdGVkID8gJ2JsdWUnIDogJyMyMTI1MjknKSlcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgKGQpID0+IChkLnNlbGVjdGVkID8gNzAwIDogNDAwKSk7XG4gICAgICB9IGVsc2UgaWYgKG5vblNlbGVjdGVkQ291bnQgPiAwKSB7XG4gICAgICAgIC8vIFNlbGVjdCBhbGwgbm9kZXMgaWYgbm9uZSBhcmUgc2VsZWN0ZWRcbiAgICAgICAgX2QzLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICBwLnByZXZpb3VzbHlTZWxlY3RlZCA9IHAuc2VsZWN0ZWQ7XG4gICAgICAgICAgcmV0dXJuIChwLnNlbGVjdGVkID0gdHJ1ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdHlsZXMgb2Ygbm9kZSBlbGVtZW50c1xuICAgICAgICBfZDNcbiAgICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJ2JsdWUnKTtcbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHRoZSBzdGF0ZSBvZiBhbm90aGVyIGJ1dHRvbiBiYXNlZCBvbiB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICAgIGNvbnN0IHVwZGF0ZWRTZWxlY3RlZENvdW50ID1cbiAgICAgICAgc2VsZWN0ZWRDb3VudCA+IDAgPyB0b3RhbFNpemUgLSBzZWxlY3RlZENvdW50IDogdG90YWxTaXplO1xuICAgICAgaWYgKHVwZGF0ZWRTZWxlY3RlZENvdW50ID09PSB0b3RhbFNpemUpIHtcbiAgICAgICAgLy8gVXBkYXRlIHRoZSBzdGF0ZSBvZiBhbm90aGVyIGJ1dHRvbiBpZiBhbGwgbm9kZXMgYXJlIHNlbGVjdGVkXG4gICAgICAgIGlmIChzZWxlY3RBbGxOb2Rlcykge1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWRcIj48L2k+JztcbiAgICAgICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzAuNjUnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBVcGRhdGUgdGhlIHN0YXRlIG9mIGFub3RoZXIgYnV0dG9uIGlmIG5vdCBhbGwgbm9kZXMgYXJlIHNlbGVjdGVkXG4gICAgICAgIGlmIChzZWxlY3RBbGxOb2Rlcykge1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWQtZmlsbFwiPjwvaT4nO1xuICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHJlc2V0IGxpbmsgc3R5bGVcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICB9O1xuXG4gICAgZDMuc2VsZWN0KCcjdG9nZ2xlX3NlbGVjdGlvbicpLm9uKCdjbGljaycsIGhhbmRsZVRvZ2dsZVNlbGVjdGlvbik7XG5cbiAgICAvLyBzZWFyY2hcbiAgICBjb25zdCBzZWFyY2hCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2VhcmNoQnV0dG9uJyk7XG4gICAgLy8gQ2hlY2sgdG8gc2VlIGlmIGV4aXN0cyAtIGNvbnRyb2wgYm9vbFxuICAgIGlmIChzZWFyY2hCdG4pIHtcbiAgICAgIGNvbnN0IHNlYXJjaElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICdzZWFyY2hJbnB1dCdcbiAgICAgICkgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICAgIGNvbnN0IGNsZWFyQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXG4gICAgICAgICdjbGVhckJ1dHRvbidcbiAgICAgICkgYXMgSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgICBjb25zdCBoYW5kbGVTZWFyY2ggPSAoZXZlbnQ6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgcGVyZm9ybVNlYXJjaCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBsZXQgbWF0Y2hpbmdOb2RlcyA9IFtdO1xuICAgICAgbGV0IGN1cnJlbnRNYXRjaEluZGV4ID0gLTE7XG5cbiAgICAgIGNvbnN0IHNob3dDdXJyZW50TWF0Y2ggPSAoKSA9PiB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXNseSBhZGRlZCBiYWNrZ3JvdW5kIGNpcmNsZVxuICAgICAgICBkMy5zZWxlY3RBbGwoJ2NpcmNsZS5oaWdobGlnaHQtYmFja2dyb3VuZCcpLnJlbW92ZSgpO1xuXG4gICAgICAgIGNvbnN0IG1hdGNoaW5nTm9kZSA9IG1hdGNoaW5nTm9kZXNbY3VycmVudE1hdGNoSW5kZXhdO1xuICAgICAgICAvLyBIaWdobGlnaHQgdGhlIG1hdGNoaW5nIG5vZGVcbiAgICAgICAgY29uc3Qgbm9kZVdyYXBwZXIgPSBkMy5zZWxlY3RBbGwoJy5ub2RlLXdyYXBwZXInKS5maWx0ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBkMy5zZWxlY3QodGhpcykuYXR0cignaWQnKSA9PT0gbWF0Y2hpbmdOb2RlLmlkO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgYSBuZXcgYmFja2dyb3VuZCBjaXJjbGUgdG8gdGhlIGVudGlyZSA8Zz4gbm9kZVxuICAgICAgICBjb25zdCBiYm94ID0gbm9kZVdyYXBwZXIubm9kZSgpLmdldEJCb3goKTtcbiAgICAgICAgY29uc3QgY2VudGVyWCA9IGJib3gueCArIGJib3gud2lkdGggLyAyO1xuICAgICAgICBjb25zdCBjZW50ZXJZID0gYmJveC55ICsgYmJveC5oZWlnaHQgLyAyO1xuICAgICAgICBjb25zdCByYWRpdXMgPSBNYXRoLm1heChiYm94LndpZHRoICsgMzAsIGJib3guaGVpZ2h0KSAvIDI7XG5cbiAgICAgICAgY29uc3QgYmFja2dyb3VuZENpcmNsZSA9IG5vZGVXcmFwcGVyXG4gICAgICAgICAgLmluc2VydCgnY2lyY2xlJywgJzpmaXJzdC1jaGlsZCcpXG4gICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2hpZ2hsaWdodC1iYWNrZ3JvdW5kJylcbiAgICAgICAgICAuYXR0cignZmlsbCcsICd5ZWxsb3cnKVxuICAgICAgICAgIC5hdHRyKCdvcGFjaXR5JywgJzAuMycpXG4gICAgICAgICAgLmF0dHIoJ2N4JywgY2VudGVyWClcbiAgICAgICAgICAuYXR0cignY3knLCBjZW50ZXJZKTtcblxuICAgICAgICAvLyBBbmltYXRlIHRoZSBiYWNrZ3JvdW5kIGNpcmNsZVxuICAgICAgICBiYWNrZ3JvdW5kQ2lyY2xlXG4gICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgICAgIC5hdHRyKCdyJywgcmFkaXVzKVxuICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgICAgICAuYXR0cigncicsIHJhZGl1cyAvIDQpXG4gICAgICAgICAgLmF0dHIoJ29wYWNpdHknLCAnMC41JylcbiAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAgICAgLmF0dHIoJ3InLCByYWRpdXMpXG4gICAgICAgICAgLmF0dHIoJ29wYWNpdHknLCAnMC4zJyk7XG5cbiAgICAgICAgLy8gWm9vbSB0byB0aGUgbWF0Y2hpbmcgbm9kZVxuICAgICAgICBjb25zdCB6b29tVHJhbnNmb3JtID0gZDMuem9vbVRyYW5zZm9ybShzdmcubm9kZSgpKTtcbiAgICAgICAgY29uc3QgeyB4LCB5LCBrIH0gPSB6b29tVHJhbnNmb3JtO1xuICAgICAgICBjb25zdCB7IGZ4LCBmeSB9ID0gbWF0Y2hpbmdOb2RlO1xuICAgICAgICBjb25zdCBuZXdab29tVHJhbnNmb3JtID0gZDMuem9vbUlkZW50aXR5XG4gICAgICAgICAgLnRyYW5zbGF0ZSgtZnggKiBrICsgcGFyZW50V2lkdGggLyAyLCAtZnkgKiBrICsgcGFyZW50SGVpZ2h0IC8gMilcbiAgICAgICAgICAuc2NhbGUoayk7XG4gICAgICAgIHpvb21Db250YWluZXJcbiAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmR1cmF0aW9uKDc1MClcbiAgICAgICAgICAuY2FsbCh6b29tLnRyYW5zZm9ybSwgbmV3Wm9vbVRyYW5zZm9ybSk7XG5cbiAgICAgICAgLy8gRGlzYWJsZS9FbmFibGUgbmF2aWdhdGlvbiBidXR0b25zXG4gICAgICAgIGNvbnN0IHByZXZCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAncHJldkJ1dHRvbidcbiAgICAgICAgKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICAgICAgY29uc3QgbmV4dEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICduZXh0QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBwcmV2QnV0dG9uLmRpc2FibGVkID0gY3VycmVudE1hdGNoSW5kZXggPT09IDA7XG4gICAgICAgIG5leHRCdXR0b24uZGlzYWJsZWQgPSBjdXJyZW50TWF0Y2hJbmRleCA9PT0gbWF0Y2hpbmdOb2Rlcy5sZW5ndGggLSAxO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgcGVyZm9ybVNlYXJjaCA9ICgpID0+IHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91c2x5IGFkZGVkIGJhY2tncm91bmQgY2lyY2xlXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnY2lyY2xlLmhpZ2hsaWdodC1iYWNrZ3JvdW5kJykucmVtb3ZlKCk7XG5cbiAgICAgICAgY29uc3Qgc2VhcmNoVGVybSA9IHNlYXJjaElucHV0LnZhbHVlLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgICAgIGlmIChzZWFyY2hUZXJtLmxlbmd0aCA+PSAzKSB7XG4gICAgICAgICAgLy8gUGVyZm9ybSB0aGUgc2VhcmNoXG4gICAgICAgICAgbWF0Y2hpbmdOb2RlcyA9IHRoaXMubm9kZXMuZmlsdGVyKChub2RlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsYWJlbCA9IG5vZGUubGFiZWwubWFwKChpdGVtKSA9PiBpdGVtLnRvTG93ZXJDYXNlKCkpO1xuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICBsYWJlbC5zb21lKChsYWJlbEl0ZW0pID0+IGxhYmVsSXRlbS5pbmNsdWRlcyhzZWFyY2hUZXJtKSkgfHxcbiAgICAgICAgICAgICAgbm9kZS5sYWJlbC5zb21lKChvYmopID0+XG4gICAgICAgICAgICAgICAgT2JqZWN0LnZhbHVlcyhvYmopLnNvbWUoKHZhbHVlKSA9PlxuICAgICAgICAgICAgICAgICAgU3RyaW5nKHZhbHVlKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaFRlcm0pXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKG1hdGNoaW5nTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY3VycmVudE1hdGNoSW5kZXggPSAwO1xuICAgICAgICAgICAgc2hvd0N1cnJlbnRNYXRjaCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdXJyZW50TWF0Y2hJbmRleCA9IC0xO1xuICAgICAgICAgICAgc2hvd05vTWF0Y2hlcygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBDbGVhciBzZWFyY2hcbiAgICAgICAgICBtYXRjaGluZ05vZGVzID0gW107XG4gICAgICAgICAgY3VycmVudE1hdGNoSW5kZXggPSAtMTtcbiAgICAgICAgICBzaG93Tm9NYXRjaGVzKCk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGVDbGVhckJ1dHRvbigpO1xuICAgICAgfTtcblxuICAgICAgY29uc3Qgc2hvd05vTWF0Y2hlcyA9ICgpID0+IHtcbiAgICAgICAgLy8gUmVzZXQgem9vbSBsZXZlbFxuICAgICAgICBjb25zdCBuZXdab29tVHJhbnNmb3JtID0gZDMuem9vbUlkZW50aXR5LnRyYW5zbGF0ZSgwLCAwKS5zY2FsZSgxKTtcbiAgICAgICAgem9vbUNvbnRhaW5lclxuICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZHVyYXRpb24oNzUwKVxuICAgICAgICAgIC5jYWxsKHpvb20udHJhbnNmb3JtLCBuZXdab29tVHJhbnNmb3JtKTtcbiAgICAgICAgdXBkYXRlWm9vbUxldmVsKCk7XG4gICAgICAgIC8vIERpc2FibGUgbmF2aWdhdGlvbiBidXR0b25zXG4gICAgICAgIGNvbnN0IHByZXZCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcbiAgICAgICAgICAncHJldkJ1dHRvbidcbiAgICAgICAgKSBhcyBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICAgICAgY29uc3QgbmV4dEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICduZXh0QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBwcmV2QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgbmV4dEJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gU2hvdyBcIm5vIG1hdGNoZXMgZm91bmRcIiB0ZXh0IHdpdGggZmFkZS1pbiB0cmFuc2l0aW9uXG4gICAgICAgIGNvbnN0IG5vTWF0Y2hlc1RleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbm9NYXRjaGVzVGV4dCcpO1xuICAgICAgICBpZiAoc2VhcmNoSW5wdXQudmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgbm9NYXRjaGVzVGV4dC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG4gICAgICAgICAgLy8gRmFkZSBhd2F5IGFmdGVyIGEgZmV3IHNlY29uZHNcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIC8vIEhpZGUgXCJubyBtYXRjaGVzIGZvdW5kXCIgdGV4dCB3aXRoIGZhZGUtb3V0IHRyYW5zaXRpb25cbiAgICAgICAgICAgIG5vTWF0Y2hlc1RleHQuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBuYXZpZ2F0ZU5leHQgPSAoKSA9PiB7XG4gICAgICAgIGlmIChjdXJyZW50TWF0Y2hJbmRleCA8IG1hdGNoaW5nTm9kZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIGN1cnJlbnRNYXRjaEluZGV4Kys7XG4gICAgICAgICAgc2hvd0N1cnJlbnRNYXRjaCgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBuYXZpZ2F0ZVByZXZpb3VzID0gKCkgPT4ge1xuICAgICAgICBpZiAoY3VycmVudE1hdGNoSW5kZXggPiAwKSB7XG4gICAgICAgICAgY3VycmVudE1hdGNoSW5kZXgtLTtcbiAgICAgICAgICBzaG93Q3VycmVudE1hdGNoKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNsZWFyU2VhcmNoSW5wdXQgPSAoKSA9PiB7XG4gICAgICAgIHNlYXJjaElucHV0LnZhbHVlID0gJyc7XG4gICAgICAgIHNlYXJjaElucHV0LmZvY3VzKCk7XG4gICAgICAgIHVwZGF0ZUNsZWFyQnV0dG9uKCk7XG4gICAgICAgIG1hdGNoaW5nTm9kZXMgPSBbXTtcbiAgICAgICAgY3VycmVudE1hdGNoSW5kZXggPSAtMTtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBwcmV2aW91c2x5IGFkZGVkIGJhY2tncm91bmQgY2lyY2xlXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnY2lyY2xlLmhpZ2hsaWdodC1iYWNrZ3JvdW5kJykucmVtb3ZlKCk7XG5cbiAgICAgICAgLy8gRGlzYWJsZSB0aGUgbmV4dEJ1dHRvbiAmIHByZXZCdXR0b25cbiAgICAgICAgY29uc3QgbmV4dEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICduZXh0QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBuZXh0QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgcHJldkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFxuICAgICAgICAgICdwcmV2QnV0dG9uJ1xuICAgICAgICApIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgICBwcmV2QnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHVwZGF0ZUNsZWFyQnV0dG9uID0gKCkgPT4ge1xuICAgICAgICBjbGVhckJ1dHRvbi5kaXNhYmxlZCA9IHNlYXJjaElucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPT09IDA7XG4gICAgICB9O1xuXG4gICAgICAvLyBXZSByZXNldCB0aGUgc2VhcmNoIHdoZW4gd2UgcmVzZXQgdGhlIGRhdGFcbiAgICAgIGlmICh0aGlzLnJlc2V0U2VhcmNoKSB7XG4gICAgICAgIGNsZWFyU2VhcmNoSW5wdXQoKTtcbiAgICAgICAgdGhpcy5yZXNldFNlYXJjaCA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBzZWFyY2hJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIHVwZGF0ZUNsZWFyQnV0dG9uKTtcbiAgICAgIHNlYXJjaEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBlcmZvcm1TZWFyY2gpO1xuICAgICAgY2xlYXJCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbGVhclNlYXJjaElucHV0KTtcbiAgICAgIGRvY3VtZW50XG4gICAgICAgIC5nZXRFbGVtZW50QnlJZCgnc2VhcmNoSW5wdXQnKVxuICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZVNlYXJjaCk7XG4gICAgICBkb2N1bWVudFxuICAgICAgICAuZ2V0RWxlbWVudEJ5SWQoJ25leHRCdXR0b24nKVxuICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBuYXZpZ2F0ZU5leHQpO1xuICAgICAgZG9jdW1lbnRcbiAgICAgICAgLmdldEVsZW1lbnRCeUlkKCdwcmV2QnV0dG9uJylcbiAgICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbmF2aWdhdGVQcmV2aW91cyk7XG4gICAgfVxuICAgIC8vIEZvciBhcnJvd3NcbiAgICB0aGlzLmluaXREZWZpbml0aW9ucyhzdmcpO1xuXG4gICAgY29uc3Qgc2ltdWxhdGlvbiA9IHRoaXMuZm9yY2VTaW11bGF0aW9uKF9kMywge1xuICAgICAgd2lkdGg6ICtzdmcuYXR0cignd2lkdGgnKSxcbiAgICAgIGhlaWdodDogK3N2Zy5hdHRyKCdoZWlnaHQnKSxcbiAgICB9KTtcblxuICAgIC8vIEJydXNoIFN0YXJ0XG4gICAgbGV0IGdCcnVzaEhvbGRlciA9IHN2Zy5hcHBlbmQoJ2cnKTtcblxuICAgIGxldCBicnVzaCA9IGQzXG4gICAgICAuYnJ1c2goKVxuICAgICAgLm9uKCdzdGFydCcsICgpID0+IHtcbiAgICAgICAgdGhpcy5icnVzaGluZyA9IHRydWU7XG5cbiAgICAgICAgbm9kZUVudGVyLmVhY2goKGQpID0+IHtcbiAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IHRoaXMuc2hpZnRLZXkgJiYgZC5zZWxlY3RlZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgfSlcbiAgICAgIC5vbignYnJ1c2gnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZXh0ZW50ID0gZDMuZXZlbnQuc2VsZWN0aW9uO1xuICAgICAgICBpZiAoIWQzLmV2ZW50LnNvdXJjZUV2ZW50IHx8ICF0aGlzLmV4dGVudCB8fCAhdGhpcy5icnVzaE1vZGUpIHJldHVybjtcbiAgICAgICAgaWYgKCFjdXJyZW50Wm9vbSkgcmV0dXJuO1xuXG4gICAgICAgIG5vZGVFbnRlclxuICAgICAgICAgIC5jbGFzc2VkKCdzZWxlY3RlZCcsIChkKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gKGQuc2VsZWN0ZWQgPVxuICAgICAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCBeXG4gICAgICAgICAgICAgICg8YW55PihcbiAgICAgICAgICAgICAgICAoZDMuZXZlbnQuc2VsZWN0aW9uWzBdWzBdIDw9XG4gICAgICAgICAgICAgICAgICBkLnggKiBjdXJyZW50Wm9vbS5rICsgY3VycmVudFpvb20ueCAmJlxuICAgICAgICAgICAgICAgICAgZC54ICogY3VycmVudFpvb20uayArIGN1cnJlbnRab29tLnggPFxuICAgICAgICAgICAgICAgICAgZDMuZXZlbnQuc2VsZWN0aW9uWzFdWzBdICYmXG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5zZWxlY3Rpb25bMF1bMV0gPD1cbiAgICAgICAgICAgICAgICAgIGQueSAqIGN1cnJlbnRab29tLmsgKyBjdXJyZW50Wm9vbS55ICYmXG4gICAgICAgICAgICAgICAgICBkLnkgKiBjdXJyZW50Wm9vbS5rICsgY3VycmVudFpvb20ueSA8XG4gICAgICAgICAgICAgICAgICBkMy5ldmVudC5zZWxlY3Rpb25bMV1bMV0pXG4gICAgICAgICAgICAgICkpKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zZWxlY3QoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLmNsYXNzZWQoJ3NlbGVjdGVkJywgKGQpID0+IGQuc2VsZWN0ZWQpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgKGQpID0+IChkLnNlbGVjdGVkID8gJ2JsdWUnIDogJyM5OTknKSlcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgKGQpID0+IChkLnNlbGVjdGVkID8gNzAwIDogNDAwKSk7XG5cbiAgICAgICAgdGhpcy5leHRlbnQgPSBkMy5ldmVudC5zZWxlY3Rpb247XG4gICAgICB9KVxuICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGlmICghZDMuZXZlbnQuc291cmNlRXZlbnQgfHwgIXRoaXMuZXh0ZW50IHx8ICF0aGlzLmdCcnVzaCkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuZ0JydXNoLmNhbGwoYnJ1c2gubW92ZSwgbnVsbCk7XG4gICAgICAgIGlmICghdGhpcy5icnVzaE1vZGUpIHtcbiAgICAgICAgICAvLyB0aGUgc2hpZnQga2V5IGhhcyBiZWVuIHJlbGVhc2UgYmVmb3JlIHdlIGVuZGVkIG91ciBicnVzaGluZ1xuICAgICAgICAgIHRoaXMuZ0JydXNoLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMuZ0JydXNoID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJydXNoaW5nID0gZmFsc2U7XG5cbiAgICAgICAgbm9kZUVudGVyXG4gICAgICAgICAgLnNlbGVjdCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSkuY2xhc3NlZCgnc2VsZWN0ZWQnKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcblxuICAgICAgICBjb25zdCB0b3RhbFNpemUgPSBub2RlRW50ZXIuc2l6ZSgpO1xuICAgICAgICBjb25zdCBub25TZWxlY3RlZE5vZGVzID0gZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyOm5vdCguc2VsZWN0ZWQpJyk7XG4gICAgICAgIGNvbnN0IGNvdW50ID0gbm9uU2VsZWN0ZWROb2Rlcy5zaXplKCk7XG4gICAgICAgIGNvbnN0IG5vdFNlbGVjdGVkU2l6ZSA9IHRvdGFsU2l6ZSAtIGNvdW50O1xuXG4gICAgICAgIGlmIChub3RTZWxlY3RlZFNpemUgPT09IHRvdGFsU2l6ZSkge1xuICAgICAgICAgIGlmIChzZWxlY3RBbGxOb2Rlcykge1xuICAgICAgICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZFwiPjwvaT4nO1xuICAgICAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcwLjY1JztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHNlbGVjdEFsbE5vZGVzKSB7XG4gICAgICAgICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+JztcbiAgICAgICAgICAgIHNlbGVjdEFsbE5vZGVzLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gY291bnRzIG51bWJlciBvZiBzZWxlY3RlZCBjbGFzc2VzIHRvIG5vdCBleGNlZWQgMlxuICAgICAgICBjb25zdCBzZWxlY3RlZFNpemUgPSBub2RlRW50ZXIuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKS5zaXplKCk7XG4gICAgICAgIGlmIChzZWxlY3RlZFNpemUgPD0gMikge1xuICAgICAgICAgIC8vIGdldCBkYXRhIGZyb20gbm9kZVxuICAgICAgICAgIGNvbnN0IGxvY2Fsc2VsZWN0ZWROb2Rlc0FycmF5ID0gbm9kZUVudGVyXG4gICAgICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAgICAgLmRhdGEoKTtcbiAgICAgICAgICBjb25zdCBmaWx0ZXJJZCA9IGxvY2Fsc2VsZWN0ZWROb2Rlc0FycmF5LmZpbHRlcigoeCkgPT4geCk7XG4gICAgICAgICAgc2VsZi5zZWxlY3RlZE5vZGVzQXJyYXkubmV4dChmaWx0ZXJJZCk7XG4gICAgICAgICAgcmV0dXJuIGZpbHRlcklkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoW10pO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIGxldCBrZXl1cCA9ICgpID0+IHtcbiAgICAgIHRoaXMuc2hpZnRLZXkgPSBmYWxzZTtcbiAgICAgIHRoaXMuYnJ1c2hNb2RlID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5nQnJ1c2ggJiYgIXRoaXMuYnJ1c2hpbmcpIHtcbiAgICAgICAgLy8gb25seSByZW1vdmUgdGhlIGJydXNoIGlmIHdlJ3JlIG5vdCBhY3RpdmVseSBicnVzaGluZ1xuICAgICAgICAvLyBvdGhlcndpc2UgaXQnbGwgYmUgcmVtb3ZlZCB3aGVuIHRoZSBicnVzaGluZyBlbmRzXG4gICAgICAgIHRoaXMuZ0JydXNoLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmdCcnVzaCA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxldCBrZXlkb3duID0gKCkgPT4ge1xuICAgICAgLy8gQWxsb3dzIHVzIHRvIHR1cm4gb2ZmIGRlZmF1bHQgbGlzdGVuZXJzIGZvciBrZXlNb2RpZmllcnMoc2hpZnQpXG4gICAgICBicnVzaC5maWx0ZXIoKCkgPT4gZDMuZXZlbnQuc2hpZnRLZXkpO1xuICAgICAgYnJ1c2gua2V5TW9kaWZpZXJzKGZhbHNlKTtcbiAgICAgIC8vIGhvbGRpbmcgc2hpZnQga2V5XG4gICAgICBpZiAoZDMuZXZlbnQua2V5Q29kZSA9PT0gMTYpIHtcbiAgICAgICAgdGhpcy5zaGlmdEtleSA9IHRydWU7XG5cbiAgICAgICAgaWYgKCF0aGlzLmdCcnVzaCkge1xuICAgICAgICAgIHRoaXMuYnJ1c2hNb2RlID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmdCcnVzaCA9IGdCcnVzaEhvbGRlci5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdicnVzaCcpO1xuICAgICAgICAgIHRoaXMuZ0JydXNoLmNhbGwoYnJ1c2gpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGQzLnNlbGVjdCgnYm9keScpLm9uKCdrZXlkb3duJywga2V5ZG93bikub24oJ2tleXVwJywga2V5dXApO1xuICAgIC8vIEJydXNoIEVuZFxuXG4gICAgY29uc3QgZmlsdGVyZWRMaW5lID0gdGhpcy5saW5rcy5maWx0ZXIoXG4gICAgICAoeyBzb3VyY2UsIHRhcmdldCB9LCBpbmRleCwgbGlua3NBcnJheSkgPT4ge1xuICAgICAgICAvLyBGaWx0ZXIgb3V0IGFueSBvYmplY3RzIHRoYXQgaGF2ZSBtYXRjaGluZyBzb3VyY2UgYW5kIHRhcmdldCBwcm9wZXJ0eSB2YWx1ZXNcbiAgICAgICAgLy8gVG8gZGlzcGxheSBvbmx5IG9uZSBsaW5lIChwYXJlbnRMaW5lU3R5bGUpIC0gcmVtb3ZlcyBodG1sIGJsb2F0IGFuZCBhIGRhcmtlbmVkIGxpbmVcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICBpbmRleCA9PT1cbiAgICAgICAgICBsaW5rc0FycmF5LmZpbmRJbmRleChcbiAgICAgICAgICAgIChvYmopID0+IG9iai5zb3VyY2UgPT09IHNvdXJjZSAmJiBvYmoudGFyZ2V0ID09PSB0YXJnZXRcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcblxuICAgIGNvbnN0IGxpbmsgPSB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgpLmRhdGEoZmlsdGVyZWRMaW5lLCBmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgfSk7XG5cbiAgICB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgnbGluZScpLmRhdGEobGluaykuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgY29uc3QgbGlua0VudGVyID0gbGlua1xuICAgICAgLmpvaW4oJ2xpbmUnKVxuICAgICAgLnN0eWxlKCdzdHJva2UnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoZC5wYXJlbnRMaW5lU3R5bGUgPT09ICdTb2xpZCcpIHtcbiAgICAgICAgICByZXR1cm4gJyM3NzcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAnI2I0YjRiNCc7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ3N0cm9rZS1vcGFjaXR5JywgJy42JylcbiAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hhcnJheScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmIChkLnBhcmVudExpbmVTdHlsZSA9PT0gJ0RvdHRlZCcpIHtcbiAgICAgICAgICByZXR1cm4gJzgsNSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9KVxuICAgICAgLnN0eWxlKCdzdHJva2Utd2lkdGgnLCAnMnB4JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdsaW5rJylcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICdfbGluZSc7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGQuc291cmNlID8gZC5zb3VyY2UgOiAnJztcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gZC50YXJnZXQgPyBkLnRhcmdldCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7c291cmNlfV8ke3RhcmdldH0ke3N1ZmZpeH1gO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCdtYXJrZXItZW5kJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKGQucGFyZW50VGFyZ2V0QXJyb3cgPT09IHRydWUpIHtcbiAgICAgICAgICByZXR1cm4gJ3VybCgjYXJyb3doZWFkVGFyZ2V0KSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ21hcmtlci1zdGFydCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmIChkLnBhcmVudFNvdXJjZUFycm93ID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuICd1cmwoI2Fycm93aGVhZFNvdXJjZSknO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSk7XG5cbiAgICBsaW5rLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5sYWJlbDtcbiAgICB9KTtcblxuICAgIGNvbnN0IGVkZ2VwYXRocyA9IHpvb21Db250YWluZXIuc2VsZWN0QWxsKCkuZGF0YSh0aGlzLmxpbmtzLCBmdW5jdGlvbiAoZCkge1xuICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgfSk7XG5cbiAgICB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgncGF0aCcpLmRhdGEoZWRnZXBhdGhzKS5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICBjb25zdCBlZGdlcGF0aHNFbnRlciA9IGVkZ2VwYXRoc1xuICAgICAgLmpvaW4oJ3N2ZzpwYXRoJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdlZGdlcGF0aCcpXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMClcbiAgICAgIC5hdHRyKCdzdHJva2Utb3BhY2l0eScsIDApXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICByZXR1cm4gJ2VkZ2VwYXRoJyArIGk7XG4gICAgICB9KTtcblxuICAgIGNvbnN0IGVkZ2VsYWJlbHMgPSB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgpLmRhdGEodGhpcy5saW5rcywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmlkO1xuICAgIH0pO1xuXG4gICAgem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJ3RleHQnKS5kYXRhKGVkZ2VsYWJlbHMpLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgIGNvbnN0IGVkZ2VsYWJlbHNFbnRlciA9IGVkZ2VsYWJlbHNcbiAgICAgIC5lbnRlcigpXG4gICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdlZGdlbGFiZWwnKVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ190ZXh0JztcbiAgICAgICAgY29uc3Qgc291cmNlID0gZC5zb3VyY2UgPyBkLnNvdXJjZSA6ICcnO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBkLnRhcmdldCA/IGQudGFyZ2V0IDogJyc7XG4gICAgICAgIHJldHVybiBgJHtzb3VyY2V9XyR7dGFyZ2V0fSR7c3VmZml4fWA7XG4gICAgICB9KVxuICAgICAgLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsIDE0KVxuICAgICAgLmF0dHIoJ2R5JywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuZHk7XG4gICAgICB9KTtcblxuICAgIHN2Zy5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKS5vbignZGJsY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBkYmxDbGljayA9IGQzLnNlbGVjdCh0aGlzKS5kYXRhKCk7XG4gICAgICBzZWxmLmRibENsaWNrTGlua1BheWxvYWQubmV4dChkYmxDbGljayk7XG4gICAgfSk7XG5cbiAgICBlZGdlbGFiZWxzRW50ZXJcbiAgICAgIC5hcHBlbmQoJ3RleHRQYXRoJylcbiAgICAgIC5hdHRyKCd4bGluazpocmVmJywgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgcmV0dXJuICcjZWRnZXBhdGgnICsgaTtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgIC5hdHRyKCdkb21pbmFudC1iYXNlbGluZScsICdib3R0b20nKVxuICAgICAgLmF0dHIoJ3N0YXJ0T2Zmc2V0JywgJzUwJScpXG4gICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5sYWJlbDtcbiAgICAgIH0pO1xuXG4gICAgZWRnZWxhYmVsc0VudGVyXG4gICAgICAuc2VsZWN0QWxsKCd0ZXh0UGF0aCcpXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmxpbmtJY29uO1xuICAgICAgfSlcbiAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgIC5zdHlsZSgnZmlsbCcsICcjODU2NDA0JylcbiAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCAnNzAwJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdmYScpXG4gICAgICAudGV4dCgnIFxcdWYwYzEnKTtcbiAgICAvLyBvbiBub3JtYWwgbGFiZWwgbGluayBjbGljayAtIGhpZ2hsaWdodCBsYWJlbHNcbiAgICBzdmcuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIF9kMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgIG5vZGVFbnRlci5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgZC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgICAgbm9kZS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgIGlmIChzZWxlY3RBbGxOb2Rlcykge1xuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+JztcbiAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgIH1cbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgX2QzLnNlbGVjdCh0aGlzKS5zdHlsZSgnZmlsbCcsICdibHVlJykuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNzAwKTtcbiAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoW10pO1xuICAgIH0pO1xuXG4gICAgLy8gb24gcmlnaHQgbGFiZWwgbGluayBjbGljayAtIGhpZ2h0bGlnaHQgbGFiZWxzIGFuZCBwYWNrYWdlIGRhdGEgZm9yIGNvbnRleHQgbWVudVxuICAgIHN2Zy5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKS5vbignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgc2VsZi5zZWxlY3RlZE5vZGVzQXJyYXkubmV4dChbXSk7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKTtcbiAgICAgIF9kMy5zZWxlY3QodGhpcykuc3R5bGUoJ2ZpbGwnLCAnYmx1ZScpLnN0eWxlKCdmb250LXdlaWdodCcsIDcwMCk7XG4gICAgICBjb25zdCBsb2NhbFNlbGVjdGVkTGlua0FycmF5ID0gZDMuc2VsZWN0KHRoaXMpLmRhdGEoKTtcbiAgICAgIHNlbGYuc2VsZWN0ZWRMaW5rQXJyYXkubmV4dChsb2NhbFNlbGVjdGVkTGlua0FycmF5KTtcbiAgICB9KTtcblxuICAgIGNvbnN0IG5vZGUgPSB6b29tQ29udGFpbmVyLnNlbGVjdEFsbCgpLmRhdGEodGhpcy5ub2RlcywgZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLmlkO1xuICAgIH0pO1xuXG4gICAgem9vbUNvbnRhaW5lci5zZWxlY3RBbGwoJ2cnKS5kYXRhKG5vZGUpLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgIGNvbnN0IG5vZGVFbnRlciA9IG5vZGVcbiAgICAgIC5qb2luKCdnJylcbiAgICAgIC5jYWxsKFxuICAgICAgICBfZDNcbiAgICAgICAgICAuZHJhZygpXG4gICAgICAgICAgLm9uKCdzdGFydCcsIGZ1bmN0aW9uIGRyYWdzdGFydGVkKGQpIHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSB0aGUgc2F2ZSAmIHJlc2V0IGJ0blxuICAgICAgICAgICAgaWYgKHJlc2V0QnRuKSB7XG4gICAgICAgICAgICAgIGRvY3VtZW50XG4gICAgICAgICAgICAgICAgLmdldEVsZW1lbnRCeUlkKCdyZXNldF9ncmFwaCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmVfZ3JhcGgnKS5yZW1vdmVBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV9kMy5ldmVudC5hY3RpdmUpIHNpbXVsYXRpb24uYWxwaGFUYXJnZXQoMC45KS5yZXN0YXJ0KCk7XG5cbiAgICAgICAgICAgIGlmICghZC5zZWxlY3RlZCAmJiAhdGhpcy5zaGlmdEtleSkge1xuICAgICAgICAgICAgICAvLyBpZiB0aGlzIG5vZGUgaXNuJ3Qgc2VsZWN0ZWQsIHRoZW4gd2UgaGF2ZSB0byB1bnNlbGVjdCBldmVyeSBvdGhlciBub2RlXG4gICAgICAgICAgICAgIG5vZGVFbnRlci5jbGFzc2VkKCdzZWxlY3RlZCcsIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChwLnNlbGVjdGVkID0gcC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBmYWxzZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAvLyByZW1vdmUgdGhlIHNlbGVjdGVkIHN0eWxpbmcgb24gb3RoZXIgbm9kZXMgYW5kIGxhYmVscyB3aGVuIHdlIGRyYWcgYSBub24tc2VsZWN0ZWQgbm9kZVxuICAgICAgICAgICAgICBfZDNcbiAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICAgICAgICAgIF9kM1xuICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMClcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ3NlbGVjdGVkJywgZnVuY3Rpb24gKHApIHtcbiAgICAgICAgICAgICAgZC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBkLnNlbGVjdGVkO1xuICAgICAgICAgICAgICByZXR1cm4gKGQuc2VsZWN0ZWQgPSB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBub2RlRW50ZXJcbiAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLnNlbGVjdGVkO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGQuZnggPSBkLng7XG4gICAgICAgICAgICAgICAgZC5meSA9IGQueTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAub24oJ2RyYWcnLCBmdW5jdGlvbiBkcmFnZ2VkKGQpIHtcbiAgICAgICAgICAgIG5vZGVFbnRlclxuICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgZC5meCArPSBfZDMuZXZlbnQuZHg7XG4gICAgICAgICAgICAgICAgZC5meSArPSBfZDMuZXZlbnQuZHk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbiBkcmFnZW5kZWQoZCkge1xuICAgICAgICAgICAgaWYgKCFfZDMuZXZlbnQuYWN0aXZlKSB7XG4gICAgICAgICAgICAgIHNpbXVsYXRpb24uYWxwaGFUYXJnZXQoMC4zKS5yZXN0YXJ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkLmZ4ID0gZC54O1xuICAgICAgICAgICAgZC5meSA9IGQueTtcbiAgICAgICAgICAgIC8vIFN1YnNjcmliZXMgdG8gdXBkYXRlZCBncmFwaCBwb3NpdGlvbnMgZm9yIHNhdmVcbiAgICAgICAgICAgIHNlbGYuc2F2ZUdyYXBoRGF0YS5uZXh0KGRhdGEpO1xuICAgICAgICAgIH0pXG4gICAgICApXG4gICAgICAuYXR0cignY2xhc3MnLCAnbm9kZS13cmFwcGVyJylcbiAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmlkO1xuICAgICAgfSk7XG5cbiAgICAvLyBubyBjb2xsaXNpb24gLSBhbHJlYWR5IHVzaW5nIHRoaXMgaW4gc3RhdGVtZW50XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBzdmcuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykub24oJ2RibGNsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgZGJsQ2xpY2sgPSBkMy5zZWxlY3QodGhpcykuZGF0YSgpO1xuICAgICAgc2VsZi5kYmxDbGlja05vZGVQYXlsb2FkLm5leHQoZGJsQ2xpY2spO1xuICAgIH0pO1xuXG4gICAgLy8gbm9kZSBjbGljayBhbmQgY3RybCArIGNsaWNrXG4gICAgc3ZnLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAvLyBzbyB3ZSBkb24ndCBhY3RpdmF0ZSB0aGUgY2FudmFzIC5jbGljayBldmVudFxuICAgICAgX2QzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAvLyBzZXR0aW5nIHRoZSBzZWxlY3QgYXR0cmlidXRlIHRvIHRoZSBvYmplY3Qgb24gc2luZ2xlIHNlbGVjdCBzbyB3ZSBjYW4gZHJhZyB0aGVtXG4gICAgICBkLnNlbGVjdGVkID0gdHJ1ZTtcblxuICAgICAgaWYgKHNlbGVjdEFsbE5vZGVzKSB7XG4gICAgICAgIHNlbGVjdEFsbE5vZGVzLmlubmVySFRNTCA9ICc8aSBjbGFzcz1cImJpIGJpLWdyaWQtZmlsbFwiPjwvaT4nO1xuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgfVxuICAgICAgLy8gSWYgY3RybCBrZXkgaXMgaGVsZCBvbiBjbGlja1xuICAgICAgaWYgKF9kMy5ldmVudC5jdHJsS2V5KSB7XG4gICAgICAgIC8vIHRvZ2dsZSB0aGUgY2xhc3Mgb24gYW5kIG9mZiB3aGVuIGN0cmwgY2xpY2sgaXMgYWN0aXZlXG4gICAgICAgIGNvbnN0IGNsaWNrZWROb2RlID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gY2xpY2tlZE5vZGUuY2xhc3NlZCgnc2VsZWN0ZWQnKTtcbiAgICAgICAgY2xpY2tlZE5vZGUuY2xhc3NlZCgnc2VsZWN0ZWQnLCAhaXNTZWxlY3RlZCk7XG4gICAgICAgIGQuc2VsZWN0ZWQgPSAhaXNTZWxlY3RlZDtcbiAgICAgICAgZC5wcmV2aW91c2x5U2VsZWN0ZWQgPSAhaXNTZWxlY3RlZDtcblxuICAgICAgICBjb25zdCB0b3RhbFNpemUgPSBub2RlRW50ZXIuc2l6ZSgpO1xuICAgICAgICBjb25zdCBub25TZWxlY3RlZE5vZGVzID0gZDMuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyOm5vdCguc2VsZWN0ZWQpJyk7XG4gICAgICAgIGNvbnN0IGNvdW50ID0gbm9uU2VsZWN0ZWROb2Rlcy5zaXplKCk7XG4gICAgICAgIGNvbnN0IG5vdFNlbGVjdGVkU2l6ZSA9IHRvdGFsU2l6ZSAtIGNvdW50O1xuXG4gICAgICAgIGlmIChub3RTZWxlY3RlZFNpemUgPT09IHRvdGFsU2l6ZSkge1xuICAgICAgICAgIGlmIChzZWxlY3RBbGxOb2Rlcykge1xuICAgICAgICAgICAgc2VsZWN0QWxsTm9kZXMuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiYmkgYmktZ3JpZFwiPjwvaT4nO1xuICAgICAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcwLjY1JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBzaW5nbGUgY2xpY2sgc3R5bGluZyBvbiBvdGhlciBub2RlcyBhbmQgbGFiZWxzXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5lZGdlbGFiZWwnKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKTtcbiAgICAgICAgX2QzXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNDAwKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5Jyk7XG4gICAgICAgIHN2Z1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5zZWxlY3RlZCcpXG4gICAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDcwMCk7XG4gICAgICAgIC8vIGNvdW50cyBudW1iZXIgb2Ygc2VsZWN0ZWQgY2xhc3NlcyB0byBub3QgZXhjZWVkIDJcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRTaXplID0gc3ZnLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuc2l6ZSgpO1xuXG4gICAgICAgIGlmIChzZWxlY3RlZFNpemUgPD0gMikge1xuICAgICAgICAgIC8vIEFzIHdlIGFsbG93IGZvciBzaW5nbGUgY2xpY2sgd2l0aG91dCBhIGN0cmwrY2xpY2sgdG8gc2VsZWN0IHR3byBub2Rlcywgd2UgaGF2ZSB0byBhcHBseSBkLnNlbGVjdGVkIHRvIGl0XG4gICAgICAgICAgX2QzXG4gICAgICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAgICAgLmF0dHIoJ3NlbGVjdGVkJywgdHJ1ZSlcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICAgICAgZC5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIGdldCBkYXRhIGZyb20gbm9kZVxuICAgICAgICAgIGNvbnN0IGxvY2Fsc2VsZWN0ZWROb2Rlc0FycmF5ID0gX2QzLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuZGF0YSgpO1xuICAgICAgICAgIGNvbnN0IGZpbHRlcklkID0gbG9jYWxzZWxlY3RlZE5vZGVzQXJyYXkuZmlsdGVyKCh4KSA9PiB4KTtcbiAgICAgICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KGZpbHRlcklkKTtcbiAgICAgICAgICByZXR1cm4gZmlsdGVySWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdmcuc2VsZWN0QWxsKCcubm9kZS13cmFwcGVyJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgIGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICBub2RlRW50ZXIuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgIGQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBkLnByZXZpb3VzbHlTZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIHN0eWxlIGZyb20gc2VsZWN0ZWQgbm9kZSBiZWZvcmUgdGhlIGNsYXNzIGlzIHJlbW92ZWRcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgLy8gUmVtb3ZlIHN0eWxlcyBmcm9tIGFsbCBvdGhlciBub2RlcyBhbmQgbGFiZWxzIG9uIHNpbmdsZSBsZWZ0IGNsaWNrXG4gICAgICBfZDMuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJykuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpO1xuICAgICAgX2QzXG4gICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICAvLyBBZGQgc3R5bGUgb24gc2luZ2xlIGxlZnQgY2xpY2tcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0KHRoaXMpXG4gICAgICAgIC5zZWxlY3QoJy5ub2RlVGV4dCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICdibHVlJylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDcwMCk7XG4gICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KFtdKTtcblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSk7XG5cbiAgICAvLyBSaWdodCBjbGljayBvbiBhIG5vZGUgaGlnaGxpZ2h0cyBmb3IgY29udGV4dCBtZW51XG4gICAgc3ZnLnNlbGVjdEFsbCgnLm5vZGUtd3JhcHBlcicpLm9uKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAvLyBjb3VudHMgbnVtYmVyIG9mIHNlbGVjdGVkIGNsYXNzZXMgdG8gbm90IGV4Y2VlZCAyXG4gICAgICBjb25zdCBzZWxlY3RlZFNpemUgPSBzdmdcbiAgICAgICAgLnNlbGVjdEFsbCgnLnNlbGVjdGVkJylcbiAgICAgICAgLnNlbGVjdEFsbCgnLm5vZGVUZXh0JylcbiAgICAgICAgLnNpemUoKTtcblxuICAgICAgaWYgKHNlbGVjdGVkU2l6ZSAhPT0gMikge1xuICAgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIHJlbW92ZSBzdHlsZSBpZiB0aGV5IGFyZSBvYnRhaW5pbmcgdGhlIGNvbnRleHQgbWVudSBmb3IganVzdCB0d28gbm9kZXMgKGNyZWF0ZSBsaW5rIG9wdGlvbilcbiAgICAgICAgc3ZnLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgIHNlbGYuc2VsZWN0ZWROb2Rlc0FycmF5Lm5leHQoW10pO1xuICAgICAgICBfZDNcbiAgICAgICAgICAuc2VsZWN0QWxsKCcuZWRnZWxhYmVsJylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3RBbGwoJy5ub2RlVGV4dCcpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyMyMTI1MjknKVxuICAgICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgICAvLyBBZGQgc3R5bGUgb24gc2luZ2xlIHJpZ2h0IGNsaWNrXG4gICAgICAgIF9kM1xuICAgICAgICAgIC5zZWxlY3QodGhpcylcbiAgICAgICAgICAuc2VsZWN0KCcubm9kZVRleHQnKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICdibHVlJylcbiAgICAgICAgICAuc3R5bGUoJ2ZvbnQtd2VpZ2h0JywgNzAwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vY2xpY2sgb24gY2FudmFzIHRvIHJlbW92ZSBzZWxlY3RlZCBub2Rlc1xuICAgIF9kMy5zZWxlY3QoJ3N2ZycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgIG5vZGVFbnRlci5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgZC5wcmV2aW91c2x5U2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgICAgbm9kZS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgIF9kM1xuICAgICAgICAuc2VsZWN0QWxsKCcuc2VsZWN0ZWQnKVxuICAgICAgICAuc2VsZWN0QWxsKCcubm9kZVRleHQnKVxuICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAgIC5zdHlsZSgnZm9udC13ZWlnaHQnLCA0MDApO1xuICAgICAgX2QzLnNlbGVjdEFsbCgnLnNlbGVjdGVkJykuY2xhc3NlZCgnc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICBfZDNcbiAgICAgICAgLnNlbGVjdEFsbCgnLmVkZ2VsYWJlbCcpXG4gICAgICAgIC5zdHlsZSgnZmlsbCcsICcjMjEyNTI5JylcbiAgICAgICAgLnN0eWxlKCdmb250LXdlaWdodCcsIDQwMCk7XG4gICAgICBzZWxmLnNlbGVjdGVkTm9kZXNBcnJheS5uZXh0KFtdKTtcbiAgICAgIGlmIChzZWxlY3RBbGxOb2Rlcykge1xuICAgICAgICBzZWxlY3RBbGxOb2Rlcy5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJiaSBiaS1ncmlkLWZpbGxcIj48L2k+JztcbiAgICAgICAgc2VsZWN0QWxsTm9kZXMuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIG5vZGVFbnRlclxuICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgIGlmICghZC5pbWFnZVVybCB8fCBkLmltYWdlVXJsID09PSAnJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pXG4gICAgICAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAuYXR0cigneGxpbms6aHJlZicsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmltYWdlVXJsO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd4JywgLTE1KVxuICAgICAgLmF0dHIoJ3knLCAtNjApXG4gICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnaW1hZ2UnO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1gO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDMyKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDMyKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ltYWdlJylcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKTtcblxuICAgICAgbm9kZUVudGVyXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmICghZC5pY29uIHx8IGQuaWNvbiA9PT0gJycpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLmljb247XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3gnLCAtMTgpXG4gICAgICAuYXR0cigneScsIC0zMClcbiAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9ICdpY29uJztcbiAgICAgICAgY29uc3QgaWQgPSBkLmlkID8gZC5pZCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7aWR9XyR7c3VmZml4fSBmYWA7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ2lkJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3QgaWQgPSBkLmlkID8gZC5pZCA6ICcnO1xuICAgICAgICByZXR1cm4gYCR7aWR9YDtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsICczNXB4JylcbiAgICAgIC5zdHlsZSgnY3Vyc29yJywgJ3BvaW50ZXInKTtcbiAgICBcblxuICAgIGNvbnN0IG5vZGVUZXh0ID0gbm9kZUVudGVyXG4gICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC5hdHRyKCdpZCcsICdub2RlVGV4dCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnbm9kZVRleHQnKVxuICAgICAgLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAuYXR0cignZHknLCAtMylcbiAgICAgIC5hdHRyKCd5JywgLTI1KVxuICAgICAgLmF0dHIoJ3Rlc3Rob29rJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gJ3RleHQnO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9YDtcbiAgICAgIH0pO1xuXG4gICAgbm9kZVRleHRcbiAgICAgIC5zZWxlY3RBbGwoJ3RzcGFuLnRleHQnKVxuICAgICAgLmRhdGEoKGQpID0+IGQubGFiZWwpXG4gICAgICAuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVUZXh0VHNwYW4nKVxuICAgICAgLnRleHQoKGQpID0+IGQpXG4gICAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsICcxNHB4JylcbiAgICAgIC5hdHRyKCd4JywgLTEwKVxuICAgICAgLmF0dHIoJ2R4JywgMTApXG4gICAgICAuYXR0cignZHknLCAxNSk7XG5cbiAgICBub2RlRW50ZXJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKCFkLmFkZGl0aW9uYWxJY29uKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICBjb25zdCBzdWZmaXggPSAnYWRkaXRpb25hbEljb24nO1xuICAgICAgICBjb25zdCBpZCA9IGQuaWQgPyBkLmlkIDogJyc7XG4gICAgICAgIHJldHVybiBgJHtpZH1fJHtzdWZmaXh9YDtcbiAgICAgIH0pXG4gICAgICAuYXR0cignd2lkdGgnLCAxMDApXG4gICAgICAuYXR0cignaGVpZ2h0JywgMjUpXG4gICAgICAuYXR0cigneCcsIDMwKVxuICAgICAgLmF0dHIoJ3knLCAtNTApXG4gICAgICAuYXR0cignY2xhc3MnLCAnZmEnKVxuICAgICAgLnN0eWxlKCdmaWxsJywgJyM4NTY0MDQnKVxuICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuYWRkaXRpb25hbEljb247XG4gICAgICB9KTtcblxuICAgIC8vIHRyYW5zaXRpb24gZWZmZWN0cyBmb3IgbmV3IHB1bHNhdGluZyBub2Rlc1xuICAgIG5vZGVFbnRlclxuICAgICAgLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAoIWQubmV3SXRlbSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5zZWxlY3QoJ3RleHQnKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICdibHVlJylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAxKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignZmlsbCcsICdibHVlJylcbiAgICAgIC5hdHRyKCdmb250LXdlaWdodCcsIDcwMClcbiAgICAgIC5hdHRyKCdmaWxsLW9wYWNpdHknLCAwLjEpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDEpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCdmaWxsJywgJ2JsdWUnKVxuICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgNzAwKVxuICAgICAgLmF0dHIoJ2ZpbGwtb3BhY2l0eScsIDAuMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmx1ZScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA3MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnIzIxMjUyOScpXG4gICAgICAuYXR0cignZm9udC13ZWlnaHQnLCA0MDApXG4gICAgICAuYXR0cignZmlsbC1vcGFjaXR5JywgMSlcbiAgICAgIC5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KHRoaXMpLmNhbGwoX2QzLnRyYW5zaXRpb24pO1xuICAgICAgfSk7XG5cbiAgICBub2RlRW50ZXJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgaWYgKCFkLm5ld0l0ZW0pIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAuc2VsZWN0KCdpbWFnZScpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDQ1KVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDQ1KVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCAzMilcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAzMilcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgNDUpXG4gICAgICAuYXR0cignaGVpZ2h0JywgNDUpXG4gICAgICAudHJhbnNpdGlvbigpXG4gICAgICAuZHVyYXRpb24oMTAwMClcbiAgICAgIC5hdHRyKCd3aWR0aCcsIDMyKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIDMyKVxuICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAuYXR0cignd2lkdGgnLCA0NSlcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCA0NSlcbiAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgMzIpXG4gICAgICAuYXR0cignaGVpZ2h0JywgMzIpXG4gICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGQzLnNlbGVjdCh0aGlzKS5jYWxsKGQzLnRyYW5zaXRpb24pO1xuICAgICAgfSk7XG5cbiAgICAvLyBSZW1vdmUgdGhlIG5ld0NsYXNzIHNvIHRoZXkgZG9uJ3QgYW5pbWF0ZSBuZXh0IHRpbWVcbiAgICB0aGlzLm5vZGVzID0gdGhpcy5yZW1vdmVOZXdJdGVtKHRoaXMubm9kZXMpO1xuXG4gICAgbm9kZUVudGVyLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICByZXR1cm4gZC5sYWJlbDtcbiAgICB9KTtcblxuICAgIGNvbnN0IG1heFRpY2tzID0gMzA7XG4gICAgbGV0IHRpY2tDb3VudCA9IDA7XG4gICAgbGV0IHpvb21Ub0ZpdENhbGxlZCA9IGZhbHNlO1xuXG4gICAgc2ltdWxhdGlvbi5ub2Rlcyh0aGlzLm5vZGVzKS5vbigndGljaycsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnpvb21Ub0ZpdCAmJiB0aWNrQ291bnQgPj0gbWF4VGlja3MgJiYgIXpvb21Ub0ZpdENhbGxlZCkge1xuICAgICAgICBzaW11bGF0aW9uLnN0b3AoKTtcbiAgICAgICAgaGFuZGxlWm9vbVRvRml0KCk7XG4gICAgICAgIHpvb21Ub0ZpdENhbGxlZCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRpY2tlZChsaW5rRW50ZXIsIG5vZGVFbnRlciwgZWRnZXBhdGhzRW50ZXIpO1xuICAgICAgICB0aWNrQ291bnQrKztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHNpbXVsYXRpb24uZm9yY2UoJ2xpbmsnKS5saW5rcyh0aGlzLmxpbmtzKTtcbiAgICBzZWxmLnNhdmVHcmFwaERhdGEubmV4dChkYXRhKTtcbiAgfVxuXG4gIHB1YmxpYyByZXNldEdyYXBoKGluaXRpYWxEYXRhLCBlbGVtZW50LCB6b29tLCB6b29tVG9GaXQpIHtcbiAgICAvLyBUbyByZXNldCB0aGUgc2VhcmNoIHdoZW4gd2UgcmVzZXQgdGhlIGRhdGFcbiAgICB0aGlzLnJlc2V0U2VhcmNoID0gdHJ1ZTtcbiAgICAvLyBSZXNldCB0aGUgZGF0YSB0byBpdHMgaW5pdGlhbCBzdGF0ZVxuICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgICB0aGlzLmxpbmtzID0gW107XG4gICAgLy8gQ2FsbCB0aGUgdXBkYXRlIG1ldGhvZCBhZ2FpbiB0byByZS1zaW11bGF0ZSB0aGUgZ3JhcGggd2l0aCB0aGUgbmV3IGRhdGFcbiAgICB0aGlzLnVwZGF0ZShpbml0aWFsRGF0YSwgZWxlbWVudCwgem9vbSwgem9vbVRvRml0KTtcbiAgfVxufVxuIl19