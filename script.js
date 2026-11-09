const RTT = 2000;
const INTER_SEND_DELAY = 600;

class Process {
  constructor(id) {
    this.id = id;
    this.connections = [];
    this.isCrashed = false;
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
      if (this.isCrashed) {
        console.log(`[P${this.id}] Crashato durante il broadcast! Messaggio interrotto.`);
        break; 
      }

      animateMessage(this.id, peer.id);
      peer.receive(message, this.id);
      await new Promise(res => setTimeout(res, INTER_SEND_DELAY));
    }
  }

  receive(message, senderId) {
    setTimeout(() => {
      if (this.isCrashed) return; 
      console.log(`[P${this.id}] Ricevuto "${message}" da P${senderId}`);
    }, RTT / 2);
  }

  crash() {
    if (this.isCrashed) return;
    this.isCrashed = true;
    nodesData.find(n => n.id === this.id).isCrashed = true;
    updateGraphState();
  }
}

const p1 = new Process(1);
const p2 = new Process(2);
const p3 = new Process(3);
const p4 = new Process(4);
const processes = [p1, p2, p3, p4];

processes.forEach(p => {
  processes.forEach(proccess =>{
      p.connect(proccess);
  });
});

const width = 600;
const height = 400;
const nodeRadius = 20;

const nodesData = processes.map(p => ({ id: p.id, isCrashed: false }));
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

function updateGraphState() {
  // 1. Aggiorna immediatamente il colore dei nodi (rosso se crashati)
  node.attr("fill", d => d.isCrashed ? "red" : "steelblue");

  // 2. Lega i dati delle croci ai processi crashati
  const crosses = crashLayer.selectAll("path.crash-mark")
    .data(nodesData.filter(d => d.isCrashed), d => d.id);
    
  // 3. Crea la X bianca SOLO per i nodi appena crashati
  crosses.enter()
    .append("path")
    .attr("class", "crash-mark")
    .attr("stroke", "white")
    .attr("stroke-width", 4);

  // 4. Risveglia brevemente la simulazione fisica per aggiornare 
  // le coordinate (d.x e d.y) della nuova croce appena creata
  simulation.alpha(0.1).restart();
}

const svg = d3.select("#graph-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const linkLayer = svg.append("g");
const messageLayer = svg.append("g");
const nodeLayer = svg.append("g");
const textLayer = svg.append("g");
const crashLayer = svg.append("g");

const simulation = d3.forceSimulation(nodesData)
  .force("link", d3.forceLink(linksData).id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(width / 2, height / 2));

const link = linkLayer
  .selectAll("path")
  .data(linksData)
  .enter().append("path")
  .attr("stroke", "#999")
  .attr("fill", "none")
  .attr("stroke-width", 2)
  .attr("stroke-dasharray", "4,4");

const node = nodeLayer
  .selectAll("circle")
  .data(nodesData)
  .enter().append("circle")
  .attr("r", nodeRadius)
  .attr("fill", "steelblue");

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

  const msgObj = messageLayer.append("circle")
    .attr("r", 6)
    .attr("fill", "orange")
    .attr("cx", sourceNode.x)
    .attr("cy", sourceNode.y);

  if (sourceId === targetId) {
    msgObj.transition()
      .duration(RTT / 4)
      .ease(d3.easeCubicOut)
      .attr("cx", sourceNode.x - 20)
      .attr("cy", sourceNode.y - 40)
      .transition()
      .duration(RTT / 4)
      .ease(d3.easeCubicIn)
      .attr("cx", sourceNode.x)
      .attr("cy", sourceNode.y)
      .on("end", function() {
          d3.select(this).remove();
      });
  } else {
    msgObj.transition()
      .duration(RTT / 2)
      .ease(d3.easeLinear)
      .attr("cx", targetNode.x)
      .attr("cy", targetNode.y)
      .on("end", function() {
          d3.select(this).remove();
      });
  }
}

simulation.on("tick", () => {
  // Aggiorna le linee di connessione
  link.attr("d", d => {
    if (d.source.id === d.target.id) {
      const x = d.source.x;
      const y = d.source.y;
      const loopRadius = 35;
      const x1 = x - loopRadius;
      const y1 = y - loopRadius;
      const x2 = x + loopRadius;
      const y2 = y - loopRadius;

      return `M ${x - 10} ${y - nodeRadius + 5} C ${x1} ${y1}, ${x2} ${y2}, ${x + 10} ${y - nodeRadius + 5}`;    
    } else { 
      return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`;
    }
  });

  // Aggiorna solo la posizione dei cerchi (il colore è ora gestito in updateGraphState)
  node
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);
    
  // Aggiorna la posizione dei testi
  text
    .attr("x", d => d.x)
    .attr("y", d => d.y);

  // Aggiorna SOLO la posizione delle croci (senza ricrearle o fare merge)
  crashLayer.selectAll("path.crash-mark")
    .attr("d", d => {
        const s = 10;
        return `M ${d.x - s} ${d.y - s} L ${d.x + s} ${d.y + s} M ${d.x + s} ${d.y - s} L ${d.x - s} ${d.y + s}`;
    });
});