[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Demo](https://img.shields.io/badge/demo-live-green)](https://neofrees.github.io/MilliMindMap/)

# MilliMindMap

A polished business-finance mind-map for planning profit centers and rolling over earnings. Build connected revenue and expense nodes, visualize flows, and manage retained earnings on a single professional canvas.

Live demo: https://neofrees.github.io/MilliMindMap/  

## Features

- Create nodes for Revenue, Expense, Asset, Liability, and Retained Earnings
- Drag-and-drop layout with persistent workspace (localStorage)
- Connect nodes to express flows and dependencies
- Real-time financial summary (Revenue / Expenses / Net Profit / Retained Earnings)
- Export/Import workspace as JSON for backups or sharing
- Progressive Web App (PWA) ready — installable on supported browsers

## Quick start

1. Clone the repo:

   git clone https://github.com/NeoFrees/MilliMindMap.git
2. Open `index.html` in your browser, or enable GitHub Pages for the repo to host the app at the demo link above.

Optional (local server):

- With Node: `npx http-server` or run `python -m http.server` in the repo root to serve files locally.

## Usage

- Click "Add Business Item" to create a node and choose its type and amount
- Use "Connect Nodes" to create visual links between items
- "Rollover Profit" applies net profit to retained earnings
- Export/Import to save or transfer workspace state

## Development

- Static app (HTML/CSS/JS). Edit `app.js` and `styles.css` to extend functionality.
- Contributions welcome — open an issue or PR.

## License

MIT — see LICENSE for details.

---

If you want a demo screenshot or GIF in the README, add an image (e.g., `screenshot.png`) to the repo and it will be displayed here.