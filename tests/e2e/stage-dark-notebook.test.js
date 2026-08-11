const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

function luminance(color) {
  const match = String(color).match(/rgba?\(([^)]+)\)/);
  if (!match) return 0;
  const parts = match[1].split(',').map((s) => Number(s.trim()));
  return (parts[0] + parts[1] + parts[2]) / 3;
}

describe('笔记外观深色模式对比度', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  async function switchToDarkNotebook() {
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-setting="appearance"] [data-value="notebook"]').click();
    await page.locator('[data-setting="theme"] [data-value="dark"]').click();
    await page.waitForTimeout(400);
  }

  it('卡片背景与页面背景有明显亮度差，标题文字为亮色', async () => {
    await freshApp(page);
    await switchToDarkNotebook();
    await page.waitForFunction(() => {
      const panel = getComputedStyle(document.querySelector('.panel'));
      const body = getComputedStyle(document.body);
      const heading = getComputedStyle(document.querySelector('.panel-head h2, .panel-head h3'));
      const lum = (c) => {
        const m = String(c).match(/\d+/g);
        return m && m.length >= 3 ? (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3 : 0;
      };
      return lum(panel.backgroundColor) - lum(body.backgroundColor) >= 10 && lum(heading.color) > 180;
    }, undefined, { timeout: 8000 });
    const values = await page.evaluate(() => {
      const panel = getComputedStyle(document.querySelector('.panel'));
      const body = getComputedStyle(document.body);
      const heading = getComputedStyle(document.querySelector('.panel-head h2, .panel-head h3'));
      return { panelBg: panel.backgroundColor, bodyBg: body.backgroundColor, headingColor: heading.color };
    });
    assert.ok(luminance(values.panelBg) - luminance(values.bodyBg) >= 10, '卡片与背景亮度差不足');
    assert.ok(luminance(values.headingColor) > 180, '卡片标题亮度不足');
  });

  it('主按钮在深色背景下反白为浅底深字', async () => {
    await freshApp(page);
    await switchToDarkNotebook();
    await page.waitForFunction(() => {
      const primary = getComputedStyle(document.querySelector('.btn-primary'));
      const lum = (c) => {
        const m = String(c).match(/\d+/g);
        return m && m.length >= 3 ? (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3 : 0;
      };
      return lum(primary.backgroundColor) > 150 && lum(primary.color) < 100;
    }, undefined, { timeout: 8000 });
    const values = await page.evaluate(() => {
      const primary = getComputedStyle(document.querySelector('.btn-primary'));
      return { bg: primary.backgroundColor, color: primary.color };
    });
    assert.ok(luminance(values.bg) > 150, '主按钮背景不是浅色');
    assert.ok(luminance(values.color) < 100, '主按钮文字不是深色');
  });

  it('普通按钮在深色背景下与背景可区分', async () => {
    await freshApp(page);
    await switchToDarkNotebook();
    await page.waitForFunction(() => {
      const normal = getComputedStyle(document.querySelector('.btn:not(.btn-primary)'));
      const body = getComputedStyle(document.body);
      const lum = (c) => {
        const m = String(c).match(/\d+/g);
        return m && m.length >= 3 ? (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3 : 0;
      };
      return lum(normal.backgroundColor) - lum(body.backgroundColor) >= 15;
    }, undefined, { timeout: 8000 });
    const values = await page.evaluate(() => {
      const normal = getComputedStyle(document.querySelector('.btn:not(.btn-primary)'));
      const body = getComputedStyle(document.body);
      return { bg: normal.backgroundColor, bodyBg: body.backgroundColor };
    });
    assert.ok(luminance(values.bg) - luminance(values.bodyBg) >= 15, '普通按钮与背景亮度差不足');
  });
});
