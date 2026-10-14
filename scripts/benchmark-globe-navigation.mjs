import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Run against the already-built preview, keeping the exact same input sequence
// for before/after measurements. This does not start or replace a server.
// node scripts/benchmark-globe-navigation.mjs --output docs/globe-navigation-after.json
// Optional: --base-url http://127.0.0.1:4174 --dpr 1,2 --duration 1300
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const output = resolve(option('--output', 'docs/globe-navigation-after.json'));
const baseUrl = option('--base-url', 'http://127.0.0.1:4174');
const deviceScaleFactors = option('--dpr', '1,2').split(',').map(Number);
const sampleDurationMs = Number(option('--duration', '1300'));
if (!deviceScaleFactors.every(dpr => Number.isFinite(dpr) && dpr > 0) || !(sampleDurationMs > 0)) {
  throw new Error('The DPR and duration arguments must be positive numbers.');
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const deviceScaleFactor of deviceScaleFactors) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor,
      reducedMotion: 'no-preference',
    });
    try {
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto(`${baseUrl}/?benchmark=1#/explore`);
      await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.renderFrames) >= 1);
      await page.waitForFunction(() => document.querySelector('canvas')?.dataset.cameraMoving === 'false');
      // Offscreen recommendation cards intentionally use loading="lazy". Warm
      // the globe's photo markers without waiting forever for those cards.
      await page.waitForFunction(() => [...document.querySelectorAll('.globe-fish-pin img')].every(image => image.complete));
      const initial = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const box = element => {
          const rect = element?.getBoundingClientRect();
          return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
        };
        return {
          url: location.href,
          userAgent: navigator.userAgent,
          photoPinCount: document.querySelectorAll('.globe-fish-pin').length,
          renderFrames: Number(canvas.dataset.renderFrames),
          canvasBuffer: { width: canvas.width, height: canvas.height },
          canvasBox: box(canvas),
          stageBox: box(document.querySelector('.globe-stage')),
          cameraDistance: Number(canvas.dataset.cameraDistance),
          scripts: [...document.scripts].map(script => script.src).filter(Boolean),
        };
      });
      if (initial.photoPinCount !== 183) {
        throw new Error(`Expected all 183 fish in the default globe, found ${initial.photoPinCount}.`);
      }

      async function measure(name, action) {
        await page.evaluate(({ duration, name }) => {
          const canvas = document.querySelector('canvas');
          const round = number => Math.round(number * 100) / 100;
          const box = element => {
            const rect = element?.getBoundingClientRect();
            return rect ? { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) } : null;
          };
          const startRenderFrames = Number(canvas.dataset.renderFrames);
          const before = {
            canvasBuffer: { width: canvas.width, height: canvas.height },
            canvasBox: box(canvas),
            stageBox: box(document.querySelector('.globe-stage')),
            cameraDistance: Number(canvas.dataset.cameraDistance),
          };
          let inputStart = null;
          let lastFrame = null;
          let animationFrame;
          let timer;
          let finished = false;
          let resolveResult;
          const intervals = [];
          const inputs = [];
          const cameraChanges = [];
          const bufferChanges = [];
          const canvasLayoutChanges = [];
          const longTasks = [];
          let bufferWidth = canvas.width;
          let bufferHeight = canvas.height;
          let layoutWidth = round(canvas.getBoundingClientRect().width);
          let layoutHeight = round(canvas.getBoundingClientRect().height);

          const relative = () => inputStart === null ? null : round(performance.now() - inputStart);
          const bufferSample = () => {
            if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
              bufferWidth = canvas.width;
              bufferHeight = canvas.height;
              bufferChanges.push({ atMs: relative(), width: bufferWidth, height: bufferHeight });
            }
          };
          const mutationObserver = new MutationObserver(mutations => {
            if (inputStart === null) return;
            bufferSample();
            if (mutations.some(mutation => mutation.attributeName === 'data-camera-moving')) {
              cameraChanges.push({ atMs: relative(), moving: canvas.dataset.cameraMoving === 'true' });
            }
          });
          mutationObserver.observe(canvas, { attributes: true, attributeFilter: ['width', 'height', 'data-camera-moving'] });
          const resizeObserver = new ResizeObserver(() => {
            if (inputStart === null) return;
            const rect = canvas.getBoundingClientRect();
            const width = round(rect.width);
            const height = round(rect.height);
            if (width !== layoutWidth || height !== layoutHeight) {
              layoutWidth = width;
              layoutHeight = height;
              canvasLayoutChanges.push({ atMs: relative(), width, height });
            }
            bufferSample();
          });
          resizeObserver.observe(canvas);
          const longTaskSupported = PerformanceObserver.supportedEntryTypes.includes('longtask');
          const performanceObserver = longTaskSupported ? new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (inputStart !== null && entry.startTime >= inputStart) {
                longTasks.push({ atMs: round(entry.startTime - inputStart), durationMs: round(entry.duration) });
              }
            }
          }) : null;
          performanceObserver?.observe({ type: 'longtask', buffered: false });

          const finish = () => {
            if (finished) return;
            finished = true;
            cancelAnimationFrame(animationFrame);
            clearTimeout(timer);
            mutationObserver.disconnect();
            resizeObserver.disconnect();
            performanceObserver?.disconnect();
            document.removeEventListener('click', inputEvent, true);
            document.removeEventListener('keydown', inputEvent, true);
            bufferSample();
            const now = performance.now();
            const sorted = [...intervals].sort((a, b) => a - b);
            const percentile = fraction => sorted.length ? round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]) : null;
            const cameraEnded = cameraChanges.filter(change => !change.moving).at(-1);
            const actualDuration = inputStart === null ? 0 : now - inputStart;
            const renderFrames = Number(canvas.dataset.renderFrames) - startRenderFrames;
            resolveResult({
              name,
              durationMs: round(actualDuration),
              inputs,
              raf: { sampleCount: intervals.length, medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: percentile(1) },
              renderedCanvasFrames: renderFrames,
              renderedCanvasFpsDuringSample: actualDuration ? round(renderFrames / actualDuration * 1000) : null,
              longTasks: { supported: longTaskSupported, count: longTasks.length, totalDurationMs: round(longTasks.reduce((total, task) => total + task.durationMs, 0)), entries: longTasks },
              canvasDrawingBufferChanges: { count: bufferChanges.length, entries: bufferChanges },
              canvasLayoutChanges: { count: canvasLayoutChanges.length, entries: canvasLayoutChanges },
              camera: {
                transitions: cameraChanges,
                lastSettledAfterFirstInputMs: cameraEnded?.atMs ?? null,
                lastSettledAfterLastInputMs: cameraEnded && inputs.length ? round(cameraEnded.atMs - inputs.at(-1).atMs) : null,
                stillMovingAtEnd: canvas.dataset.cameraMoving === 'true',
                targetFish: canvas.dataset.cameraTargetFish,
                distance: Number(canvas.dataset.cameraDistance),
              },
              before,
              after: {
                url: location.href,
                activeFish: canvas.dataset.activeFish,
                canvasBuffer: { width: canvas.width, height: canvas.height },
                canvasBox: box(canvas),
                stageBox: box(document.querySelector('.globe-stage')),
                readerBox: box(document.querySelector('.explore-reader')),
                canvasOverflow: document.documentElement.scrollWidth > innerWidth,
                photoPinCount: document.querySelectorAll('.globe-fish-pin').length,
                readerCounter: document.querySelector('.reader-counter')?.textContent?.trim(),
              },
            });
          };
          const inputEvent = event => {
            if (finished) return;
            if (inputStart === null) {
              inputStart = performance.now();
              lastFrame = inputStart;
              timer = setTimeout(finish, duration);
            }
            inputs.push({ atMs: relative(), type: event.type, key: event.key ?? null, fish: event.target.closest?.('[data-fish-id]')?.dataset.fishId ?? null });
          };
          document.addEventListener('click', inputEvent, true);
          document.addEventListener('keydown', inputEvent, true);
          const frame = now => {
            if (inputStart !== null) {
              intervals.push(now - lastFrame);
              lastFrame = now;
            }
            animationFrame = requestAnimationFrame(frame);
          };
          animationFrame = requestAnimationFrame(frame);
          window.__globeNavigationSample = { result: new Promise(resolve => { resolveResult = resolve; }), finish };
        }, { duration: sampleDurationMs, name });
        await action();
        const sample = await page.evaluate(() => window.__globeNavigationSample.result);
        console.log(JSON.stringify({ dpr: deviceScaleFactor, operation: name, raf: sample.raf, renderFrames: sample.renderedCanvasFrames, bufferChanges: sample.canvasDrawingBufferChanges.count, longTasks: sample.longTasks.count, settledMs: sample.camera.lastSettledAfterFirstInputMs }));
        return sample;
      }

      const betta = page.locator('.globe-fish-pin[data-fish-id="betta-splendens"]');
      await betta.waitFor({ state: 'visible' });
      const operations = [];
      operations.push(await measure('open-betta-reader', () => betta.click()));
      await page.getByRole('region', { name: '鱼类详情浏览', exact: true }).waitFor({ state: 'visible' });
      operations.push(await measure('next-fish-arrow-right', () => page.keyboard.press('ArrowRight')));
      operations.push(await measure('rapid-next-fish-three-arrows', async () => {
        for (let index = 0; index < 3; index++) {
          await page.keyboard.press('ArrowRight');
          if (index < 2) await page.waitForTimeout(80);
        }
      }));
      operations.push(await measure('close-reader-escape', () => page.keyboard.press('Escape')));
      await page.getByRole('region', { name: '鱼类详情浏览', exact: true }).waitFor({ state: 'hidden' });
      results.push({ profile: `Desktop Chrome headless, DPR ${deviceScaleFactor}, no CPU or network throttling`, deviceScaleFactor, viewport: page.viewportSize(), initial, operations, pageErrors });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({
  measuredAt: new Date().toISOString(),
  browser: 'Google Chrome, Playwright independent headless contexts',
  sampleCountPerOperationPerProfile: 1,
  sampleDurationMs,
  inputSequence: ['click betta-splendens globe pin', 'ArrowRight', 'ArrowRight x 3, 80 ms between inputs', 'Escape'],
  note: 'One local browser sample per operation, not evidence for all devices. RAF intervals measure main-thread animation scheduling; canvas frame counts come from the actual Three.js renderer counter. Drawing-buffer changes are observed from real canvas width/height attributes, independently of CSS layout changes. All 183 fish remain present and no filter is applied. No CPU or network throttling.',
  results,
}, null, 2)}\n`);
console.log(`Saved ${output}`);
