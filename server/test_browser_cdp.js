const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

async function testBrowser() {
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
            id: 10,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                JSON.stringify({
                  url: window.location.href,
                  title: document.title,
                  hasRoot: !!document.getElementById('root'),
                  bodyTextLength: document.body.innerText.length,
                  bodyTextSnippet: document.body.innerText.slice(0, 300)
                })
              `
            }
          }));
        }, 3000);
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('[CONSOLE]', msg.params.type, msg.params.args.map(a => JSON.stringify(a)).join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[EXCEPTION]', JSON.stringify(msg.params.exceptionDetails));
        } else if (msg.id === 10) {
          console.log('[EVAL 10 RESULT]', msg.result);
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

testBrowser();
