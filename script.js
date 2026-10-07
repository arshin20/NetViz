// ---------- 1. TOPOLOGY DATA ----------
// Node types: pc, sw (switch), j (bus junction), e (bus end – not counted)
// edges: pairs of node ids. path: route used by the packet simulation.
// A helper to place n nodes evenly on a circle
function circle(n, cx, cy, r, prefix) {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { id: prefix + i, t: "pc", x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), l: "PC" + (i + 1) };
  });
}
function fullMesh(ids) {
  const e = [];
  ids.forEach((a, i) => ids.slice(i + 1).forEach(b => e.push([a, b])));
  return e;
}
const starNodes = [{ id: "sw", t: "sw", x: 300, y: 190, l: "Switch" }, ...circle(5, 300, 190, 140, "p").map(n => ({ ...n, x: 300 + (n.x - 300) * 1.5 }))];
const meshNodes = circle(5, 300, 190, 140, "m");
const ringNodes = circle(6, 300, 190, 140, "r");

const TOPOLOGIES = {
  star: {
    name: "STAR TOPOLOGY", type: "Centralized", short: "Every device connects to one central switch.",
    desc: "All devices are connected to a central switch or hub. All traffic passes through that central device.",
    adv: ["Easy to manage and extend", "Easy to troubleshoot", "Failure of one device does not affect the network"],
    app: ["Office networks", "Computer laboratories", "Home networks"],
    nodes: starNodes, edges: starNodes.slice(1).map(n => ["sw", n.id]), path: ["p0", "sw", "p3"]
  },
  bus: {
    name: "BUS TOPOLOGY", type: "Linear", short: "Devices share a single backbone cable.",
    desc: "All devices connect to one main cable (the backbone). Data travels along it and every device can hear it.",
    adv: ["Cheap and uses little cable", "Simple to set up", "Easy to add a new device"],
    app: ["Small temporary networks", "Early Ethernet (10BASE2)", "Teaching labs"],
    nodes: [
      { id: "e0", t: "e", x: 40, y: 190 }, { id: "e1", t: "e", x: 560, y: 190 },
      ...[110, 300, 490].map((x, i) => ({ id: "j" + i, t: "j", x, y: 190 })),
      ...[110, 300, 490].map((x, i) => ({ id: "t" + i, t: "pc", x, y: 70, l: "PC" + (i + 1) })),
      ...[110, 300, 490].map((x, i) => ({ id: "b" + i, t: "pc", x, y: 310, l: "PC" + (i + 4) }))],
    edges: [["e0", "j0"], ["j0", "j1"], ["j1", "j2"], ["j2", "e1"],
      ...[0, 1, 2].flatMap(i => [["t" + i, "j" + i], ["b" + i, "j" + i]])],
    path: ["t0", "j0", "j1", "j2", "b2"], conn: 6
  },
  ring: {
    name: "RING TOPOLOGY", type: "Circular", short: "Each device connects to exactly two neighbours.",
    desc: "Each device is connected to the next, and the last connects back to the first, forming a closed loop. Data travels around the ring.",
    adv: ["Orderly data flow, few collisions", "Equal access for every device", "Performs well under heavy load"],
    app: ["Token Ring LANs", "FDDI backbones", "Metropolitan area networks"],
    nodes: ringNodes, edges: ringNodes.map((n, i) => [n.id, ringNodes[(i + 1) % 6].id]), path: ["r0", "r1", "r2", "r3"]
  },
  mesh: {
    name: "MESH TOPOLOGY", type: "Distributed", short: "Devices have direct links to many others.",
    desc: "Every device is linked directly to every other device (full mesh), so data always has multiple routes.",
    adv: ["Very reliable: many alternate paths", "No single point of failure", "Fast direct communication"],
    app: ["Internet core routers", "Military networks", "Wireless mesh networks"],
    nodes: meshNodes, edges: fullMesh(meshNodes.map(n => n.id)), path: ["m0", "m2", "m3"]
  },
  tree: {
    name: "TREE TOPOLOGY", type: "Hierarchical", short: "Star networks arranged in a hierarchy.",
    desc: "A root device connects to child switches, which connect to computers. It combines several star networks.",
    adv: ["Easy to expand in groups", "Faults are isolated to one branch", "Clear hierarchy for management"],
    app: ["College campuses", "Corporate networks", "WAN structures"],
    nodes: [
      { id: "root", t: "sw", x: 300, y: 50, l: "Root" },
      { id: "s1", t: "sw", x: 160, y: 170, l: "Switch A" }, { id: "s2", t: "sw", x: 440, y: 170, l: "Switch B" },
      ...[90, 230, 370, 510].map((x, i) => ({ id: "c" + i, t: "pc", x, y: 310, l: "PC" + (i + 1) }))],
    edges: [["root", "s1"], ["root", "s2"], ["s1", "c0"], ["s1", "c1"], ["s2", "c2"], ["s2", "c3"]],
    path: ["c0", "s1", "root", "s2", "c3"]
  }
};
// Counts: nodes = devices only (not bus junctions); connections = number of links
Object.values(TOPOLOGIES).forEach(t => {
  t.nodeCount = t.nodes.filter(n => n.t === "pc" || n.t === "sw").length;
  t.connCount = t.conn || t.edges.length;
});

