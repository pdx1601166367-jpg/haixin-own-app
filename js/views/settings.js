(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.settings = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function countCard(label, value) {
    return '<div class="stat-card"><div class="num">' + value + '</div><div class="label">' + label + '</div></div>';
  }

  function render(container, ctx) {
    const store = LifeApp.store;
    const data = store.data;
    const counts = store.moduleCounts(data);
    const modules = LifeApp.app.modules;
    const hidden = data.settings.hiddenModules || [];
    const accent = data.settings.accent || 'blue';
    const density = data.settings.density || 'normal';
    const appearance = data.settings.appearance || 'liquid';
    const theme = data.settings.theme || 'light';
    const weekStart = data.settings.weekStart || 'monday';
    const dateFormat = data.settings.dateFormat || 'zh-CN';
    const dashboardModules = Array.isArray(data.settings.dashboardModules) ? data.settings.dashboardModules : ['media', 'campus', 'product', 'fitness', 'diet', 'game'];
    const summaryOptions = ['media', 'campus', 'product', 'fitness', 'diet', 'game'].map(function (id) {
      return modules.find(function (m) { return m.id === id; });
    });
    const accentOptions = [
      { id: 'blue', name: '蓝' },
      { id: 'green', name: '绿' },
      { id: 'purple', name: '紫' },
      { id: 'orange', name: '橙' }
    ];

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.settings,
        eyebrow: '本机数据控制',
        title: '数据与设置',
        description: '查看数据状态、创建备份、恢复历史版本并调整使用偏好。'
      }) +
      '<div class="panel settings-panel">' +
      '<div class="panel-head"><h2>数据概览</h2></div>' +
      '<div class="panel-body"><div class="stat-grid">' +
      countCard('备忘', counts.notes) +
      countCard('计划任务', counts.planTasks) +
      countCard('自媒体内容', counts.mediaContents) +
      countCard('校招记录', counts.campusRecords) +
      countCard('项目', counts.projects) +
      countCard('需求', counts.requirements) +
      countCard('训练打卡', counts.fitnessLogs) +
      countCard('饮食记录', counts.dietDays) +
      countCard('游戏', counts.games) +
      '</div></div></div>' +
      '<div class="panel settings-panel">' +
      '<div class="panel-head"><h2>数据备份</h2></div>' +
      '<div class="panel-body">' +
      '<div class="backup-actions">' +
      '<button type="button" class="btn btn-primary" data-action="export-data">导出备份</button>' +
      '<button type="button" class="btn" data-action="import-trigger">恢复导入</button>' +
      '<button type="button" class="btn btn-danger" data-action="clear-data">清空数据</button>' +
      '<input type="file" id="import-file" accept=".json,application/json" hidden>' +
      '</div>' +
      '<p class="muted small" style="margin:10px 0 0">导出会下载完整 JSON 备份；导入会覆盖当前全部数据；清空不可恢复。</p>' +
      '</div></div>' +
      '<div class="panel settings-panel">' +
      '<div class="panel-head"><h2>外观</h2></div>' +
      '<div class="panel-body">' +
      '<div class="field"><label>主题色</label><div class="swatch-group" data-setting="accent">' +
      accentOptions.map(function (o) {
        return '<button type="button" class="swatch swatch-' + o.id + (o.id === accent ? ' active' : '') + '" data-value="' + o.id + '">' + o.name + '</button>';
      }).join('') +
      '</div></div>' +
      '<div class="field"><label>界面风格</label><div class="segmented" data-setting="appearance">' +
      '<button type="button" class="btn ' + (appearance === 'liquid' ? 'btn-primary' : '') + '" data-value="liquid">流光玻璃</button>' +
      '<button type="button" class="btn ' + (appearance === 'notebook' ? 'btn-primary' : '') + '" data-value="notebook">笔记</button>' +
      '<button type="button" class="btn ' + (appearance === 'neo' ? 'btn-primary' : '') + '" data-value="neo">硬边</button>' +
      '</div></div>' +
      '<div class="field"><label>界面主题</label><div class="segmented" data-setting="theme">' +
      '<button type="button" class="btn ' + (theme === 'light' ? 'btn-primary' : '') + '" data-value="light">浅色</button>' +
      '<button type="button" class="btn ' + (theme === 'dark' ? 'btn-primary' : '') + '" data-value="dark">深色</button>' +
      '</div></div>' +
      '<div class="field"><label>列表密度</label><div class="segmented" data-setting="density">' +
      '<button type="button" class="btn ' + (density === 'normal' ? 'btn-primary' : '') + '" data-value="normal">标准</button>' +
      '<button type="button" class="btn ' + (density === 'compact' ? 'btn-primary' : '') + '" data-value="compact">紧凑</button>' +
      '</div></div>' +
      '</div></div>' +
      '<div class="panel settings-panel">' +
      '<div class="panel-head"><h2>使用偏好</h2></div>' +
      '<div class="panel-body preferences">' +
      '<div class="form-row">' +
      '<div class="field"><label>每周起始日</label><select id="setting-week-start">' +
      '<option value="monday"' + (weekStart === 'monday' ? ' selected' : '') + '>星期一</option>' +
      '<option value="sunday"' + (weekStart === 'sunday' ? ' selected' : '') + '>星期日</option>' +
      '</select></div>' +
      '<div class="field"><label>日期格式</label><select id="setting-date-format">' +
      '<option value="zh-CN"' + (dateFormat === 'zh-CN' ? ' selected' : '') + '>中文日期</option>' +
      '<option value="iso"' + (dateFormat === 'iso' ? ' selected' : '') + '>YYYY-MM-DD</option>' +
      '</select></div>' +
      '</div>' +
      '<div class="field"><label>首页模块摘要</label><div class="module-switches">' +
      summaryOptions.map(function (m) {
        const checked = dashboardModules.indexOf(m.id) !== -1;
        return '<label class="switch-row"><input type="checkbox" data-dashboard-toggle="' + m.id + '"' + (checked ? ' checked' : '') + '><span>' + m.name + '</span></label>';
      }).join('') +
      '</div></div>' +
      '</div></div>' +
      '<div class="panel settings-panel">' +
      '<div class="panel-head"><h2>模块开关</h2></div>' +
      '<div class="panel-body"><div class="module-switches">' +
      modules.filter(function (m) {
        return m.id !== 'home' && m.id !== 'settings';
      }).map(function (m) {
        const checked = hidden.indexOf(m.id) === -1;
        return '<label class="switch-row"><input type="checkbox" data-module-toggle="' + m.id + '"' + (checked ? ' checked' : '') + '><span>' + m.name + '</span></label>';
      }).join('') +
      '</div></div></div>';

    container.querySelectorAll('[data-setting="accent"] .swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        data.settings.accent = btn.getAttribute('data-value');
        store.save();
        LifeApp.app.applySettings();
        LifeApp.ui.toast('主题色已更新');
        render(container, ctx);
      });
    });

    container.querySelectorAll('[data-setting="density"] .btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        data.settings.density = btn.getAttribute('data-value');
        store.save();
        LifeApp.app.applySettings();
        LifeApp.ui.toast('列表密度已更新');
        render(container, ctx);
      });
    });

    container.querySelectorAll('[data-setting="appearance"] .btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        data.settings.appearance = btn.getAttribute('data-value');
        store.save();
        LifeApp.app.applySettings();
        LifeApp.ui.toast('界面风格已更新');
        render(container, ctx);
      });
    });

    container.querySelectorAll('[data-setting="theme"] .btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        data.settings.theme = btn.getAttribute('data-value');
        store.save();
        LifeApp.app.applySettings();
        LifeApp.ui.toast('界面主题已更新');
        render(container, ctx);
      });
    });

    container.querySelectorAll('[data-module-toggle]').forEach(function (el) {
      el.addEventListener('change', function () {
        const id = el.getAttribute('data-module-toggle');
        const idx = hidden.indexOf(id);
        if (el.checked) {
          if (idx !== -1) hidden.splice(idx, 1);
        } else if (idx === -1) {
          hidden.push(id);
        }
        data.settings.hiddenModules = hidden;
        store.save();
        LifeApp.app.renderNav();
        if (LifeApp.app.state.current === id) ctx.switchTo('home');
        LifeApp.ui.toast(el.checked ? '模块已显示' : '模块已隐藏');
        render(container, ctx);
      });
    });

    container.querySelector('#setting-week-start').addEventListener('change', function () {
      data.settings.weekStart = this.value;
      store.save();
      LifeApp.ui.toast('每周起始日已保存');
      render(container, ctx);
    });
    container.querySelector('#setting-date-format').addEventListener('change', function () {
      data.settings.dateFormat = this.value;
      store.save();
      LifeApp.ui.toast('日期格式已保存');
      render(container, ctx);
    });
    container.querySelectorAll('[data-dashboard-toggle]').forEach(function (el) {
      el.addEventListener('change', function () {
        const id = el.getAttribute('data-dashboard-toggle');
        const list = Array.isArray(data.settings.dashboardModules) ? data.settings.dashboardModules.slice() : ['media', 'campus', 'product', 'fitness', 'diet', 'game'];
        const idx = list.indexOf(id);
        if (el.checked && idx === -1) list.push(id);
        if (!el.checked && idx !== -1) list.splice(idx, 1);
        data.settings.dashboardModules = list;
        store.save();
        LifeApp.ui.toast('首页摘要已更新');
        render(container, ctx);
      });
    });

    container.querySelector('[data-action="export-data"]').addEventListener('click', function () {
      const text = LifeApp.store.exportData();
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'life-app-backup-' + LifeApp.store.todayKey() + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      LifeApp.ui.toast('备份已导出');
    });

    container.querySelector('[data-action="import-trigger"]').addEventListener('click', function () {
      const input = document.getElementById('import-file');
      if (input) input.click();
    });

    container.querySelector('#import-file').addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (!file) return;
      LifeApp.ui.confirm('导入备份会覆盖当前全部数据，确定继续吗？').then(function (ok) {
        if (!ok) {
          render(containerRef, ctxRef);
          return;
        }
        const reader = new FileReader();
        reader.onload = function () {
          try {
            LifeApp.store.importJson(String(reader.result));
            LifeApp.app.applySettings();
            LifeApp.app.renderNav();
            LifeApp.ui.toast('备份已恢复');
          } catch (err) {
            LifeApp.ui.toast(err.message);
          }
          render(containerRef, ctxRef);
        };
        reader.readAsText(file);
      });
    });

    container.querySelector('[data-action="clear-data"]').addEventListener('click', function () {
      LifeApp.ui.confirm('确定清空全部数据吗？此操作不可恢复。').then(function (ok) {
        if (!ok) return;
        LifeApp.store.reset();
        LifeApp.app.applySettings();
        LifeApp.app.renderNav();
        LifeApp.ui.toast('数据已清空');
        render(containerRef, ctxRef);
      });
    });
  }

  return {
    render: render
  };
});
