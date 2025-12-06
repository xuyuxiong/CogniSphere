import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Note } from '../types';

interface KnowledgeGraphProps {
  notes: Note[];
  onNodeClick: (noteId: string) => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ notes, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || notes.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Prepare Data
    // Nodes: Notes
    // Links: Shared tags or manual links
    const nodes = notes.map(n => ({ id: n.id, title: n.title, group: n.type }));
    const links: any[] = [];

    // Create links based on shared tags (Simple logic: if 2 notes share a tag, link them)
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const intersection = notes[i].tags.filter(t => notes[j].tags.includes(t));
        if (intersection.length > 0) {
          links.push({ source: notes[i].id, target: notes[j].id, value: intersection.length });
        }
      }
    }

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(30));

    const svg = d3.select(svgRef.current)
        .attr("viewBox", [0, 0, width, height]);

    // Zoom behavior
    const g = svg.append("g");
    svg.call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      g.attr("transform", event.transform);
    }));

    const link = g.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => d.group === 'CODE' ? '#f43f5e' : '#0ea5e9')
      .attr("cursor", "pointer")
      .on("click", (event, d: any) => {
        onNodeClick(d.id);
        event.stopPropagation();
      })
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("title")
      .text((d: any) => d.title);

    const labels = g.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text((d: any) => d.title)
      .attr("fill", "currentColor")
      .attr("font-size", "10px")
      .attr("class", "dark:fill-slate-200 fill-slate-700 pointer-events-none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
        
      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [notes]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};