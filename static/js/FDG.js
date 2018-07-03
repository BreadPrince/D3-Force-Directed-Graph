class FDG {
    constructor (d3, selector) {
        this.d3 = d3
        this.svg = this.d3.select(selector)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
        this.width = parseInt(this.svg.style('width'))
        this.height = parseInt(this.svg.style('height'))
        this.links = null
        this.weight_list = []
        this.nodes = []
        this.color = this.d3.scaleOrdinal(d3.schemePaired);
        this.simulation = null
    }

    init (url) {
        this.d3.json(url).then((res) => {
            console.log(res)
            this.weight_list = res.relationship_weight
            this.links = res.data
            this.formatData()
            this.start()
        }, (err) => {
            if (err)
                console.log(err)
        })
    }

    formatData () {
        let nodes = new Set()
        for (let link of this.links) {
            nodes.add(link.source)
            nodes.add(link.target)
        }
        let count = 1
        for (let node of nodes) {
            this.nodes.push({
                name: node,
                group: count
            })
            count++
        }
        console.log(this.nodes)
    }

    start() {
        this.simulation = this.d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink().id((d) => {return d.name}).distance([100]))
            .force("charge", d3.forceManyBody().strength([-50]))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
        
        let link = this.svg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.links)
            .enter()
            .append('line')
            .attr('stroke-width', (d) => {
                for (let v of this.weight_list) {
                    if (v.id == d.value) {
                        return v.weight
                    }
                }
            })

        let linkDesc = this.svg.append('g')
            .attr('class', 'link-desc')
            .selectAll('text')
            .data(this.links)
            .enter()
            .append('text')
            .text((d) => {
                return d.relationship
            })

        let node = this.svg.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(this.nodes)
            .enter()
            .append('g')
            .on('mouseover', (d) => {
                linkDesc.style('fill-opacity', (line) => {
                    if (line.source === d || line.target === d) {
                        return 1
                    }
                })
                link.style('stroke', (line) => {
                    if (line.source === d || line.target === d) {
                        return '#000'
                    }
                })
            })
            .on('mouseout', (d) => {
                linkDesc.style('fill-opacity', (line) => {
                    if (line.source === d || line.target === d) {
                        return 0
                    }
                })
                link.style('stroke', (line) => {
                    if (line.source === d || line.target === d) {
                        return '#999'
                    }
                })
            })
            .call(d3.drag()
                .on("start", (d) => {
                    this.dragstarted(d)
                })
                .on("drag", (d) => {
                    this.dragged(d)
                })
                .on("end", (d) => {
                    this.dragended(d)
                }));

        node.append('circle')
            .attr('r', 10)
            .attr('fill', (d) => {
                return this.color(d.group)
            })

        node.append('text')
            .attr('fill', (d) => {
                    return this.color(d.group);
                })
            .attr("y", -22)
            .attr("dy", 10)
            .text((d) => { return d.name })

        this.simulation.nodes(this.nodes)
            .on('tick', () => {
                this.ticked(link, linkDesc, node)
            })

        this.simulation.force('link')
            .links(this.links)
    }

    ticked (link, linkDesc, node) {
        link
            .attr("x1", (d) => {
                return d.source.x;
            })
            .attr("y1", (d) => {
                return d.source.y;
            })
            .attr("x2", (d) => {
                return d.target.x;
            })
            .attr("y2", (d) => {
                return d.target.y;
            });

        linkDesc
            .attr("x", (d) => {
                return (d.source.x + d.target.x) / 2;
            })
            .attr("y", (d) => {
                return (d.source.y + d.target.y) / 2;
            });

        node
            .attr("transform", (d) => {
                return "translate(" + d.x + "," + d.y + ")";
            })
    }

    dragstarted (d) {
        if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged (d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    dragended (d) {
        if (!d3.event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}