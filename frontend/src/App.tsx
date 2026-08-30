import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── GOOGLE MAPS–INSPIRED PALETTE ────────────────────────────
const T = {
  bg:      "#F1F3F4",
  hdr:     "#FFFFFF",
  card:    "#FFFFFF",
  card2:   "#F8F9FA",
  border:  "rgba(0,0,0,0.1)",
  border2: "rgba(0,0,0,0.06)",
  text:    "#202124",
  dim:     "#5F6368",
  faint:   "#9AA0A6",
  blue:    "#1A73E8",   // Google blue — brand / selected
  teal:    "#00ACC1",   // teal — live data
  green:   "#34A853",   // Google green — active signal
  amber:   "#F9AB00",   // Google amber — warning
  red:     "#EA4335",   // Google red — congestion
  yellow:  "#FBBC04",   // Google yellow — transition
};

// ─── TYPES ────────────────────────────────────────────────────
type View       = "dashboard" | "map";
type ActiveDir  = "NS" | "EW" | "NS-Y" | "EW-Y";
type SpikeStage = "idle" | "spike" | "detect" | "decide" | "recover";

interface Intersection {
  id: number; name: string; code: string;
  activeDir: ActiveDir; phaseTimer: number;
  nsVeh: number; ewVeh: number; nsQueue: number; ewQueue: number;
  pressure: number; adaptiveGreen: number; processed: number; spiked: boolean;
}
interface HistoryPoint {
  t: string; thrAdaptive: number; thrFixed: number;
  queueAdaptive: number; queueFixed: number;
}

// ─── CONSTANTS ───────────────────────────────────────────────
const YDUR = 3, FXGREEN = 28, MING = 12, MAXG = 70;
const adaptGreen = (q: number, v: number) =>
  Math.round(MING + (Math.min(100, q * 5 + v * 0.7) / 100) * (MAXG - MING));
const toPressure = (q: number, v: number) => Math.min(100, Math.round(q * 5 + v * 0.7));

function makeInitial(): Intersection[] {
  return [
    { id:1, code:"INT-01", name:"Main St × 1st Ave",   activeDir:"NS",   phaseTimer:22, nsVeh:28, ewVeh:14, nsQueue:11, ewQueue:5,  pressure:62, adaptiveGreen:35, processed:0, spiked:false },
    { id:2, code:"INT-02", name:"Oak Ave × 2nd St",    activeDir:"EW",   phaseTimer:15, nsVeh:18, ewVeh:22, nsQueue:7,  ewQueue:9,  pressure:50, adaptiveGreen:30, processed:0, spiked:false },
    { id:3, code:"INT-03", name:"Park Blvd × 3rd St",  activeDir:"NS-Y", phaseTimer:2,  nsVeh:20, ewVeh:30, nsQueue:6,  ewQueue:14, pressure:72, adaptiveGreen:40, processed:0, spiked:false },
    { id:4, code:"INT-04", name:"Harbor Rd × 4th Ave", activeDir:"EW",   phaseTimer:8,  nsVeh:10, ewVeh:12, nsQueue:3,  ewQueue:4,  pressure:28, adaptiveGreen:18, processed:0, spiked:false },
  ];
}

function toSig(dir: ActiveDir, side: "NS"|"EW"): "green"|"yellow"|"red" {
  if (side==="NS") { if(dir==="NS") return "green"; if(dir==="NS-Y") return "yellow"; return "red"; }
  else             { if(dir==="EW") return "green"; if(dir==="EW-Y") return "yellow"; return "red"; }
}
const dirLabel   = (dir: ActiveDir) => (dir==="NS"||dir==="NS-Y") ? "NORTH–SOUTH" : "EAST–WEST";
const phaseColor = (dir: ActiveDir) => (dir==="NS-Y"||dir==="EW-Y") ? T.yellow : T.green;

