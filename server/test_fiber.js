const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

async function testInspectRouter() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    'http://localhost:8081'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://localhost:9222/json', (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      const tabs = JSON.parse(raw);
      const appTab = tabs.find(t => t.url && t.url.includes('8081')) || tabs[0];
      const ws = new WebSocket(appTab.webSocketDebuggerUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));

        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 40,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (function() {
                  // Find any react internal fibers to find the router or click handler
                  const root = document.getElementById('root');
                  const keys = Object.keys(root);
                  const reactKey = keys.find(k => k.startsWith('__reactContainer') || k.startsWith('__reactFiber'));
                  return 'React root key: ' + reactKey;
                })()
              `
            }
          }));
        }, 1500);
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 40) {
          console.log('[REACT FIBER]:', msg.result.result.value);
          edge.kill();
          process.exit(0);
        }
      });
    });
  }).on('error', (e) => {
    console.error("HTTP error:", e.message);
    edge.kill();
  });
}

testInspectRouter();
