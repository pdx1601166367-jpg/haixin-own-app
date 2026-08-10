const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { openApp, freshApp } = require('./helpers');

describe('阶段 10：数据与设置、备份恢复', () => {
  let browser;
  let page;

  before(async () => {
    ({ browser, page } = await openApp());
  });

  after(async () => {
    await browser.close();
  });

  async function gotoSettings() {
    await page.locator('[data-module="settings"]').click();
  }

  it('导出下载 JSON 备份且包含全部数据', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '备份用备忘', done: false, createdAt: 'x' });
      LifeApp.store.save();
    });
    await gotoSettings();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-data"]').click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /^life-app-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const filePath = await download.path();
    const text = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(text);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.notes[0].text, '备份用备忘');
    assert.ok(parsed.settings);
    assert.ok(parsed.plans);
  });

  it('清空数据有二次确认，确认后各模块为空', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '要清空的备忘', done: false, createdAt: 'x' });
      LifeApp.store.save();
    });
    await gotoSettings();
    await page.locator('[data-action="clear-data"]').click();
    assert.match(await page.locator('.modal').textContent(), /确定清空/);
    await page.locator('.modal-foot .btn-primary').click();
    const count = await page.evaluate(() => LifeApp.store.load().notes.length);
    assert.equal(count, 0);
  });

  it('取消清空时数据保留', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '保留的备忘', done: false, createdAt: 'x' });
      LifeApp.store.save();
    });
    await gotoSettings();
    await page.locator('[data-action="clear-data"]').click();
    await page.locator('.modal-foot .btn').first().click();
    const count = await page.evaluate(() => LifeApp.store.load().notes.length);
    assert.equal(count, 1);
  });

  it('导入备份恢复清空前的数据', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '要恢复的备忘', done: false, createdAt: 'x' });
      d.plans['2026-08-10'] = [{ id: 'p1', title: '恢复的任务', time: '', priority: 'low', source: '', done: false }];
      LifeApp.store.save();
    });
    await gotoSettings();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-data"]').click();
    const download = await downloadPromise;
    const backup = await fs.readFile(await download.path());
    await page.locator('[data-action="clear-data"]').click();
    await page.locator('.modal-foot .btn-primary').click();
    assert.equal(await page.evaluate(() => LifeApp.store.load().notes.length), 0);
    await page.setInputFiles('#import-file', { name: 'backup.json', mimeType: 'application/json', buffer: backup });
    await page.locator('.modal-foot .btn-primary').click();
    await page.waitForFunction(() => LifeApp.store.load().notes.length === 1);
    const restored = await page.evaluate(() => {
      const d = LifeApp.store.load();
      return { notes: d.notes.length, tasks: (d.plans['2026-08-10'] || []).length };
    });
    assert.deepEqual(restored, { notes: 1, tasks: 1 });
  });

  it('导入无效文件提示错误且不覆盖现有数据', async () => {
    await freshApp(page);
    await page.evaluate(() => {
      const d = LifeApp.store.load();
      d.notes.push({ id: 'n1', text: '原有备忘', done: false, createdAt: 'x' });
      LifeApp.store.save();
    });
    await gotoSettings();
    await page.setInputFiles('#import-file', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad json') });
    await page.locator('.modal-foot .btn-primary').click();
    assert.match(await page.locator('.toast').last().textContent(), /JSON/);
    const count = await page.evaluate(() => LifeApp.store.load().notes.length);
    assert.equal(count, 1);
  });
});