// ─── INTERSECTION CARD ───────────────────────────────────────
function IxCard({ ix, sel, onClick }: { ix: Intersection; sel: boolean; onClick: () => void }) {
  const ac  = phaseColor(ix.activeDir);
  const isY = ix.activeDir==="NS-Y" || ix.activeDir==="EW-Y";
  const tv  = ix.nsVeh + ix.ewVeh;
  const tq  = ix.nsQueue + ix.ewQueue;

  return (
    <button
      onClick={onClick}
      className={`ix-card w-full text-left rounded-2xl border cursor-pointer p-4 ${sel ? "ring-blue" : "card-shadow"}`}
      style={{
        background:  sel ? "#EAF2FD" : T.card,
        borderColor: sel ? "rgba(26,115,232,0.4)" : ix.spiked ? "rgba(234,67,53,0.3)" : T.border,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-display font-700 text-[11px] tracking-[0.18em] px-2 py-0.5 rounded-md"
              style={{ color: sel ? T.blue : T.faint, background: sel ? "rgba(26,115,232,0.1)" : T.card2 }}>
              {ix.code}
            </span>
          </div>
          <div className="font-display font-800 text-[15px] leading-tight" style={{ color: T.text }}>
            {ix.name}
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 flex-shrink-0 mt-0.5"
          style={{ background: `${ac}18`, border: `1px solid ${ac}40` }}>
          <div className="w-2 h-2 rounded-full" style={{ background: ac }} />
          <span className="font-display font-700 text-[11px]" style={{ color: ac }}>
            {isY ? "TRANS" : ix.activeDir==="NS" ? "N–S" : "E–W"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <MR label="VEHICLES"  value={String(tv)} />
        <MR label="QUEUE"     value={String(tq)} alert={tq > 25} />
        <MR label="REMAINING" value={`${ix.phaseTimer}s`} />
        <MR label="ADAPTIVE"  value={`${ix.adaptiveGreen}s`} hl />
      </div>

      {ix.spiked && (
        <div className="spike-flash mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background:"rgba(234,67,53,0.08)", border:"1px solid rgba(234,67,53,0.25)" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: T.red }} />
          <span className="font-display font-700 text-[11px] tracking-[0.12em]" style={{ color: T.red }}>
            SURGE DETECTED
          </span>
        </div>
      )}
    </button>
  );
}

function MR({ label, value, alert, hl }: { label:string; value:string; alert?:boolean; hl?:boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-display text-[10px] tracking-[0.12em]" style={{ color: T.faint }}>{label}</span>
      <span className="font-mono-data font-700 text-[14px]"
        style={{ color: alert ? T.red : hl ? T.blue : T.text }}>{value}</span>
    </div>
  );
}

// ─── SIGNAL STATUS ────────────────────────────────────────────
function SignalPanel({ ix }: { ix: Intersection }) {
  const dir  = ix.activeDir;
  const isY  = dir==="NS-Y" || dir==="EW-Y";
  const ac   = phaseColor(dir);
  const glowClass = isY ? "countdown-glow-yellow" : "countdown-glow-green";

  const onC  = { red: T.red,    yellow: T.yellow,  green: T.green };
  const offC = { red:"rgba(234,67,53,0.1)", yellow:"rgba(251,188,4,0.1)", green:"rgba(52,168,83,0.1)" };
  const glC  = { red:"glow-red", yellow:"glow-yellow", green:"glow-green" };

  return (
    <div className="rounded-2xl border flex flex-col items-center justify-center py-6 px-4 text-center card-shadow"
      style={{ background: T.card, borderColor: `${ac}35` }}>
      {/* Vertical traffic light housing */}
      <div className="flex flex-col items-center gap-2 mb-5 rounded-2xl px-3 py-4"
        style={{ background:"rgba(0,0,0,0.06)", border:"1px solid rgba(0,0,0,0.08)" }}>
        {(["red","yellow","green"] as const).map(s => {
          const on = (s==="green"&&!isY)||(s==="yellow"&&isY);
          return (
            <div key={s} className={`w-6 h-6 rounded-full ${on ? glC[s] : ""}`}
              style={{ background: on ? onC[s] : offC[s] }} />
          );
        })}
      </div>

      <div className="font-display font-600 text-[11px] tracking-[0.24em] mb-1.5"
        style={{ color: T.faint }}>{isY ? "TRANSITIONING" : "ACTIVE PHASE"}</div>

      <div className="font-display font-800 text-[24px] leading-none tracking-wider mb-3"
        style={{ color: ac }}>{dirLabel(dir)}</div>

      <div className={`font-mono-data font-700 leading-none ${glowClass}`}
        style={{ fontSize:"5.5rem", color: ac }}>
        {ix.phaseTimer}
      </div>
      <div className="font-display text-[11px] tracking-[0.2em] mt-2.5" style={{ color: T.faint }}>
        SECONDS REMAINING
      </div>
    </div>
  );
}

// ─── ADAPTIVE DECISION PANEL ──────────────────────────────────
function DecisionPanel({ ix, stage }: { ix: Intersection; stage: SpikeStage }) {
  const cong  = ix.spiked && stage!=="idle";
  const aq    = (ix.activeDir==="EW"||ix.activeDir==="EW-Y") ? ix.ewQueue : ix.nsQueue;
  const wait  = Math.round(aq * 1.6 + ix.phaseTimer * 0.4);
  const delta = ix.adaptiveGreen - FXGREEN;

  const S = {
    idle:    { label:"MONITORING · ALL CLEAR",      color: T.faint,  strip: T.blue  },
    spike:   { label:"↑ TRAFFIC SPIKE INCOMING",    color: T.amber,  strip: T.amber },
    detect:  { label:"⚠  HIGH TRAFFIC DETECTED",    color: T.red,    strip: T.red   },
    decide:  { label:"⚡ CONTROLLER DECISION MADE", color: T.blue,   strip: T.blue  },
    recover: { label:"✓  CONGESTION CLEARING",      color: T.green,  strip: T.green },
  }[stage];

  return (
    <div className="rounded-2xl border flex flex-col gap-3 overflow-hidden card-shadow card-base"
      style={{ borderColor: T.border }}>
      <div className="h-[3px] w-full flex-shrink-0"
        style={{ background:`linear-gradient(90deg,${S.strip},transparent)` }} />

      <div className="flex flex-col gap-3 px-4 pb-4">
        <div>
          <Cap>ADAPTIVE SIGNAL DECISION</Cap>
          <div className="font-display font-800 text-[14px] mt-1" style={{ color: S.color }}>
            {S.label}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[{l:"QUEUE",v:String(aq),u:"vehicles",c:cong?T.red:T.text},{l:"WAITING",v:String(wait),u:"sec",c:cong?T.amber:T.text}].map(({l,v,u,c})=>(
            <div key={l} className="rounded-xl p-3" style={{ background:T.card2, border:`1px solid ${T.border2}` }}>
              <div className="font-display text-[10px] tracking-[0.12em]" style={{ color:T.faint }}>{l}</div>
              <div className="font-mono-data font-700 text-3xl leading-none mt-0.5" style={{ color:c }}>{v}</div>
              <div className="font-display text-[10px] mt-0.5" style={{ color:T.faint }}>{u}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-3" style={{ background:T.card2, border:`1px solid ${T.border2}` }}>
          <Cap>GREEN TIME ALLOCATION</Cap>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-center flex-shrink-0">
              <div className="font-display text-[10px]" style={{ color:T.faint }}>FIXED</div>
              <div className="font-mono-data font-700 text-2xl" style={{ color:T.faint }}>{FXGREEN}s</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-px" style={{ background:`linear-gradient(90deg,${T.faint}30,${delta>0?T.amber:T.green},${T.faint}30)` }} />
              <span className="font-display font-700 text-[11px]"
                style={{ color:delta>0?T.amber:delta<0?T.green:T.faint }}>
                {delta>0?`+${delta}s EXTENDED`:delta<0?`${delta}s REDUCED`:"NOMINAL"}
              </span>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="font-display text-[10px]" style={{ color:T.faint }}>ADAPTIVE</div>
              <div className="font-mono-data font-700 text-2xl" style={{ color:T.blue }}>{ix.adaptiveGreen}s</div>
            </div>
          </div>
        </div>

        <div className="font-display text-[11px] tracking-wide"
          style={{ color: S.color===T.faint ? T.faint : S.color }}>
          {stage==="idle"    && "PRESSURE-WEIGHTED ALLOCATION ACTIVE"}
          {stage==="spike"   && "VEHICLE COUNT CLIMBING ↑↑"}
          {stage==="detect"  && "CONGESTION THRESHOLD EXCEEDED"}
          {stage==="decide"  && `REALLOCATING +${delta>0?delta:22}s TO HEAVY APPROACH`}
          {stage==="recover" && "QUEUE DISSIPATING — RETURNING TO NOMINAL"}
        </div>
      </div>
    </div>
  );
}

// ─── COMPARISON TABLE ────────────────────────────────────────
function CompTable({ stage }: { stage: SpikeStage }) {
  const surge = stage==="decide"||stage==="recover";
  const rows  = surge
    ? [{l:"WAIT TIME",f:"148s",a:"52s"},{l:"QUEUE",f:"94",a:"28"},{l:"TRAVEL",f:"18.2m",a:"8.9m"},{l:"THROUGHPUT",f:"312 v",a:"538 v"}]
    : [{l:"WAIT TIME",f:"74s", a:"43s"},{l:"QUEUE",f:"31", a:"17"},{l:"TRAVEL",f:"9.4m", a:"7.1m"},{l:"THROUGHPUT",f:"412 v",a:"468 v"}];
  return (
    <div className="rounded-2xl border p-4 card-shadow card-base" style={{ borderColor:T.border }}>
      <div className="flex items-center justify-between mb-3">
        <Cap>FIXED vs ADAPTIVE</Cap>
        {surge && <span className="font-display font-700 text-[11px] tracking-wider px-2.5 py-1 rounded-full"
          style={{ color:T.blue, background:"rgba(26,115,232,0.1)", border:`1px solid rgba(26,115,232,0.2)` }}>
          SURGE ACTIVE
        </span>}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 mb-2 px-1">
        <span/>
        <span className="font-display text-[10px] tracking-widest text-right w-16" style={{ color:T.faint }}>FIXED</span>
        <span className="font-display text-[10px] tracking-widest text-right w-18" style={{ color:T.blue }}>ADAPTIVE</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(r=>(
          <div key={r.l} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-baseline rounded-xl px-3 py-2.5"
            style={{ background:T.card2, border:`1px solid ${T.border2}` }}>
            <span className="font-display font-700 text-[11px] tracking-wide" style={{ color:T.dim }}>{r.l}</span>
            <span className="font-mono-data font-500 text-[14px] text-right w-16" style={{ color:T.faint }}>{r.f}</span>
            <span className="font-mono-data font-700 text-[14px] text-right w-18" style={{ color:T.blue }}>→ {r.a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CHART TOOLTIP ────────────────────────────────────────────
function CTip({ active,payload,label }: { active?:boolean; payload?:{name:string;value:number;color:string}[]; label?:string }) {
  if (!active||!payload?.length) return null;
  return (
    <div className="rounded-xl border p-2.5 text-xs font-mono-data"
      style={{ background:T.card, borderColor:T.border, boxShadow:"0 4px 16px rgba(0,0,0,0.12)" }}>
      <div className="mb-1.5" style={{ color:T.faint }}>t={label}s</div>
      {payload.map(p=>(
        <div key={p.name} style={{ color:p.color }} className="flex gap-3 justify-between">
          <span>{p.name}</span><span className="font-600">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CHART CARD ───────────────────────────────────────────────
function ChartCard({ title, legend, children }: { title:string; legend:React.ReactNode; children:React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4 flex-1 min-h-0 card-shadow card-base flex flex-col"
      style={{ borderColor:T.border }}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <Cap>{title}</Cap>
        <div className="flex gap-3">{legend}</div>
      </div>
      <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
  );
}

// ─── TRAFFIC MAP ─────────────────────────────────────────────
function TrafficMap({ ix }: { ix: Intersection }) {
  const W = 560, H = 354;
  const cx = 280, cy = 177;
  const rh = 36;
  const ib = 40;

  const ns  = toSig(ix.activeDir, "NS");
  const ew  = toSig(ix.activeDir, "EW");
  const nsG = ns === "green";
  const ewG = ew === "green";

  // Road fill = signal color
  function roadFill(sig: "green"|"yellow"|"red"): string {
    if (sig === "green")  return "#A7F3D0";
    if (sig === "yellow") return "#FEF08A";
    return "#E5E7EB";
  }
  const nsRoad = roadFill(ns);
  const ewRoad = roadFill(ew);
  const ixFill = nsG || ewG ? "#A7F3D0"
    : (ns==="yellow"||ew==="yellow") ? "#FEF08A" : "#E5E7EB";

  const MAP_BG   = "#EEF2E6";
  const GRASS    = "#D8EBB5";
  const BLDG_A   = "#B8CE94";
  const BLDG_B   = "#C4D9A4";
  const MAP_TXT  = "#374151";
  const MAP_DIM  = "#6B7280";
  const STRIPE   = "rgba(255,255,255,0.65)";
  const DASH_CLR = "rgba(90,70,0,0.3)";

  const BLDGS = {
    NW: [[10,10,96,50],[116,8,84,44],[194,6,36,62],[10,70,68,54],[86,68,104,56]] as number[][],
    NE: [[8,8,98,48],[118,10,86,42],[216,6,96,56],[10,70,80,56],[100,66,108,58]] as number[][],
    SW: [[10,10,92,52],[114,8,82,56],[8,74,74,58],[92,78,106,48],[208,16,26,110]] as number[][],
    SE: [[6,10,96,48],[114,8,90,50],[218,12,98,52],[8,72,80,58],[100,68,112,56]] as number[][],
  };

  function crosswalk(x1:number,y1:number,x2:number,y2:number,horiz:boolean) {
    return Array.from({length:5},(_,i)=>{
      if(horiz){ const sw=(x2-x1)/9; return <rect key={i} x={x1+i*sw*2} y={y1} width={sw} height={y2-y1} rx={1} fill={STRIPE}/>; }
      const sh=(y2-y1)/9; return <rect key={i} x={x1} y={y1+i*sh*2} width={x2-x1} height={sh} rx={1} fill={STRIPE}/>;
    });
  }

  function sigHead(x:number,y:number,state:"green"|"yellow"|"red") {
    const SC={green:"#16A34A",yellow:"#CA8A04",red:"#DC2626"};
    const off={green:"rgba(52,168,83,0.12)",yellow:"rgba(202,138,4,0.12)",red:"rgba(220,38,38,0.12)"};
    return (
      <g>
        <rect x={x-6} y={y-15} width={12} height={32} rx={3.5} fill="#1C1C2E" opacity={0.92}/>
        {(["red","yellow","green"] as const).map((s,i)=>(
          <circle key={s} cx={x} cy={y-9+i*9} r={3.5}
            fill={state===s?SC[s]:off[s]}
            style={state===s?{filter:`drop-shadow(0 0 5px ${SC[s]}bb)`}:undefined}/>
        ))}
      </g>
    );
  }

  function cars(count:number,dir:"N"|"S"|"E"|"W",active:boolean) {
    const n=Math.min(count,10);
    const fill=active?"rgba(30,80,200,0.6)":"rgba(180,40,40,0.65)";
    const gap=active?19:13;
    return Array.from({length:n},(_,i)=>{
      const off=i*gap+6; let x=0,y=0,w=7,h=11;
      if(dir==="N"){x=cx+6;y=cy-ib-off-h;}
      else if(dir==="S"){x=cx-6-w;y=cy+ib+off;}
      else if(dir==="W"){x=cx-ib-off-h;y=cy-6-3.5;w=11;h=7;}
      else{x=cx+ib+off;y=cy+6-3.5;w=11;h=7;}
      return <rect key={i} x={x} y={y} width={w} height={h} rx={2} fill={fill}/>;
    });
  }

  function qbadge(x:number,y:number,q:number) {
    const bg=q>=15?"#FECACA":q>=8?"#FEF3C7":"#D1FAE5";
    const fc=q>=15?"#991B1B":q>=8?"#92400E":"#065F46";
    const bdr=q>=15?"#FCA5A5":q>=8?"#FDE68A":"#6EE7B7";
    return (
      <g>
        <rect x={x-15} y={y-10} width={30} height={20} rx={6} fill={bg} stroke={bdr} strokeWidth={1}/>
        <text x={x} y={y+5} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono" fontWeight={700} fill={fc}>{q}</text>
      </g>
    );
  }

  const stopC=(g:boolean)=>g?"#16A34A":"#DC2626";

  return (
    <div className="relative w-full h-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{display:"block"}}>
        <defs>
          <linearGradient id="reNS" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000" stopOpacity="0.1"/><stop offset="12%" stopColor="#000" stopOpacity="0"/>
            <stop offset="88%" stopColor="#000" stopOpacity="0"/><stop offset="100%" stopColor="#000" stopOpacity="0.1"/>
          </linearGradient>
          <linearGradient id="reEW" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.1"/><stop offset="12%" stopColor="#000" stopOpacity="0"/>
            <stop offset="88%" stopColor="#000" stopOpacity="0"/><stop offset="100%" stopColor="#000" stopOpacity="0.1"/>
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill={MAP_BG}/>

        {/* Grass blocks */}
        <rect x={0}     y={0}     width={cx-rh}     height={cy-rh}     fill={GRASS}/>
        <rect x={cx+rh} y={0}     width={W-(cx+rh)} height={cy-rh}     fill={GRASS}/>
        <rect x={0}     y={cy+rh} width={cx-rh}     height={H-(cy+rh)} fill={GRASS}/>
        <rect x={cx+rh} y={cy+rh} width={W-(cx+rh)} height={H-(cy+rh)} fill={GRASS}/>

        {/* Buildings */}
        {BLDGS.NW.map(([bx,by,bw,bh],i)=><rect key={`nw${i}`} x={bx}         y={by}          width={bw} height={bh} rx={2} fill={i%2===0?BLDG_A:BLDG_B}/>)}
        {BLDGS.NE.map(([bx,by,bw,bh],i)=><rect key={`ne${i}`} x={(cx+rh)+bx} y={by}          width={bw} height={bh} rx={2} fill={i%2===0?BLDG_A:BLDG_B}/>)}
        {BLDGS.SW.map(([bx,by,bw,bh],i)=><rect key={`sw${i}`} x={bx}         y={(cy+rh)+by}  width={bw} height={bh} rx={2} fill={i%2===0?BLDG_A:BLDG_B}/>)}
        {BLDGS.SE.map(([bx,by,bw,bh],i)=><rect key={`se${i}`} x={(cx+rh)+bx} y={(cy+rh)+by}  width={bw} height={bh} rx={2} fill={i%2===0?BLDG_A:BLDG_B}/>)}

        {/* Roads */}
        <rect x={cx-rh} y={0}      width={rh*2}      height={cy-ib}      fill={nsRoad}/>
        <rect x={cx-rh} y={cy+ib}  width={rh*2}      height={H-(cy+ib)}  fill={nsRoad}/>
        <rect x={0}     y={cy-rh}  width={cx-ib}     height={rh*2}       fill={ewRoad}/>
        <rect x={cx+ib} y={cy-rh}  width={W-(cx+ib)} height={rh*2}       fill={ewRoad}/>
        <rect x={cx-ib} y={cy-ib}  width={ib*2}      height={ib*2}       fill={ixFill}/>

        {/* Road edge depth */}
        <rect x={cx-rh} y={0}      width={rh*2}      height={cy-ib}      fill="url(#reNS)"/>
        <rect x={cx-rh} y={cy+ib}  width={rh*2}      height={H-(cy+ib)}  fill="url(#reNS)"/>
        <rect x={0}     y={cy-rh}  width={cx-ib}     height={rh*2}       fill="url(#reEW)"/>
        <rect x={cx+ib} y={cy-rh}  width={W-(cx+ib)} height={rh*2}       fill="url(#reEW)"/>

        {/* Center lane dashes — stop 32px before map edge */}
        <line x1={cx} y1={32}      x2={cx} y2={cy-ib}  stroke={DASH_CLR} strokeWidth={2} strokeDasharray="12 9"/>
        <line x1={cx} y1={cy+ib}   x2={cx} y2={H-32}   stroke={DASH_CLR} strokeWidth={2} strokeDasharray="12 9"/>
        <line x1={32}    y1={cy}   x2={cx-ib} y2={cy}  stroke={DASH_CLR} strokeWidth={2} strokeDasharray="12 9"/>
        <line x1={cx+ib} y1={cy}   x2={W-32}  y2={cy}  stroke={DASH_CLR} strokeWidth={2} strokeDasharray="12 9"/>

        {/* Crosswalks */}
        <g>{crosswalk(cx-rh+3,cy-ib-14,cx+rh-3,cy-ib-2,true)}</g>
        <g>{crosswalk(cx-rh+3,cy+ib+2,cx+rh-3,cy+ib+14,true)}</g>
        <g>{crosswalk(cx-ib-14,cy-rh+3,cx-ib-2,cy+rh-3,false)}</g>
        <g>{crosswalk(cx+ib+2,cy-rh+3,cx+ib+14,cy+rh-3,false)}</g>

        {/* Stop bars */}
        <line x1={cx-rh+3} y1={cy-ib} x2={cx+rh-3} y2={cy-ib} stroke={stopC(nsG)} strokeWidth={3} opacity={0.7}/>
        <line x1={cx-rh+3} y1={cy+ib} x2={cx+rh-3} y2={cy+ib} stroke={stopC(nsG)} strokeWidth={3} opacity={0.7}/>
        <line x1={cx-ib} y1={cy-rh+3} x2={cx-ib} y2={cy+rh-3} stroke={stopC(ewG)} strokeWidth={3} opacity={0.7}/>
        <line x1={cx+ib} y1={cy-rh+3} x2={cx+ib} y2={cy+rh-3} stroke={stopC(ewG)} strokeWidth={3} opacity={0.7}/>

        {/* Vehicles */}
        {cars(ix.nsQueue,"N",nsG)}{cars(ix.nsQueue,"S",nsG)}
        {cars(ix.ewQueue,"W",ewG)}{cars(ix.ewQueue,"E",ewG)}

        {/* Flow arrows */}
        {nsG&&<><text x={cx+18} y={cy-50} textAnchor="middle" fontSize={22} fill="#16A34A" opacity={0.55}>↓</text><text x={cx-18} y={cy+70} textAnchor="middle" fontSize={22} fill="#16A34A" opacity={0.55}>↑</text></>}
        {ewG&&<><text x={cx-82} y={cy+8}  textAnchor="middle" fontSize={22} fill="#16A34A" opacity={0.55}>←</text><text x={cx+82} y={cy+8}  textAnchor="middle" fontSize={22} fill="#16A34A" opacity={0.55}>→</text></>}

        {/* Signal heads */}
        {sigHead(cx-rh+14,cy-ib-20,ns)}{sigHead(cx+rh-14,cy-ib-20,ns)}
        {sigHead(cx-rh+14,cy+ib+20,ns)}{sigHead(cx+rh-14,cy+ib+20,ns)}
        {sigHead(cx-ib-20,cy-rh+14,ew)}{sigHead(cx-ib-20,cy+rh-14,ew)}
        {sigHead(cx+ib+20,cy-rh+14,ew)}{sigHead(cx+ib+20,cy+rh-14,ew)}

        {/* Intersection label */}
        <text x={cx} y={cy-7}  textAnchor="middle" fontSize={12} fontFamily="Manrope" fontWeight={800} fill={MAP_TXT} letterSpacing={2}>{ix.code}</text>
        <text x={cx} y={cy+9}  textAnchor="middle" fontSize={9}  fontFamily="Manrope" fill={MAP_DIM} letterSpacing={1}>SIGNAL SYNC</text>

        {/* Queue badges */}
        {qbadge(cx+rh+24,cy-60,ix.nsQueue)}{qbadge(cx-rh-24,cy+60,ix.nsQueue)}
        {qbadge(cx-80,cy-rh-20,ix.ewQueue)}{qbadge(cx+80,cy+rh+20,ix.ewQueue)}

        {/* Direction labels */}
        <text x={cx}   y={16}   textAnchor="middle" fontSize={12} fontFamily="Manrope" fontWeight={800} fill={MAP_DIM} letterSpacing={2}>N</text>
        <text x={cx}   y={H-5}  textAnchor="middle" fontSize={12} fontFamily="Manrope" fontWeight={800} fill={MAP_DIM} letterSpacing={2}>S</text>
        <text x={14}   y={cy+5} textAnchor="middle" fontSize={12} fontFamily="Manrope" fontWeight={800} fill={MAP_DIM} letterSpacing={2}>W</text>
        <text x={W-14} y={cy+5} textAnchor="middle" fontSize={12} fontFamily="Manrope" fontWeight={800} fill={MAP_DIM} letterSpacing={2}>E</text>

        {/* Legend */}
        {([["Green Phase","#16A34A","#D1FAE5",0],["Yellow Trans.","#CA8A04","#FEF3C7",1],["Red / Stopped","#DC2626","#FEE2E2",2]] as [string,string,string,number][]).map(([l,tc,bg,i])=>(
          <g key={l}>
            <rect x={W-220+i*75} y={H-19} width={12} height={12} rx={2} fill={bg} stroke={tc} strokeWidth={1}/>
            <text x={W-205+i*75} y={H-9} fontSize={10} fontFamily="Manrope" fontWeight={600} fill={MAP_DIM}>{l}</text>
          </g>
        ))}
      </svg>

      {/* Compass only — no device UI overlay */}
      <div style={{
        position:"absolute", top:12, right:12,
        width:36, height:36, borderRadius:"50%",
        background:"rgba(255,255,255,0.92)",
        border:"1px solid rgba(0,0,0,0.12)",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 2px 6px rgba(0,0,0,0.1)",
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22">
          <polygon points="11,2 13,11 11,10 9,11" fill="#DC2626"/>
          <polygon points="11,20 13,11 11,12 9,11" fill="#9CA3AF"/>
          <circle cx={11} cy={11} r={2} fill="#374151"/>
          <text x={11} y={7.5} textAnchor="middle" fontSize={5.5} fontFamily="Manrope" fontWeight={900} fill="white">N</text>
        </svg>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [view,    setView   ] = useState<View>("dashboard");
  const [ixs,     setIxs   ] = useState<Intersection[]>(makeInitial());
  const [selId,   setSelId  ] = useState(1);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick,    setTick   ] = useState(0);
  const [stage,   setStage  ] = useState<SpikeStage>("idle");
  const [clock,   setClock  ] = useState(new Date());
  const tRef = useRef(0);

  useEffect(()=>{ const id=setInterval(()=>setClock(new Date()),1000); return()=>clearInterval(id); },[]);

  useEffect(()=>{
    const id=setInterval(()=>{
      tRef.current+=1; const t=tRef.current; setTick(t);
      setIxs(prev=>prev.map(ix=>{
        let{activeDir:ad,phaseTimer:pt,nsVeh:nv,ewVeh:ev,nsQueue:nq,ewQueue:eq,processed:pr}=ix;
        if(--pt<=0){
          if(ad==="NS"){ad="NS-Y";pt=YDUR;}
          else if(ad==="NS-Y"){ad="EW";pt=adaptGreen(eq,ev);}
          else if(ad==="EW"){ad="EW-Y";pt=YDUR;}
          else{ad="NS";pt=adaptGreen(nq,nv);}
        }
        const na=Math.floor(Math.random()*3)+(ix.spiked?6:1);
        const ea=Math.floor(Math.random()*3)+(ix.spiked?3:1);
        const nd=ad==="NS"?Math.min(nq,Math.floor(Math.random()*4)+3):0;
        const ed=ad==="EW"?Math.min(eq,Math.floor(Math.random()*4)+3):0;
        nq=Math.max(0,nq+na-nd); eq=Math.max(0,eq+ea-ed);
        nv=Math.max(5,Math.min(90,nv+na-nd+(Math.random()>.5?1:-1)));
        ev=Math.max(5,Math.min(90,ev+ea-ed+(Math.random()>.5?1:-1)));
        pr+=nd+ed;
        const wq=(ad==="NS"||ad==="NS-Y")?eq:nq;
        const wv=(ad==="NS"||ad==="NS-Y")?ev:nv;
        return{...ix,activeDir:ad,phaseTimer:pt,nsVeh:Math.round(nv),ewVeh:Math.round(ev),nsQueue:nq,ewQueue:eq,pressure:toPressure(nq+eq,nv+ev),adaptiveGreen:adaptGreen(wq,wv),processed:pr};
      }));
      if(t%2===0){
        setHistory(prev=>{
          const su=stage==="spike"||stage==="detect"||stage==="decide";
          return[...prev,{
            t:String(t),
            thrAdaptive:su?52+Math.round(Math.random()*10):44+Math.round(Math.random()*6),
            thrFixed:   su?31+Math.round(Math.random()*5) :38+Math.round(Math.random()*5),
            queueAdaptive:su?28+Math.round(Math.random()*12):18+Math.round(Math.random()*8),
            queueFixed:   su?78+Math.round(Math.random()*20):24+Math.round(Math.random()*8),
          }].slice(-35);
        });
      }
    },1000);
    return()=>clearInterval(id);
  },[stage]);

  const triggerSpike=useCallback(()=>{
    if(stage!=="idle") return;
    setStage("spike");
    setIxs(prev=>prev.map(ix=>ix.id===1||ix.id===2?{...ix,nsVeh:62+Math.floor(Math.random()*10),nsQueue:28+Math.floor(Math.random()*8),spiked:true}:ix));
    setTimeout(()=>setStage("detect"),4000);
    setTimeout(()=>{ setStage("decide"); setIxs(prev=>prev.map(ix=>ix.spiked?{...ix,nsQueue:Math.max(ix.nsQueue,42),adaptiveGreen:adaptGreen(42,82)}:ix)); },8000);
    setTimeout(()=>setStage("recover"),14000);
    setTimeout(()=>{ setStage("idle"); setIxs(prev=>prev.map(ix=>ix.spiked?{...ix,spiked:false,nsVeh:Math.max(20,ix.nsVeh-30),nsQueue:Math.max(5,ix.nsQueue-25)}:ix)); },35000);
  },[stage]);

  const sel = ixs.find(ix=>ix.id===selId)??ixs[0];
  const tv  = ixs.reduce((s,ix)=>s+ix.nsVeh+ix.ewVeh,0);
  const tq  = ixs.reduce((s,ix)=>s+ix.nsQueue+ix.ewQueue,0);
  const tp  = ixs.reduce((s,ix)=>s+ix.processed,0);
  const ts  = clock.toLocaleTimeString("en-US",{hour12:false});
  const SBL = {idle:"⚡ SIMULATE SPIKE",spike:"↑ SPIKE INCOMING",detect:"⚠ CONGESTION",decide:"⚡ DECISION ACTIVE",recover:"✓ RECOVERING"}[stage];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background:T.bg }}>

      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="header-shadow flex-shrink-0 flex items-center gap-4 px-6"
        style={{ height:64, background:T.hdr }}>

        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background:`${T.blue}14`, border:`1.5px solid ${T.blue}30` }}>
            <svg width="20" height="20" viewBox="0 0 16 16">
              <rect x="4" y="1" width="8" height="14" rx="2.5" fill="rgba(26,115,232,0.12)"/>
              <circle cx="8" cy="4.5"  r="1.8" fill={T.red}/>
              <circle cx="8" cy="8"    r="1.8" fill={T.yellow}/>
              <circle cx="8" cy="11.5" r="1.8" fill={T.green}
                style={{filter:`drop-shadow(0 0 3px ${T.green}80)`}}/>
            </svg>
          </div>
          <div>
            <div className="font-display font-800 text-[20px] leading-none tracking-[0.06em]"
              style={{ color:T.text }}>SIGNAL SYNC</div>
            <div className="font-display text-[11px] tracking-[0.18em]" style={{ color:T.faint }}>
              ADAPTIVE TRAFFIC INTELLIGENCE
            </div>
          </div>
          <div className="flex items-center gap-2 ml-1 rounded-full px-3 py-1"
            style={{ background:"rgba(52,168,83,0.1)", border:"1px solid rgba(52,168,83,0.3)" }}>
            <div className="live-dot w-2 h-2 rounded-full" style={{ background:T.green }}/>
            <span className="font-display font-700 text-[11px] tracking-widest" style={{ color:T.green }}>LIVE</span>
          </div>
        </div>

        {/* View tabs — center */}
        <div className="flex items-center justify-center gap-1 flex-1">
          {(["dashboard","map"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              className="font-display font-700 text-[13px] tracking-[0.1em] px-5 py-2 rounded-xl transition-all"
              style={{
                background:   view===v ? `${T.blue}12` : "transparent",
                color:        view===v ? T.blue : T.dim,
                borderBottom: view===v ? `2px solid ${T.blue}` : "2px solid transparent",
              }}>
              {v==="dashboard" ? "DASHBOARD" : "LIVE MAP"}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Status chips */}
          {[["SYSTEM ONLINE",T.green],["CV ACTIVE",T.green],["ADAPTIVE ON",T.blue]].map(([l,c])=>(
            <div key={l} className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background:`${String(c)}10`, border:`1px solid ${String(c)}25` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background:String(c) }}/>
              <span className="font-display font-600 text-[11px] tracking-wider whitespace-nowrap"
                style={{ color:T.dim }}>{l}</span>
            </div>
          ))}

          <button onClick={triggerSpike} disabled={stage!=="idle"}
            className="font-display font-700 text-[12px] tracking-wider px-4 py-2 rounded-xl border transition-all"
            style={{
              background:  stage==="idle"?`${T.amber}12`:"transparent",
              borderColor: stage==="idle"?`${T.amber}50`:T.border,
              color:       stage==="idle"?T.amber:T.faint,
              cursor:      stage!=="idle"?"not-allowed":"pointer",
            }}>{SBL}</button>

          <div className="text-right border-l pl-3" style={{ borderColor:T.border }}>
            <div className="font-mono-data font-600 text-[16px] leading-none" style={{ color:T.text }}>{ts}</div>
            <div className="font-display text-[10px] tracking-wider" style={{ color:T.faint }}>SYSTEM CLOCK</div>
          </div>
        </div>
      </header>

      {/* ── DASHBOARD VIEW ───────────────────────────────── */}
      {view === "dashboard" && (
        <div className="flex-1 grid overflow-hidden"
          style={{ gridTemplateColumns:"290px 1fr 380px", minHeight:0 }}>

          {/* LEFT — Intersection list */}
          <div className="flex flex-col gap-2.5 p-3 overflow-y-auto border-r" style={{ borderColor:T.border }}>
            <Cap>INTERSECTIONS</Cap>
            {ixs.map(ix=><IxCard key={ix.id} ix={ix} sel={ix.id===selId} onClick={()=>setSelId(ix.id)}/>)}

            {/* System totals */}
            <div className="mt-1 rounded-2xl border p-4 card-shadow card-base" style={{ borderColor:T.border }}>
              <Cap>SYSTEM TOTALS</Cap>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[
                  {l:"VEHICLES", v:String(tv),               c:T.blue},
                  {l:"QUEUE",    v:String(tq),                c:tq>60?T.red:T.dim},
                  {l:"AVG WAIT", v:`${Math.round(tq*1.4)}s`, c:T.amber},
                  {l:"PROCESSED",v:String(tp),                c:T.green},
                ].map(({l,v,c})=>(
                  <div key={l} className="rounded-xl p-3"
                    style={{ background:T.card2, border:`1px solid ${T.border2}` }}>
                    <div className="font-display text-[10px] tracking-[0.12em]" style={{ color:T.faint }}>{l}</div>
                    <div className="font-mono-data font-700 text-3xl leading-none mt-1" style={{ color:c }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER — Signal hero + Decision + Comparison */}
          <div className="flex flex-col gap-2.5 p-3 overflow-hidden border-r" style={{ borderColor:T.border }}>
            <div className="grid grid-cols-2 gap-2.5 flex-shrink-0">
              <SignalPanel ix={sel}/>
              <DecisionPanel ix={sel} stage={stage}/>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <CompTable stage={stage}/>
            </div>
          </div>

          {/* RIGHT — Charts */}
          <div className="flex flex-col gap-2.5 p-3 overflow-hidden min-h-0">
            <ChartCard title="QUEUE LENGTH OVER TIME"
              legend={<><Dot c={T.blue} l="Adaptive"/><Dot c={T.faint} l="Fixed"/></>}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="qag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.blue}  stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={T.blue}  stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="qfg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.faint} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={T.faint} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="t" tick={{fontSize:10,fill:T.faint,fontFamily:"JetBrains Mono"}}/>
                  <YAxis           tick={{fontSize:10,fill:T.faint,fontFamily:"JetBrains Mono"}}/>
                  <Tooltip content={<CTip/>}/>
                  <Area type="monotone" dataKey="queueFixed"    name="Fixed"    stroke={T.faint}  strokeWidth={1.5} fill="url(#qfg)" dot={false}/>
                  <Area type="monotone" dataKey="queueAdaptive" name="Adaptive" stroke={T.blue}   strokeWidth={2}   fill="url(#qag)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="THROUGHPUT OVER TIME"
              legend={<><Dot c={T.green} l="Adaptive"/><Dot c={T.faint} l="Fixed"/></>}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="tag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.green} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={T.green} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="tfg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.faint} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={T.faint} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                  <XAxis dataKey="t" tick={{fontSize:10,fill:T.faint,fontFamily:"JetBrains Mono"}}/>
                  <YAxis           tick={{fontSize:10,fill:T.faint,fontFamily:"JetBrains Mono"}} unit=" v"/>
                  <Tooltip content={<CTip/>}/>
                  <Area type="monotone" dataKey="thrFixed"    name="Fixed"    stroke={T.faint}  strokeWidth={1.5} fill="url(#tfg)" dot={false}/>
                  <Area type="monotone" dataKey="thrAdaptive" name="Adaptive" stroke={T.green}  strokeWidth={2}   fill="url(#tag)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── MAP VIEW ─────────────────────────────────────── */}
      {view === "map" && (
        <div className="flex-1 flex overflow-hidden" style={{ minHeight:0 }}>

          {/* Left — compact intersection selector */}
          <div className="flex flex-col gap-2.5 p-3 overflow-y-auto border-r flex-shrink-0"
            style={{ width:260, borderColor:T.border }}>
            <Cap>SELECT INTERSECTION</Cap>
            {ixs.map(ix=><IxCard key={ix.id} ix={ix} sel={ix.id===selId} onClick={()=>setSelId(ix.id)}/>)}
          </div>

          {/* Center — full map, edge-to-edge, no device frame */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <TrafficMap ix={sel}/>
          </div>

          {/* Right — signal status for selected */}
          <div className="flex flex-col gap-2.5 p-3 overflow-y-auto border-l flex-shrink-0"
            style={{ width:300, borderColor:T.border }}>
            <Cap>SIGNAL STATUS</Cap>
            <SignalPanel ix={sel}/>
            <Cap>CONTROLLER</Cap>
            <DecisionPanel ix={sel} stage={stage}/>
          </div>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="flex-shrink-0 flex items-center justify-between px-6 border-t"
        style={{ height:34, borderColor:T.border, background:T.hdr }}>
        <span className="font-display text-[11px] tracking-widest" style={{ color:T.faint }}>
          SIGNAL SYNC v1.0 · COMPUTER VISION ADAPTIVE SIGNAL CONTROL · HACKATHON DEMO
        </span>
        <div className="flex items-center gap-5">
          {([["CV ENGINE",T.green],["CONTROLLER",T.green],[`TICK ${tick}`,T.blue]] as [string,string][]).map(([l,c])=>(
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background:c }}/>
              <span className="font-display text-[11px] tracking-widest" style={{ color:c }}>{l}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────
function Cap({ children }: { children: React.ReactNode }) {
  return <div className="font-display font-700 text-[11px] tracking-[0.18em] uppercase mb-1" style={{ color:T.faint }}>{children}</div>;
}
function Dot({ c, l }: { c:string; l:string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ background:c }}/>
      <span className="font-display text-[11px]" style={{ color:T.faint }}>{l}</span>
    </div>
  );
}
