import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:1280,height:1000} });
p.on('console', m => { if (m.text().includes('[voice]')) console.log('PAGE:', m.text()); });
await p.goto('http://localhost:4200/', { waitUntil:'networkidle' });
await p.waitForTimeout(4000);
await b.close();
