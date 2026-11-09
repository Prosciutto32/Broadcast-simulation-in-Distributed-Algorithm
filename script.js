class Process {
  constructor(id) {
    this.id = id;
    this.connections = [];
  }

  connect(otherProcess) {
    if (!this.connections.includes(otherProcess)) {
      this.connections.push(otherProcess);
    }
  }
}

// 1. Initialize processes
const p1 = new Process(1);
const p2 = new Process(2);
const p3 = new Process(3);
const p4 = new Process(4);
const processes = [p1, p2, p3, p4];

// 2. Connect everyone with everyone
processes.forEach(p => {
  processes.forEach(proccess =>{
      p.connect(proccess)
    }
  );
});


// ---------------------------------------------------
// D3.js VISUALIZATION LOGIC
// ---------------------------------------------------

const width = 600;
const height = 400;

// Format your data for D3
const nodesData = processes.map(p => ({ id: p.id })); //capire cosa fa
const linksData = [];
processes.forEach(p => {
  p.connections.forEach(peer => {
    linksData.push({ source: p.id, target: peer.id });
  });
});

// Create SVG canvas
const svg = d3.select("#graph-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Set up the physics simulation
const simulation = d3.forceSimulation(nodesData)
  .force("link", d3.forceLink(linksData).id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(width / 2, height / 2));

// Draw lines for connections
const link = svg.append("g")
  .selectAll("line")
  .data(linksData)
  .enter().append("line")
  .attr("stroke", "#999")
  .attr("stroke-width", 2)
  .attr("stroke-dasharray", "4,4");;

// Draw circles for processes
const node = svg.append("g")
  .selectAll("circle")
  .data(nodesData)
  .enter().append("circle")
  .attr("r", 20)
  .attr("fill", "steelblue");

// Add text labels to the nodes
const text = svg.append("g")
  .selectAll("text")
  .data(nodesData)
  .enter().append("text")
  .text(d => `P${d.id}`)
  .attr("font-size", 12)
  .attr("fill", "white")
  .attr("text-anchor", "middle")
  .attr("dy", 4);

// Update positions on every tick of the physics engine
simulation.on("tick", () => {
  link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  node
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);
    
  text
    .attr("x", d => d.x)
    .attr("y", d => d.y);
});