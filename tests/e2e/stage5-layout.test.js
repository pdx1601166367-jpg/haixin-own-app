const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { openApp, freshApp } = require('./helpers');

function rectsOverlap(a, b) {
  return !(a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 ||
    a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5);
}

describe('校招卡片布局', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  it('长文本卡片中操作按钮不与文本重叠，按钮之间也不重叠', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.campus.records.push({
        id: 'r1',
        company: '这是一家名字非常长的公司用来测试校招卡片布局是否正常换行',
        position: '产品经理（校招）',
        appliedAt: '2026-08-10',
        status: 'interview',
        nextAction: '准备二面材料并复习项目经历',
        deadline: '2026-08-15',
        timeline: [],
        note: '这是一段比较长的备注文本，用于确认文本区域和操作按钮不会重叠。'
      });
      LifeApp.store.save();
    });
    await page.locator('[data-module="campus"]').click();
    const card = page.locator('.campus-card').first();
    const main = await card.locator('.campus-card-head .list-row-main').boundingBox();
    const actions = await card.locator('.campus-card-head .row-actions').boundingBox();
    assert.equal(rectsOverlap(main, actions), false, '文本与操作按钮重叠');
    const buttons = await card.locator('.campus-card-head .row-actions .btn').evaluateAll((els) => {
      return els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
    });
    assert.equal(buttons.length, 3);
    for (let i = 1; i < buttons.length; i += 1) {
      assert.equal(rectsOverlap(buttons[i - 1], buttons[i]), false, '按钮之间重叠');
    }
  });
});
