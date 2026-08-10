(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.game = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATUSES = [
    { id: 'wishlist', name: '想玩' },
    { id: 'playing', name: '正在进行' },
    { id: 'paused', name: '暂停' },
    { id: 'completed', name: '已完成' }
  ];
  const STATUS_ALIASES = {
    want: '想玩',
    finished: '已完成',
    abandoned: '弃坑'
  };
  const TYPES = [
    { id: 'game', name: '游戏' },
    { id: 'movie', name: '影视' },
    { id: 'reading', name: '阅读' },
    { id: 'other', name: '其他' }
  ];
  const TABS = [
    { id: 'library', name: '游戏库' },
    { id: 'sessions', name: '游玩记录' },
    { id: 'wishlist', name: '心愿单' }
  ];

  let containerRef = null;
  let ctxRef = null;
  let currentTab = 'library';

  function statusName(id) {
    const s = STATUSES.find(function (x) { return x.id === id; });
    if (s) return s.name;
    return STATUS_ALIASES[id] || id;
  }

  function statusBadge(id) {
    const cls = { playing: 'badge-accent', wishlist: 'badge-neutral', paused: 'badge-warning', completed: 'badge-success', finished: 'badge-success', abandoned: 'badge-danger' }[id] || 'badge-neutral';
    return '<span class="badge ' + cls + '">' + statusName(id) + '</span>';
  }

  function totalMinutes(gameId) {
    return LifeApp.store.data.games.sessions.filter(function (s) { return s.gameId === gameId; })
      .reduce(function (sum, s) { return sum + (Number(s.minutes) || 0); }, 0);
  }

  function activeSessionFor(gameId) {
    return LifeApp.store.data.games.sessions.find(function (s) { return s.gameId === gameId && !s.endedAt; });
  }

  function gameCard(game) {
    const active = activeSessionFor(game.id);
    const type = TYPES.find(function (t) { return t.id === game.activityType; });
    const minutes = totalMinutes(game.id);
    return '<div class="game-card">' +
      '<div class="game-card-head"><div class="game-name">' + LifeApp.ui.esc(game.name) + '</div>' + statusBadge(game.status) + '</div>' +
      '<div class="muted small">' + (type ? type.name : '游戏') + (game.platform ? ' · ' + LifeApp.ui.esc(game.platform) : '') + '</div>' +
      (game.progress ? '<div class="game-progress"><span>进度</span><strong>' + LifeApp.ui.esc(game.progress) + '</strong></div>' : '') +
      (game.nextGoal ? '<div class="next-goal"><span>下一次目标</span><strong>' + LifeApp.ui.esc(game.nextGoal) + '</strong></div>' : '') +
      (game.rating ? '<div class="game-rating">评分 ' + Number(game.rating || 0) + '/10</div>' : '') +
      (game.review ? '<div class="muted small game-review">' + LifeApp.ui.esc(game.review) + '</div>' : '') +
      '<div class="game-meta"><span>累计 ' + Math.round(minutes / 60 * 10) / 10 + ' 小时</span>' +
      (active ? '<span class="live-dot"></span> 计时中' : '') + '</div>' +
      '<div class="game-actions">' +
      (active
        ? '<button type="button" class="btn btn-sm btn-primary" data-action="stop-session" data-id="' + active.id + '">结束并记录</button>'
        : '<button type="button" class="btn btn-sm btn-primary" data-action="start-session" data-id="' + game.id + '">开始游玩</button>') +
      '<button type="button" class="btn btn-sm" data-action="add-session-quick" data-id="' + game.id + '">记一次</button>' +
      '<button type="button" class="btn btn-sm" data-action="plan-game" data-id="' + game.id + '">安排时间</button>' +
      '<button type="button" class="btn btn-sm" data-action="edit-game" data-id="' + game.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-game" data-id="' + game.id + '">删除</button>' +
      '</div></div>';
  }

  function sessionRow(session) {
    const game = LifeApp.store.data.games.library.find(function (g) { return g.id === session.gameId; });
    return '<div class="list-row">' +
      '<div class="list-row-main"><div class="task-title">' + LifeApp.ui.esc(session.date || (session.startedAt || '').slice(0, 10)) + ' · ' + LifeApp.ui.esc(game ? game.name : '已删除的游戏') + '</div>' +
      '<div class="task-meta"><span class="badge badge-accent">' + Number(session.minutes || 0) + ' 分钟</span>' + (session.note ? '<span class="muted small">' + LifeApp.ui.esc(session.note) + '</span>' : '') + '</div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-session" data-id="' + session.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-session" data-id="' + session.id + '">删除</button>' +
      '</div></div>';
  }

  function wishRow(wish) {
    return '<div class="list-row">' +
      '<div class="list-row-main"><span class="task-title">' + LifeApp.ui.esc(wish.name) + '</span>' +
      '<span class="muted small"> 预计 ' + Number(wish.price || 0) + ' 元</span></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-wish" data-id="' + wish.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-wish" data-id="' + wish.id + '">删除</button>' +
      '</div></div>';
  }

  function render(container, ctx) {
    containerRef = container;
    ctxRef = ctx;
    const data = LifeApp.store.data;
    const minutes = LifeApp.store.gameMonthMinutes(data.games.sessions);
    const hours = Math.round((minutes / 60) * 10) / 10;

    let bodyHtml = '';
    if (currentTab === 'library') {
      bodyHtml = '<div class="panel"><div class="panel-head"><h2>游戏库</h2><button type="button" class="btn btn-primary" data-action="add-game">+ 新增游戏</button></div><div class="panel-body">' +
        (data.games.library.length ? '<div class="game-grid">' + data.games.library.map(gameCard).join('') + '</div>' : LifeApp.ui.emptyState('游戏库还是空的，添加一款游戏', '')) +
        '</div></div>';
    } else if (currentTab === 'sessions') {
      const sessions = data.games.sessions.slice().sort(function (a, b) {
        return String(b.date || b.startedAt || '').localeCompare(String(a.date || a.startedAt || ''));
      });
      bodyHtml = '<div class="panel"><div class="panel-head"><h2>游玩记录</h2><button type="button" class="btn btn-primary" data-action="add-session">+ 新增记录</button></div><div class="panel-body">' +
        (sessions.length ? sessions.map(sessionRow).join('') : LifeApp.ui.emptyState('还没有游玩记录', '')) +
        '</div></div>';
    } else {
      bodyHtml = '<div class="panel"><div class="panel-head"><h2>心愿单</h2><button type="button" class="btn btn-primary" data-action="add-wish">+ 新增心愿</button></div><div class="panel-body">' +
        (data.games.wishlist.length ? data.games.wishlist.map(wishRow).join('') : LifeApp.ui.emptyState('心愿单是空的', '')) +
        '</div></div>';
    }

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.game,
        eyebrow: '放松与进度',
        title: '游戏娱乐',
        description: '记录想玩、正在玩和已经完成的内容，不制造工作式压力。',
        actions: '<button type="button" id="game-add-item-btn" class="btn btn-primary">+ 添加游戏或活动</button>'
      }) +
      '<div class="stat-grid">' +
      '<div class="stat-card"><div class="num">' + hours + '</div><div class="label">本月游玩 小时</div></div>' +
      '<div class="stat-card"><div class="num">' + data.games.library.length + '</div><div class="label">游戏总数</div></div>' +
      '<div class="stat-card"><div class="num">' + data.games.wishlist.length + '</div><div class="label">心愿单</div></div>' +
      '</div>' +
      '<div class="tabs" style="margin-top:var(--space)">' + TABS.map(function (t) {
        return '<button type="button" class="tab-btn' + (t.id === currentTab ? ' active' : '') + '" data-tab="' + t.id + '">' + t.name + '</button>';
      }).join('') + '</div>' +
      bodyHtml;

    container.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentTab = btn.getAttribute('data-tab');
        render(containerRef, ctxRef);
      });
    });
    bind(container);
  }

  function bind(container) {
    const headerAdd = container.querySelector('#game-add-item-btn');
    if (headerAdd) headerAdd.addEventListener('click', function () { openGameModal(null); });
    container.querySelectorAll('[data-action="add-game"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openGameModal(null); });
    });
    container.querySelectorAll('[data-action="edit-game"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const game = LifeApp.store.data.games.library.find(function (g) { return g.id === btn.getAttribute('data-id'); });
        if (game) openGameModal(game);
      });
    });
    container.querySelectorAll('[data-action="delete-game"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteGame(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="start-session"]').forEach(function (btn) {
      btn.addEventListener('click', function () { startSession(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="stop-session"]').forEach(function (btn) {
      btn.addEventListener('click', function () { stopSession(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-session-quick"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openSessionModal(null, btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="plan-game"]').forEach(function (btn) {
      btn.addEventListener('click', function () { planGame(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-session"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openSessionModal(null); });
    });
    container.querySelectorAll('[data-action="edit-session"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const session = LifeApp.store.data.games.sessions.find(function (s) { return s.id === btn.getAttribute('data-id'); });
        if (session) openSessionModal(session);
      });
    });
    container.querySelectorAll('[data-action="delete-session"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteSession(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="add-wish"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openWishModal(null); });
    });
    container.querySelectorAll('[data-action="edit-wish"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const wish = LifeApp.store.data.games.wishlist.find(function (w) { return w.id === btn.getAttribute('data-id'); });
        if (wish) openWishModal(wish);
      });
    });
    container.querySelectorAll('[data-action="delete-wish"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteWish(btn.getAttribute('data-id')); });
    });
  }

  function openGameModal(game) {
    const isEdit = !!game;
    LifeApp.ui.modal({
      title: isEdit ? '编辑游戏' : '新增游戏',
      bodyHtml:
        '<div class="field"><label>名称</label><input id="game-name" type="text" value="' + LifeApp.ui.esc(game ? game.name : '') + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>类型</label><select id="game-type">' +
        TYPES.map(function (t) {
          return '<option value="' + t.id + '"' + ((game ? game.activityType : 'game') === t.id ? ' selected' : '') + '>' + t.name + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>平台</label><input id="game-platform" type="text" value="' + LifeApp.ui.esc(game ? game.platform : '') + '" placeholder="Steam、Switch 等"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="field"><label>状态</label><select id="game-status">' +
        STATUSES.map(function (s) {
          return '<option value="' + s.id + '"' + ((game ? game.status : 'wishlist') === s.id ? ' selected' : '') + '>' + s.name + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>评分（0-10）</label><input id="game-rating" type="number" min="0" max="10" step="0.5" value="' + (game ? Number(game.rating || 0) : 0) + '"></div>' +
        '</div>' +
        '<div class="field"><label>当前进度</label><textarea id="game-progress">' + LifeApp.ui.esc(game ? game.progress : '') + '</textarea></div>' +
        '<div class="field"><label>下一次目标</label><input id="game-next-goal" type="text" value="' + LifeApp.ui.esc(game ? game.nextGoal : '') + '"></div>' +
        '<div class="field"><label>攻略或个人笔记</label><textarea id="game-review">' + LifeApp.ui.esc(game ? game.review : '') + '</textarea></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveGame(isEdit, game ? game.id : null); } }
      ]
    });
  }

  function saveGame(isEdit, id) {
    const name = document.getElementById('game-name').value.trim();
    if (!name) {
      LifeApp.ui.toast('名称不能为空');
      return false;
    }
    const status = document.getElementById('game-status').value;
    const activityType = document.getElementById('game-type').value;
    const platform = document.getElementById('game-platform').value.trim();
    const rating = Number(document.getElementById('game-rating').value) || 0;
    const progress = document.getElementById('game-progress').value.trim();
    const nextGoal = document.getElementById('game-next-goal').value.trim();
    const review = document.getElementById('game-review').value.trim();
    const library = LifeApp.store.data.games.library;
    if (isEdit) {
      const game = library.find(function (g) { return g.id === id; });
      if (game) Object.assign(game, { name: name, status: status, activityType: activityType, platform: platform, rating: rating, progress: progress, nextGoal: nextGoal, review: review });
    } else {
      library.push({ id: LifeApp.store.uid(), name: name, status: status, activityType: activityType, platform: platform, rating: rating, progress: progress, nextGoal: nextGoal, review: review });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '内容已更新' : '内容已添加');
    return true;
  }

  function deleteGame(id) {
    LifeApp.ui.confirm('确定删除这款游戏吗？').then(function (ok) {
      if (!ok) return;
      const library = LifeApp.store.data.games.library;
      const idx = library.findIndex(function (g) { return g.id === id; });
      if (idx !== -1) library.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('游戏已删除');
    });
  }

  function startSession(gameId) {
    const game = LifeApp.store.data.games.library.find(function (g) { return g.id === gameId; });
    if (!game) return;
    if (activeSessionFor(gameId)) {
      LifeApp.ui.toast('这个游戏已经在计时');
      return;
    }
    game.status = 'playing';
    LifeApp.store.data.games.sessions.push({
      id: LifeApp.store.uid(),
      gameId: gameId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      minutes: 0,
      note: '',
      date: LifeApp.store.todayKey()
    });
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('开始游玩');
  }

  function stopSession(id) {
    const session = LifeApp.store.data.games.sessions.find(function (s) { return s.id === id; });
    if (!session) return;
    const ended = new Date();
    session.endedAt = ended.toISOString();
    session.minutes = Math.max(1, Math.round((ended.getTime() - new Date(session.startedAt).getTime()) / 60000));
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已结束并记录 ' + session.minutes + ' 分钟');
  }

  function planGame(gameId) {
    const game = LifeApp.store.data.games.library.find(function (g) { return g.id === gameId; });
    if (!game) return;
    const today = LifeApp.store.todayKey();
    if (!LifeApp.store.data.plans[today]) LifeApp.store.data.plans[today] = [];
    LifeApp.store.data.plans[today].push({ id: LifeApp.store.uid(), title: '娱乐：' + game.name, time: '', estimatedMinutes: 0, priority: 'low', source: 'game', done: false, status: 'todo' });
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已安排到今日计划');
  }

  function openSessionModal(session, presetGameId) {
    const isEdit = !!session;
    const library = LifeApp.store.data.games.library;
    LifeApp.ui.modal({
      title: isEdit ? '编辑游玩记录' : '新增游玩记录',
      bodyHtml:
        '<div class="field"><label>日期</label><input id="session-date" type="date" value="' + LifeApp.ui.esc(session ? session.date : LifeApp.store.todayKey()) + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>游戏</label><select id="session-game">' +
        library.map(function (g) {
          return '<option value="' + g.id + '"' + ((session && session.gameId === g.id) || (!session && presetGameId === g.id) ? ' selected' : '') + '>' + LifeApp.ui.esc(g.name) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>时长（分钟）</label><input id="session-minutes" type="number" min="1" value="' + (session ? Number(session.minutes || 0) : 30) + '"></div>' +
        '</div>' +
        '<div class="field"><label>感想</label><textarea id="session-note">' + LifeApp.ui.esc(session ? session.note : '') + '</textarea></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveSession(isEdit, session ? session.id : null); } }
      ]
    });
  }

  function saveSession(isEdit, id) {
    const date = document.getElementById('session-date').value;
    const gameId = document.getElementById('session-game').value;
    const minutes = Number(document.getElementById('session-minutes').value) || 0;
    if (!date || !gameId || !minutes) {
      LifeApp.ui.toast('日期、游戏和时长不能为空');
      return false;
    }
    const note = document.getElementById('session-note').value.trim();
    const sessions = LifeApp.store.data.games.sessions;
    if (isEdit) {
      const session = sessions.find(function (s) { return s.id === id; });
      if (session) Object.assign(session, { date: date, gameId: gameId, minutes: minutes, note: note });
    } else {
      sessions.push({ id: LifeApp.store.uid(), date: date, gameId: gameId, minutes: minutes, note: note });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '记录已更新' : '记录已添加');
    return true;
  }

  function deleteSession(id) {
    LifeApp.ui.confirm('确定删除这条游玩记录吗？').then(function (ok) {
      if (!ok) return;
      const sessions = LifeApp.store.data.games.sessions;
      const idx = sessions.findIndex(function (s) { return s.id === id; });
      if (idx !== -1) sessions.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('记录已删除');
    });
  }

  function openWishModal(wish) {
    const isEdit = !!wish;
    LifeApp.ui.modal({
      title: isEdit ? '编辑心愿' : '新增心愿',
      bodyHtml:
        '<div class="field"><label>名称</label><input id="wish-name" type="text" value="' + LifeApp.ui.esc(wish ? wish.name : '') + '"></div>' +
        '<div class="field"><label>预计价格（元）</label><input id="wish-price" type="number" min="0" value="' + (wish ? Number(wish.price || 0) : 0) + '"></div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveWish(isEdit, wish ? wish.id : null); } }
      ]
    });
  }

  function saveWish(isEdit, id) {
    const name = document.getElementById('wish-name').value.trim();
    if (!name) {
      LifeApp.ui.toast('名称不能为空');
      return false;
    }
    const price = Number(document.getElementById('wish-price').value) || 0;
    const wishlist = LifeApp.store.data.games.wishlist;
    if (isEdit) {
      const wish = wishlist.find(function (w) { return w.id === id; });
      if (wish) Object.assign(wish, { name: name, price: price });
    } else {
      wishlist.push({ id: LifeApp.store.uid(), name: name, price: price });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '心愿已更新' : '心愿已添加');
    return true;
  }

  function deleteWish(id) {
    LifeApp.ui.confirm('确定删除这个心愿吗？').then(function (ok) {
      if (!ok) return;
      const wishlist = LifeApp.store.data.games.wishlist;
      const idx = wishlist.findIndex(function (w) { return w.id === id; });
      if (idx !== -1) wishlist.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('心愿已删除');
    });
  }

  return {
    render: render
  };
});