// ---------- 2. DRAWING ----------
const NS = "http://www.w3.org/2000/svg";
function drawTopology(key, small) {
  const t = TOPOLOGIES[key], byId = Object.fromEntries(t.nodes.map(n => [n.id, n]));
  let s = `<svg viewBox="0 0 600 380" xmlns="${NS}">`;
  t.edges.forEach(([a, b]) => {
    s += `<line class="edge" id="${small ? "" : "e-" + a + "-" + b}" x1="${byId[a].x}" y1="${byId[a].y}" x2="${byId[b].x}" y2="${byId[b].y}"/>`;
  });
  t.nodes.forEach(n => {
    if (n.t === "j" || n.t === "e") { s += `<circle class="junc" cx="${n.x}" cy="${n.y}" r="${n.t === "j" ? 5 : 3}"/>`; return; }
    const w = n.t === "sw" ? 64 : 46, h = n.t === "sw" ? 30 : 32;
    s += `<g class="node ${n.t}" id="${small ? "" : "n-" + n.id}"><rect x="${n.x - w / 2}" y="${n.y - h / 2}" width="${w}" height="${h}" rx="7"/>` +
      (n.t === "pc" ? `<rect x="${n.x - 12}" y="${n.y - 8}" width="24" height="14" rx="2" fill="#38bdf833" stroke="none"/>` : "") +
      (small ? "" : `<text x="${n.x}" y="${n.y + h / 2 + 14}">${n.l}</text>`) + `</g>`;
  });
  return s + (small ? "" : `<circle class="packet" id="packet" r="6" cx="-20" cy="-20"/>`) + "</svg>";
}

// ---------- 3. PAGE NAVIGATION ----------
const $ = id => document.getElementById(id);
let current = "overview", animId = null;

function show(key) {
  resetSimulation();
  current = key;
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("active", b.dataset.t === key));
  $("overview").hidden = key !== "overview";
  $("detail").hidden = key === "overview";
  if (key === "overview") return;
  const t = TOPOLOGIES[key];
  $("canvas").innerHTML = drawTopology(key);
  $("tName").textContent = t.name;
  $("tDesc").textContent = t.desc;
  $("tAdv").innerHTML = t.adv.map(x => `<li>${x}</li>`).join("");
  $("tApp").innerHTML = t.app.map(x => `<li>${x}</li>`).join("");
  const stats = [["NODES", t.nodeCount], ["CONNECTIONS", t.connCount], ["TYPE", t.type.toUpperCase()], ["STATUS", "ACTIVE"]];
  $("stats").innerHTML = stats.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join("");
}

// Build overview cards from the same data
$("cards").innerHTML = Object.keys(TOPOLOGIES).map(k => {
  const t = TOPOLOGIES[k];
  return `<div class="card">${drawTopology(k, true)}<h3>${k[0].toUpperCase() + k.slice(1)}</h3><p>${t.short}</p><button data-t="${k}">Explore</button></div>`;
}).join("");
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-t]");
  if (b) show(b.dataset.t);
});

// ---------- 4. DATA PACKET SIMULATION ----------
function resetSimulation() {
  cancelAnimationFrame(animId);
  document.querySelectorAll(".on,.hot").forEach(el => el.classList.remove("on", "hot"));
  const p = $("packet"); if (p) p.setAttribute("cx", -20);
  if ($("msg")) $("msg").textContent = "";
  if ($("simBtn")) $("simBtn").disabled = false;
}

function simulate() {
  resetSimulation();
  const t = TOPOLOGIES[current], byId = Object.fromEntries(t.nodes.map(n => [n.id, n]));
  const path = t.path, packet = $("packet");
  $("simBtn").disabled = true;
  $("n-" + path[0]).classList.add("hot");
  $("msg").textContent = "SENDING DATA…";
  let seg = 0, start = null;
  const SEG_TIME = 700; // ms per hop

  function step(now) {
    if (!start) start = now;
    const k = Math.min((now - start) / SEG_TIME, 1);
    const a = byId[path[seg]], b = byId[path[seg + 1]];
    packet.setAttribute("cx", a.x + (b.x - a.x) * k);
    packet.setAttribute("cy", a.y + (b.y - a.y) * k);
    // light up the link being used (edge may be stored in either direction)
    const edge = $("e-" + path[seg] + "-" + path[seg + 1]) || $("e-" + path[seg + 1] + "-" + path[seg]);
    if (edge) edge.classList.add("on");
    if (k < 1) { animId = requestAnimationFrame(step); return; }
    seg++; start = null;
    if (seg < path.length - 1) { animId = requestAnimationFrame(step); return; }
    $("n-" + path[path.length - 1]).classList.add("hot");
    $("msg").textContent = "DATA TRANSMISSION COMPLETE";
    $("simBtn").disabled = false;
  }
  animId = requestAnimationFrame(step);
}
$("simBtn").addEventListener("click", simulate);
$("resetBtn").addEventListener("click", resetSimulation);
