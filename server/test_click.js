const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

async function testClick() {
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
            id: 20,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (function() {
                  const allEls = Array.from(document.querySelectorAll('div[tabindex="0"]'));
                  // Find the one for Explorer
                  const explorerBtn = allEls.find(el => el.innerText && el.innerText.trim() === 'Explorer') || allEls.find(el => el.innerText && el.innerText.includes('Explorer'));
                  if (!explorerBtn) return 'Explorer button not found';

                  const rect = explorerBtn.getBoundingClientRect();
                  console.log('Button rect:', rect.left, rect.top, rect.width, rect.height);

                  const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: rect.left + 5, clientY: rect.top + 5 });
                  const up = new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: rect.left + 5, clientY: rect.top + 5 });
                  explorerBtn.dispatchEvent(down);
                  explorerBtn.dispatchEvent(up);
                  return 'Dispatched pointer events on ' + explorerBtn.innerText;
                })()
              `
            }
          }));

          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 21,
              method: 'Runtime.evaluate',
              params: {
                expression: 'window.location.href'
              }
            }));
          }, 1000);

          setTimeout(() => {
            edge.kill();
            process.exit(0);
          }, 2500);
        }, 2000);
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => JSON.stringify(a)).join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', JSON.stringify(msg.params.exceptionDetails));
        } else if (msg.id === 20) {
          console.log('[POINTER EVENT RESULT]:', msg.result.result.value);
        } else if (msg.id === 21) {
          console.log('[LOCATION AFTER CLICK]:', msg.result.result.value);
        }
      });
    });
  }).on('error', (e) => {
    console.error("HTTP error:", e.message);
    edge.kill();
  });
}

testClick();
