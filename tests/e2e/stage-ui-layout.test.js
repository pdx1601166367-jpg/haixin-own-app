const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

describe('UI 布局稳定性', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('首页摘要卡片 hover 前后位置和尺寸不变', async () => {
    await freshApp(page);
    const card = page.locator('.summary-card').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
    const before = await card.boundingBox();
    await card.hover();
    const after = await card.boundingBox();
    assert.deepEqual(after, before);
  });

  it('按钮 hover 前后位置和尺寸不变', async () => {
    await freshApp(page);
    await page.locator('[data-module="plan"]').click();
    const button = page.locator('[data-action="add-task"]').first();
    await button.scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
    const before = await button.boundingBox();
    await button.hover();
    const after = await button.boundingBox();
    assert.deepEqual(after, before);
  });

  it('日历格子 hover 前后位置和尺寸不变', async () => {
    await freshApp(page);
    await page.locator('[data-module="diet"]').click();
    const cell = page.locator('[data-cal-date]').first();
    await cell.scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
    const before = await cell.boundingBox();
    await cell.hover();
    const after = await cell.boundingBox();
    assert.deepEqual(after, before);
  });

  it('三种外观下选中导航项与普通导航项尺寸一致', async () => {
    await freshApp(page);
    for (const appearance of ['liquid', 'notebook', 'neo']) {
      await page.locator('[data-module="settings"]').click();
      await page.locator(`[data-setting="appearance"] [data-value="${appearance}"]`).click();
      await page.locator('[data-module="home"]').click();
      const heights = await page.locator('.nav-item').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
      const widths = await page.locator('.nav-item').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
      assert.equal(new Set(heights).size, 1, appearance + ' 导航高度不一致');
      assert.equal(new Set(widths).size, 1, appearance + ' 导航宽度不一致');
    }
  });

  it('任务备注位于任务主内容区内', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.plans[LifeApp.store.todayKey()] = [{ id: 't1', title: '带备注任务', time: '09:00', priority: 'medium', source: '', done: false, status: 'todo', estimatedMinutes: 30, notes: '这是备注' }];
      LifeApp.store.save();
    });
    await page.locator('[data-module="plan"]').click();
    const inside = await page.locator('.task-note').evaluate((el) => el.parentElement.classList.contains('list-row-main'));
    assert.equal(inside, true);
  });

  it('顶部搜索按钮位于搜索框右侧且垂直对齐', async () => {
    await freshApp(page);
    const inputBox = await page.locator('#top-search-input').boundingBox();
    const buttonBox = await page.locator('#global-search-btn').boundingBox();
    assert.ok(buttonBox.x >= inputBox.x + inputBox.width - 1);
    assert.ok(buttonBox.x - (inputBox.x + inputBox.width) <= 12);
    assert.ok(Math.abs((buttonBox.y + buttonBox.height / 2) - (inputBox.y + inputBox.height / 2)) < 2);
  });

  it('流光玻璃：面板半透明、背景模糊、使用柔和壁纸', async () => {
    await freshApp(page);
    await page.waitForTimeout(400);
    const material = await page.evaluate(() => {
      const panel = document.querySelector('.panel');
      const style = getComputedStyle(panel);
      const before = getComputedStyle(document.body, '::before');
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      return {
        color: style.backgroundColor,
        blur: style.backdropFilter,
        wall: before.backgroundImage,
        wallFilter: before.filter,
        bodyBg: bodyBg
      };
    });
    assert.ok(colorAlphaToNumber(material.color) < 1);
    assert.match(String(material.blur), /blur/);
    assert.match(material.wall, /acrylic-cool\.webp/);
    assert.match(material.wallFilter, /saturate/);
    assert.ok(isLightColor(material.bodyBg));
  });

  it('笔记：面板轻度半透明毛玻璃，统计数字使用红蓝绿', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-setting="appearance"] [data-value="notebook"]').click();
    await page.waitForTimeout(400);
    const material = await page.evaluate(() => {
      const panel = document.querySelector('.panel');
      const style = getComputedStyle(panel);
      const numColor = getComputedStyle(document.querySelector('.stat-card .num')).color;
      return {
        color: style.backgroundColor,
        blur: style.backdropFilter,
        numColor: numColor
      };
    });
    assert.ok(colorAlphaToNumber(material.color) < 1);
    assert.match(String(material.blur), /blur/);
    assert.ok(['rgb(214, 64, 69)', 'rgb(52, 116, 179)', 'rgb(56, 128, 88)'].includes(material.numColor));
  });

  it('笔记：主按钮黑底白字，普通按钮白底深色文字', async () => {
    await freshApp(page);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-setting="appearance"] [data-value="notebook"]').click();
    await page.waitForTimeout(400);
    const colors = await page.evaluate(() => {
      const primary = getComputedStyle(document.querySelector('.btn-primary'));
      const normal = getComputedStyle(document.querySelector('.btn:not(.btn-primary)'));
      return {
        primaryBg: primary.backgroundColor,
        primaryColor: primary.color,
        normalBg: normal.backgroundColor,
        normalColor: normal.color
      };
    });
    assert.equal(colors.primaryBg, 'rgb(34, 34, 34)');
    assert.equal(colors.primaryColor, 'rgb(255, 255, 255)');
    assert.equal(colors.normalBg, 'rgb(255, 255, 255)');
    assert.equal(colors.normalColor, 'rgb(47, 47, 43)');
  });

  it('导航图标使用多色 2.5D 撞色设计', async () => {
    await freshApp(page);
    const colors = await page.locator('.nav-icon svg').first().evaluate((svg) => {
      const values = Array.from(svg.querySelectorAll('[fill],[stroke]')).map((el) => el.getAttribute('fill') || el.getAttribute('stroke'));
      return Array.from(new Set(values)).filter(Boolean);
    });
    assert.ok(colors.length >= 2);
    assert.ok(colors.some((c) => c === '#f08a3c' || c === '#7d93a8' || c === '#343a40' || c === '#eef1f3'));
  });
});

function colorAlphaToNumber(color) {
  const match = String(color).match(/rgba?\(([^)]+)\)/);
  if (!match) return 1;
  const parts = match[1].split(',').map((s) => Number(s.trim()));
  return parts.length === 4 ? parts[3] : 1;
}

function isLightColor(color) {
  const match = String(color).match(/rgba?\(([^)]+)\)/);
  if (!match) return true;
  const parts = match[1].split(',').map((s) => Number(s.trim()));
  return (parts[0] + parts[1] + parts[2]) / 3 > 200;
}
