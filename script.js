const RTT = 2000; // Tempo di Andata/Ritorno (il viaggio di andata sarà RTT/2, ovvero 1000ms)
const INTER_SEND_DELAY = 600; //

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

  async broadcast(message) {
    if (this.isCrashed) return;
    console.log(`[P${this.id}] Inizio broadcast: "${message}"`);
    
    for (let peer of this.connections) {
      // Se il processo crasha DURANTE il loop, interrompe l'invio ai restanti nodi
      if (this.isCrashed) {
        console.log(`[P${this.id}] Crashato durante il broadcast! Messaggio interrotto.`);
        break; 
      }

      // Evitiamo di inviare graficamente un messaggio a se stessi per chiarezza visiva
      animateMessage(this.id, peer.id);
        
      // Simula la ricezione lato logico con un timeout di RTT/2
      peer.receive(message, this.id);
      
      // Attesa asincrona prima di inviare al nodo successivo
      await new Promise(res => setTimeout(res, INTER_SEND_DELAY));
    }
  }
  receive(message, senderId) {
    setTimeout(() => {
      // Se il destinatario è crashato nel frattempo, ignora il messaggio
      if (this.isCrashed) return; 
      console.log(`[P${this.id}] Ricevuto "${message}" da P${senderId}`);
    }, RTT / 2); // Ci mette RTT/2 ad arrivare
  }
  crash() {
    if (this.isCrashed) return;
    this.isCrashed = true;
    console.log(`[P${this.id}] HAS CRASHED!`);
    
    // Aggiorniamo il dato di D3 in modo che il tick disegni la croce rossa
    const d3Node = nodesData.find(n => n.id === this.id);
    if (d3Node) d3Node.isCrashed = true;
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
const nodeRadius = 20;

// Format your data for D3
const nodesData = processes.map(p => ({ id: p.id })); //capire cosa fa
const linksData = [];
const seenLinks = new Set();


processes.forEach(p => {
  p.connections.forEach(peer => {
    const isSelfLoop = p.id === peer.id;
    const linkKey = isSelfLoop ? `self-${p.id}` : [p.id, peer.id].sort().join("-");
    
    if (!seenLinks.has(linkKey)) {
      seenLinks.add(linkKey);
      linksData.push({ source: p.id, target: peer.id, isSelf: isSelfLoop });
    }
  });
});

// Create SVG canvas
const svg = d3.select("#graph-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Livelli per mantenere l'ordine visivo (linee dietro, poi messaggi, poi nodi, poi croci)
const linkLayer = svg.append("g");
const messageLayer = svg.append("g");
const nodeLayer = svg.append("g");
const textLayer = svg.append("g");
const crashLayer = svg.append("g");

// Set up the physics simulation
const simulation = d3.forceSimulation(nodesData)
  .force("link", d3.forceLink(linksData).id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(width / 2, height / 2));

// Draw lines for connections
const link = linkLayer
  .selectAll("path")
  .data(linksData)
  .enter().append("path")
  .attr("stroke", "#999")
  .attr("fill", "none")
  .attr("stroke-width", 2)
  .attr("stroke-dasharray", "4,4");;

// Draw circles for processes
const node = nodeLayer
  .selectAll("circle")
  .data(nodesData)
  .enter().append("circle")
  .attr("r", nodeRadius)
  .attr("fill", "steelblue");

// Add text labels to the nodes
const text = textLayer
  .selectAll("text")
  .data(nodesData)
  .enter().append("text")
  .text(d => `P${d.id}`)
  .attr("font-size", 12)
  .attr("fill", "white")
  .attr("text-anchor", "middle")
  .attr("dy", 4);


function animateMessage(sourceId, targetId) {
  const sourceNode = nodesData.find(n => n.id === sourceId);
  const targetNode = nodesData.find(n => n.id === targetId);

  // Creiamo una piccola pallina arancione sul nodo mittente
  const msgObj = messageLayer.append("circle")
    .attr("r", 6)
    .attr("fill", "orange")
    .attr("cx", sourceNode.x)
    .attr("cy", sourceNode.y);

  // La muoviamo verso il nodo destinatario per RTT/2 millisecondi
  msgObj.transition()
    .duration(RTT / 2)
    .ease(d3.easeLinear)
    .attr("cx", targetNode.x)
    .attr("cy", targetNode.y)
    .on("end", function() {
        d3.select(this).remove(); // Rimuoviamo la pallina quando arriva
    });
}

// Update positions on every tick of the physics engine
simulation.on("tick", () => {
  link.attr("d", d => {
    if (d.source.id === d.target.id) {
      // Self-loop math: Draw a cubic Bezier curve exiting top-left and entering top-right of the node
      const x = d.source.x;
      const y = d.source.y;
      
      const loopRadius = 35;
      const x1 = x - loopRadius;
      const y1 = y - loopRadius;
      const x2 = x + loopRadius;
      const y2 = y - loopRadius;

      return `M ${x - 10} ${y - nodeRadius + 5} C ${x1} ${y1}, ${x2} ${y2}, ${x + 10} ${y - nodeRadius + 5}`;    
    } else{ // Standard straight connection path
      return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`;
    }
  });

  node
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);
    
  text
    .attr("x", d => d.x)
    .attr("y", d => d.y);
});