Refine the existing "Signal Sync / D-Traffic" dashboard design for a hackathon demonstration.

IMPORTANT:
Do NOT redesign the dashboard from scratch.
Preserve the current dark traffic-control-center aesthetic, overall 3-column layout, branding, typography style, and technical visual language.

The goal is to improve information hierarchy, readability, and storytelling while keeping the existing design recognizable.

CORE STORY OF THE DASHBOARD:

TRAFFIC IS UNEVEN
→ SYSTEM DETECTS CONGESTION
→ SYSTEM MAKES AN ADAPTIVE SIGNAL DECISION
→ GREEN TIME IS REALLOCATED
→ QUEUES DECREASE
→ ADAPTIVE CONTROL OUTPERFORMS FIXED-TIME CONTROL

Make this story visually obvious.

--------------------------------------------------
1. HEADER
--------------------------------------------------

Keep the existing header.

Improve it slightly so it clearly communicates:

SIGNAL SYNC
Adaptive Traffic Intelligence

● SYSTEM ONLINE
● CV STREAM ACTIVE
● CONTROLLER ACTIVE

Keep the status indicators compact.

Keep the live clock if space permits.

Change the main demo button to:

⚡ SIMULATE TRAFFIC SPIKE

This should be clearly visible but should not dominate the header.

--------------------------------------------------
2. LEFT PANEL — INTERSECTIONS
--------------------------------------------------

Keep the existing intersection list.

Show 4 intersections:

INT-01
INT-02
INT-03
INT-04

Each intersection card should prioritize:

- intersection name
- current vehicle count
- queue length
- current signal state
- remaining green time

Example:

INT-01
Main St × 1st Ave

VEHICLES     80
QUEUE        31
SIGNAL       🟢 N–S
REMAINING    18s

Make the currently selected intersection visually distinct.

Do not overload each card with too many numbers.

--------------------------------------------------
3. CENTER — LIVE TRAFFIC MAP
--------------------------------------------------

Make this the primary visual focus.

Clearly visualize a 4-way intersection:

             NORTH
               ↑
               │
WEST ←──────── 🚦 ────────→ EAST
               │
               ↓
             SOUTH

Show:

- traffic flow direction
- vehicles
- queues
- traffic density
- traffic lights
- active signal phase

Use a clean 2D/SVG-style visualization.

Traffic density should be visually obvious:

LOW
MEDIUM
HIGH

Use the existing visual language.

The intersection should feel alive but remain clean and readable.

Vehicles may be represented as small dots or simple vehicle shapes.

Do NOT create a photorealistic traffic simulation.

--------------------------------------------------
4. ADAPTIVE DECISION PANEL
--------------------------------------------------

Add a prominent panel near the traffic visualization called:

ADAPTIVE SIGNAL DECISION

It should explain what the controller is doing.

Example:

⚠ EASTBOUND HIGH TRAFFIC

Queue        42 vehicles
Waiting      58 sec

GREEN TIME
30s  →  48s

+18s allocated

The important visual relationship is:

TRAFFIC CONDITION
        ↓
CONTROLLER DECISION
        ↓
GREEN-TIME CHANGE

Use placeholder values only.

Do not imply that these numbers are real measured results.

--------------------------------------------------
5. SIGNAL STATUS
--------------------------------------------------

Make the active signal phase extremely easy to understand.

Example:

🟢 NORTH–SOUTH
18 sec remaining

Clearly distinguish:

GREEN = active movement
YELLOW = transition
RED = stopped

Do not rely only on tiny colored dots.

--------------------------------------------------
6. KEY METRICS
--------------------------------------------------

Keep a compact row of high-value metrics.

Prioritize:

VEHICLES
QUEUE LENGTH
AVG WAIT TIME
THROUGHPUT

Avoid adding many additional KPI cards.

The numbers should be large enough to read easily on a projector.

--------------------------------------------------
7. FIXED VS ADAPTIVE COMPARISON
--------------------------------------------------

Make this one of the most important analytical sections.

Compare only:

- Average waiting time
- Queue length
- Travel time
- Throughput

Example structure:

                 FIXED      ADAPTIVE

WAIT TIME        74s   →     43s
QUEUE            31    →     17
TRAVEL TIME      9.4m  →     7.1m
THROUGHPUT       412   →     468

Use placeholder values.

Clearly show improvement direction.

Do not create fake percentage claims.

--------------------------------------------------
8. SUPPORTING CHARTS
--------------------------------------------------

Keep only the highest-value charts.

Recommended:

A. Queue length over time

B. Throughput over time

C. Fixed vs Adaptive comparison

Avoid excessive charts.

Every chart must have:

- clear title
- readable axis labels
- units
- simple legend
- minimal visual clutter

The dashboard should NOT look like a collection of random graphs.

--------------------------------------------------
9. TRAFFIC SPIKE DEMONSTRATION
--------------------------------------------------

The "SIMULATE TRAFFIC SPIKE" action should support a clear visual story.

Design the interface so the following sequence can be represented:

NORMAL TRAFFIC

↓

TRAFFIC SPIKE

↓

⚠ HIGH CONGESTION DETECTED

↓

ADAPTIVE SIGNAL DECISION

↓

GREEN TIME EXTENDED

↓

QUEUE DECREASES

For example:

EASTBOUND
32 vehicles
      ↓
67 vehicles
      ↓
94 vehicles

Then:

GREEN TIME
30s → 48s

Then:

QUEUE
94 → 72 → 48 → 29

Use placeholder/demo values.

--------------------------------------------------
10. VISUAL HIERARCHY
--------------------------------------------------

Prioritize the dashboard in this order:

1. Live Traffic Map
2. Current congestion/problem
3. Adaptive Signal Decision
4. Signal status
5. Key traffic metrics
6. Fixed vs Adaptive performance
7. Supporting historical charts

Do not allow secondary charts or tiny numbers to compete with the traffic map.

--------------------------------------------------
11. PROJECTOR / HACKATHON READABILITY
--------------------------------------------------

Optimize the interface for a laptop connected to a projector.

Important information must be readable from several meters away.

Increase the size and contrast of:

- vehicle counts
- queue lengths
- signal state
- remaining green time
- adaptive decision
- fixed vs adaptive results

Secondary telemetry may remain smaller.

--------------------------------------------------
12. VISUAL STYLE
--------------------------------------------------

Preserve the current:

- dark background
- cyan/teal data visualization
- green for active/improvement
- red for congestion
- amber for warnings
- technical traffic-management aesthetic
- restrained glow effects

Avoid:

- excessive glassmorphism
- excessive neon
- unnecessary gradients
- giant AI/robot imagery
- decorative elements without informational purpose
- excessive animations
- clutter

The result should look like a credible intelligent traffic-management system rather than a generic "AI dashboard."

--------------------------------------------------
13. IMPORTANT DATA PRINCIPLE
--------------------------------------------------

The UI must be designed around data that can realistically come from the backend.

Likely data:

- vehicle count
- queue length
- waiting time
- signal state
- remaining green time
- allocated green time
- throughput
- traffic density
- intersection ID
- timestamp

Do not add UI elements requiring data that the backend may not provide.

--------------------------------------------------
14. FINAL DESIGN GOAL
--------------------------------------------------

A hackathon judge should be able to look at the dashboard for approximately 5 seconds and understand:

"There is heavy traffic on this approach.
The system detected it.
The adaptive controller changed the signal timing.
The queue is being reduced.
The adaptive strategy performs better than fixed timing."

Keep the design polished, technically credible, visually impressive, and easy to understand.

Do not redesign the entire interface.
Refine the existing Figma design.