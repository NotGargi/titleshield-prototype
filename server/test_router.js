const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

async function testRouter() {
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
            id: 30,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (function() {
                  // Let's see what buttons or links exist in DOM
                  const buttons = Array.from(document.querySelectorAll('*')).filter(el => {
                    const role = el.getAttribute('role');
                    const tabIndex = el.getAttribute('tabindex');
                    return role === 'button' || tabIndex === '0' || el.tagName === 'A' || el.tagName === 'BUTTON';
                  });
                  return JSON.stringify(buttons.map(b => ({
                    tag: b.tagName,
                    role: b.getAttribute('role'),
                    text: (b.innerText || '').slice(0, 30),
                    hasHref: b.getAttribute('href')
                  })));
                })()
              `
            }
          }));
        }, 2000);
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 30) {
          console.log('[BUTTONS IN DOM]:', msg.result.result.value);
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

testRouter();
