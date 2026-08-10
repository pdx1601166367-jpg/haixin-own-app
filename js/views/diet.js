(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.views = root.LifeApp.views || {};
    root.LifeApp.views.diet = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MEAL_TYPES = [
    { id: 'breakfast', name: '早餐' },
    { id: 'lunch', name: '午餐' },
    { id: 'dinner', name: '晚餐' },
    { id: 'snack', name: '加餐' }
  ];

  let containerRef = null;
  let ctxRef = null;
  let currentDate = null;
  let calendarMonth = null;

  function getDay() {
    const days = LifeApp.store.data.diet.days;
    let day = days.find(function (d) { return d.date === currentDate; });
    if (!day) {
      day = { id: LifeApp.store.uid(), date: currentDate, meals: [] };
      days.push(day);
    }
    return day;
  }

  function getWater() {
    const water = LifeApp.store.data.diet.water;
    let item = water.find(function (w) { return w.date === currentDate; });
    if (!item) {
      item = { id: LifeApp.store.uid(), date: currentDate, cups: 0 };
      water.push(item);
    }
    return item;
  }

  function currentTarget() {
    const targets = LifeApp.store.data.diet.targets || [];
    return targets.filter(function (t) { return t.effectiveDate <= currentDate; })
      .sort(function (a, b) { return String(b.effectiveDate).localeCompare(String(a.effectiveDate)); })[0] || null;
  }

  function actualTotals() {
    const meals = getDay().meals.filter(function (m) { return m.entryKind !== 'planned'; });
    return meals.reduce(function (sum, m) {
      return {
        calories: sum.calories + (Number(m.calories) || 0),
        protein: sum.protein + (Number(m.protein) || 0),
        carbs: sum.carbs + (Number(m.carbs) || 0),
        fat: sum.fat + (Number(m.fat) || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function mealRow(day, meal) {
    return '<div class="list-row">' +
      '<div class="list-row-main"><span class="task-title">' + LifeApp.ui.esc(meal.food) + '</span>' +
      '<div class="task-meta">' +
      '<span class="badge ' + (meal.entryKind === 'planned' ? 'badge-neutral' : 'badge-success') + '">' + (meal.entryKind === 'planned' ? '计划' : '实际') + '</span>' +
      '<span class="muted small">' + Number(meal.calories || 0) + ' kcal' +
      (Number(meal.protein || 0) ? ' · 蛋白 ' + Number(meal.protein || 0) + 'g' : '') +
      (Number(meal.carbs || 0) ? ' · 碳水 ' + Number(meal.carbs || 0) + 'g' : '') +
      (Number(meal.fat || 0) ? ' · 脂肪 ' + Number(meal.fat || 0) + 'g' : '') +
      '</span></div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="edit-meal" data-id="' + meal.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-meal" data-id="' + meal.id + '">删除</button>' +
      '</div></div>';
  }

  function mealSection(day, type) {
    const meals = day.meals.filter(function (m) { return m.type === type.id; });
    const calories = meals.reduce(function (n, m) { return n + (Number(m.calories) || 0); }, 0);
    return '<div class="panel diet-meal-panel">' +
      '<div class="panel-head"><h3>' + type.name + '</h3><span class="muted small">' + calories + ' kcal</span></div>' +
      '<div class="panel-body">' +
      (meals.length ? meals.map(function (m) { return mealRow(day, m); }).join('') : LifeApp.ui.emptyState('还没有记录', '')) +
      '<div style="margin-top:10px"><button type="button" class="btn btn-sm" data-action="add-meal" data-type="' + type.id + '">+ 添加</button></div>' +
      '</div></div>';
  }

  function recipeRow(recipe) {
    return '<div class="list-row">' +
      '<div class="list-row-main"><div class="task-title">' + LifeApp.ui.esc(recipe.name) + '</div>' +
      '<div class="muted small">' + LifeApp.ui.esc(recipe.food) + ' · ' + Number(recipe.calories || 0) + ' kcal' +
      (Number(recipe.protein || 0) ? ' · 蛋白 ' + Number(recipe.protein || 0) + 'g' : '') + '</div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-sm" data-action="use-recipe" data-id="' + recipe.id + '">记到今日</button>' +
      '<button type="button" class="btn btn-sm" data-action="edit-recipe" data-id="' + recipe.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete-recipe" data-id="' + recipe.id + '">删除</button>' +
      '</div></div>';
  }

  function nutritionMetric(label, value, target, unit) {
    const percent = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
    return '<div class="nutrition-metric"><div><span>' + label + '</span><strong>' + Math.round(value) + ' <small>/ ' + (target ? Math.round(target) : '未设') + ' ' + unit + '</small></strong></div>' +
      '<div class="mini-progress"><span style="width:' + percent + '%"></span></div></div>';
  }

  function calendarHtml() {
    const store = LifeApp.store;
    if (!calendarMonth) calendarMonth = currentDate.slice(0, 7);
    const weekStart = store.data.settings.weekStart || 'monday';
    const parts = calendarMonth.split('-').map(Number);
    const days = store.buildMonthDays(calendarMonth, weekStart);
    const byDate = {};
    store.data.diet.days.forEach(function (day) {
      if (day.meals && day.meals.length) byDate[day.date] = day.meals;
    });
    const labels = weekStart === 'sunday' ? ['日', '一', '二', '三', '四', '五', '六'] : ['一', '二', '三', '四', '五', '六', '日'];
    let html = '<div class="calendar-head">' +
      '<button type="button" class="btn btn-sm" data-action="prev-month">上月</button>' +
      '<span class="calendar-title">' + parts[0] + ' 年 ' + parts[1] + ' 月</span>' +
      '<button type="button" class="btn btn-sm" data-action="next-month">下月</button></div>';
    html += '<div class="month-grid">' + labels.map(function (label) {
      return '<div class="month-weekday">' + label + '</div>';
    }).join('');
    days.forEach(function (day) {
      const meals = byDate[day.date] || [];
      const actual = meals.filter(function (m) { return m.entryKind === 'actual'; }).length;
      html += '<button type="button" class="month-day' + (day.date === currentDate ? ' active' : '') + (day.inMonth ? '' : ' outside') + '" data-cal-date="' + day.date + '">' +
        '<span class="month-day-num">' + Number(day.date.slice(-2)) + '</span>' +
        (meals.length ? '<span class="month-entry">' + meals.length + ' 餐' + (actual ? ' · ' + actual + ' 实际' : '') + '</span>' : '') +
        '</button>';
    });
    html += '</div>';
    return html;
  }

  function render(container, ctx) {
    containerRef = container;
    ctxRef = ctx;
    if (!currentDate) currentDate = LifeApp.store.todayKey();
    const store = LifeApp.store;
    const data = store.data;
    const day = getDay();
    const water = getWater();
    const totals = actualTotals();
    const target = currentTarget();
    const today = store.todayKey();
    const isToday = currentDate === today;

    container.innerHTML =
      LifeApp.ui.pageHeader({
        icon: LifeApp.ui.icons.diet,
        eyebrow: '计划与实际摄入',
        title: '饮食计划',
        description: '先决定吃什么，再记录实际摄入；营养数据可以留空。',
        actions: '<button type="button" id="diet-add-meal-header" class="btn btn-primary">+ 记录餐食</button>'
      }) +
      '<div class="toolbar">' +
      '<div class="date-nav">' +
      '<button type="button" class="btn btn-sm" data-action="prev-day">&lsaquo; 前一天</button>' +
      '<span class="date-label" data-testid="diet-date">' + currentDate + (isToday ? '（今天）' : '') + '</span>' +
      '<button type="button" class="btn btn-sm" data-action="next-day">后一天 &rsaquo;</button>' +
      (!isToday ? '<button type="button" class="btn btn-sm btn-primary" data-action="today">回到今天</button>' : '') +
      '</div>' +
      '<div class="diet-toolbar-actions">' +
      '<button type="button" class="btn btn-sm" data-action="copy-yesterday">复制昨天计划</button>' +
      '<button type="button" class="btn btn-sm" data-action="edit-target">设置营养目标</button>' +
      '</div></div>' +
      '<div class="nutrition-strip">' +
      nutritionMetric('热量', totals.calories, target ? target.calories : 0, 'kcal') +
      nutritionMetric('蛋白质', totals.protein, target ? target.protein : 0, 'g') +
      nutritionMetric('碳水', totals.carbs, target ? target.carbs : 0, 'g') +
      nutritionMetric('脂肪', totals.fat, target ? target.fat : 0, 'g') +
      '</div>' +
      '<div class="stat-grid diet-stats">' +
      '<div class="stat-card"><div class="num">' + totals.calories + '</div><div class="label">实际热量 kcal</div></div>' +
      '<div class="stat-card"><div class="num">' + water.cups + '</div><div class="label">饮水 杯</div>' +
      '<div class="water-actions"><button type="button" class="btn btn-sm" data-action="water-minus">- 1</button><button type="button" class="btn btn-sm btn-primary" data-action="water-plus">+ 1</button></div></div>' +
      '</div>' +
      '<div class="panel" style="margin-bottom:var(--space)"><div class="panel-head"><h2>饮食日历</h2></div><div class="panel-body">' + calendarHtml() + '</div></div>' +
      '<div class="diet-meals-grid">' + MEAL_TYPES.map(function (t) { return mealSection(day, t); }).join('') + '</div>' +
      '<div class="panel" style="margin-top:var(--space)">' +
      '<div class="panel-head"><h2>常用菜谱</h2><button type="button" class="btn btn-primary" data-action="add-recipe">+ 新增菜谱</button></div>' +
      '<div class="panel-body">' +
      (data.diet.recipes.length ? data.diet.recipes.map(recipeRow).join('') : LifeApp.ui.emptyState('还没有菜谱，把常吃的记下来', '')) +
      '</div></div>';

    container.querySelectorAll('[data-action="prev-day"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentDate = LifeApp.store.addDays(currentDate, -1);
        calendarMonth = currentDate.slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="next-day"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentDate = LifeApp.store.addDays(currentDate, 1);
        calendarMonth = currentDate.slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="today"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentDate = LifeApp.store.todayKey();
        calendarMonth = currentDate.slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="add-meal"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openMealModal(btn.getAttribute('data-type'), null); });
    });
    const headerMeal = container.querySelector('#diet-add-meal-header');
    if (headerMeal) headerMeal.addEventListener('click', function () { openMealModal('snack', null); });
    container.querySelectorAll('[data-action="edit-meal"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const meal = getDay().meals.find(function (m) { return m.id === btn.getAttribute('data-id'); });
        if (meal) openMealModal(meal.type, meal);
      });
    });
    container.querySelectorAll('[data-action="delete-meal"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteMeal(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="water-plus"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        getWater().cups += 1;
        LifeApp.store.save();
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="water-minus"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        getWater().cups = Math.max(0, getWater().cups - 1);
        LifeApp.store.save();
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="add-recipe"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openRecipeModal(null); });
    });
    container.querySelectorAll('[data-action="edit-recipe"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const recipe = LifeApp.store.data.diet.recipes.find(function (r) { return r.id === btn.getAttribute('data-id'); });
        if (recipe) openRecipeModal(recipe);
      });
    });
    container.querySelectorAll('[data-action="delete-recipe"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteRecipe(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="use-recipe"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const recipe = LifeApp.store.data.diet.recipes.find(function (r) { return r.id === btn.getAttribute('data-id'); });
        if (!recipe) return;
        const day = getDay();
        day.meals.push({ id: LifeApp.store.uid(), type: 'snack', food: recipe.food, calories: recipe.calories, protein: recipe.protein || 0, carbs: recipe.carbs || 0, fat: recipe.fat || 0, entryKind: 'actual' });
        LifeApp.store.save();
        render(containerRef, ctxRef);
        LifeApp.ui.toast('已记录到今日');
      });
    });
    container.querySelectorAll('[data-action="copy-yesterday"]').forEach(function (btn) {
      btn.addEventListener('click', function () { copyYesterday(); });
    });
    container.querySelectorAll('[data-action="edit-target"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openTargetModal(); });
    });
    container.querySelectorAll('[data-action="prev-month"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = calendarMonth.split('-').map(Number);
        calendarMonth = LifeApp.store.dateKey(new Date(parts[0], parts[1] - 2, 1)).slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-action="next-month"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = calendarMonth.split('-').map(Number);
        calendarMonth = LifeApp.store.dateKey(new Date(parts[0], parts[1], 1)).slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
    container.querySelectorAll('[data-cal-date]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentDate = btn.getAttribute('data-cal-date');
        calendarMonth = currentDate.slice(0, 7);
        render(containerRef, ctxRef);
      });
    });
  }

  function copyYesterday() {
    const yesterday = LifeApp.store.addDays(currentDate, -1);
    const source = LifeApp.store.data.diet.days.find(function (d) { return d.date === yesterday; });
    if (!source) {
      LifeApp.ui.toast('昨天没有计划餐食');
      return;
    }
    const planned = source.meals.filter(function (m) { return m.entryKind === 'planned'; });
    if (!planned.length) {
      LifeApp.ui.toast('昨天没有计划餐食');
      return;
    }
    const day = getDay();
    planned.forEach(function (m) {
      day.meals.push({ id: LifeApp.store.uid(), type: m.type, food: m.food, calories: m.calories, protein: m.protein || 0, carbs: m.carbs || 0, fat: m.fat || 0, entryKind: 'planned' });
    });
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('已复制昨天的计划');
  }

  function openTargetModal() {
    const target = currentTarget();
    LifeApp.ui.modal({
      title: '设置营养目标',
      bodyHtml:
        '<div class="field"><label>生效日期</label><input id="diet-target-date" type="date" value="' + LifeApp.ui.esc(target ? target.effectiveDate : currentDate) + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>热量 kcal</label><input id="diet-target-calories" type="number" value="' + (target ? Number(target.calories || 0) : 1800) + '"></div>' +
        '<div class="field"><label>蛋白质 g</label><input id="diet-target-protein" type="number" value="' + (target ? Number(target.protein || 0) : 90) + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="field"><label>碳水 g</label><input id="diet-target-carbs" type="number" value="' + (target ? Number(target.carbs || 0) : 200) + '"></div>' +
        '<div class="field"><label>脂肪 g</label><input id="diet-target-fat" type="number" value="' + (target ? Number(target.fat || 0) : 60) + '"></div>' +
        '</div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveTarget(); } }
      ]
    });
  }

  function saveTarget() {
    const effectiveDate = document.getElementById('diet-target-date').value;
    if (!effectiveDate) {
      LifeApp.ui.toast('请选择生效日期');
      return false;
    }
    const targets = LifeApp.store.data.diet.targets || [];
    LifeApp.store.data.diet.targets = targets;
    const existing = targets.find(function (t) { return t.effectiveDate === effectiveDate; });
    const payload = {
      effectiveDate: effectiveDate,
      calories: Number(document.getElementById('diet-target-calories').value) || 0,
      protein: Number(document.getElementById('diet-target-protein').value) || 0,
      carbs: Number(document.getElementById('diet-target-carbs').value) || 0,
      fat: Number(document.getElementById('diet-target-fat').value) || 0
    };
    if (existing) Object.assign(existing, payload);
    else targets.push(Object.assign({ id: LifeApp.store.uid() }, payload));
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast('营养目标已保存');
    return true;
  }

  function openMealModal(type, meal) {
    const isEdit = !!meal;
    const recipes = LifeApp.store.data.diet.recipes;
    LifeApp.ui.modal({
      title: isEdit ? '编辑餐食' : '记录餐食',
      bodyHtml:
        '<div class="form-row">' +
        '<div class="field"><label>餐次</label><select id="diet-meal-type">' +
        MEAL_TYPES.map(function (t) {
          return '<option value="' + t.id + '"' + ((meal ? meal.type : type) === t.id ? ' selected' : '') + '>' + t.name + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>记录类型</label><select id="diet-meal-kind">' +
        '<option value="actual"' + ((meal ? meal.entryKind : 'actual') === 'actual' ? ' selected' : '') + '>实际摄入</option>' +
        '<option value="planned"' + ((meal ? meal.entryKind : '') === 'planned' ? ' selected' : '') + '>计划餐食</option>' +
        '</select></div></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>从菜谱选择</label><select id="diet-recipe-pick"><option value="">不使用菜谱</option>' +
        recipes.map(function (r) {
          return '<option value="' + r.id + '">' + LifeApp.ui.esc(r.name) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>食物</label><input id="diet-meal-food" type="text" value="' + LifeApp.ui.esc(meal ? meal.food : '') + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="field"><label>热量 kcal</label><input id="diet-meal-calories" type="number" min="0" value="' + (meal ? Number(meal.calories || 0) : 0) + '"></div>' +
        '<div class="field"><label>蛋白质 g</label><input id="diet-meal-protein" type="number" min="0" value="' + (meal ? Number(meal.protein || 0) : 0) + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="field"><label>碳水 g</label><input id="diet-meal-carbs" type="number" min="0" value="' + (meal ? Number(meal.carbs || 0) : 0) + '"></div>' +
        '<div class="field"><label>脂肪 g</label><input id="diet-meal-fat" type="number" min="0" value="' + (meal ? Number(meal.fat || 0) : 0) + '"></div>' +
        '</div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveMeal(isEdit, meal ? meal.id : null); } }
      ]
    });
    const pick = document.getElementById('diet-recipe-pick');
    if (pick) {
      pick.addEventListener('change', function () {
        const recipe = recipes.find(function (r) { return r.id === pick.value; });
        if (recipe) {
          document.getElementById('diet-meal-food').value = recipe.food;
          document.getElementById('diet-meal-calories').value = recipe.calories;
          document.getElementById('diet-meal-protein').value = recipe.protein || 0;
          document.getElementById('diet-meal-carbs').value = recipe.carbs || 0;
          document.getElementById('diet-meal-fat').value = recipe.fat || 0;
        }
      });
    }
  }

  function saveMeal(isEdit, id) {
    const food = document.getElementById('diet-meal-food').value.trim();
    if (!food) {
      LifeApp.ui.toast('食物不能为空');
      return false;
    }
    const type = document.getElementById('diet-meal-type').value;
    const entryKind = document.getElementById('diet-meal-kind').value;
    const calories = Number(document.getElementById('diet-meal-calories').value) || 0;
    const protein = Number(document.getElementById('diet-meal-protein').value) || 0;
    const carbs = Number(document.getElementById('diet-meal-carbs').value) || 0;
    const fat = Number(document.getElementById('diet-meal-fat').value) || 0;
    const day = getDay();
    if (isEdit) {
      const meal = day.meals.find(function (m) { return m.id === id; });
      if (meal) Object.assign(meal, { type: type, food: food, calories: calories, protein: protein, carbs: carbs, fat: fat, entryKind: entryKind });
    } else {
      day.meals.push({ id: LifeApp.store.uid(), type: type, food: food, calories: calories, protein: protein, carbs: carbs, fat: fat, entryKind: entryKind });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '餐食已更新' : '餐食已记录');
    return true;
  }

  function deleteMeal(id) {
    LifeApp.ui.confirm('确定删除这条餐食记录吗？').then(function (ok) {
      if (!ok) return;
      const day = getDay();
      const idx = day.meals.findIndex(function (m) { return m.id === id; });
      if (idx !== -1) day.meals.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('餐食已删除');
    });
  }

  function openRecipeModal(recipe) {
    const isEdit = !!recipe;
    LifeApp.ui.modal({
      title: isEdit ? '编辑菜谱' : '新增菜谱',
      bodyHtml:
        '<div class="field"><label>菜谱名称</label><input id="diet-recipe-name" type="text" value="' + LifeApp.ui.esc(recipe ? recipe.name : '') + '"></div>' +
        '<div class="field"><label>包含食物</label><input id="diet-recipe-food" type="text" value="' + LifeApp.ui.esc(recipe ? recipe.food : '') + '"></div>' +
        '<div class="form-row">' +
        '<div class="field"><label>热量 kcal</label><input id="diet-recipe-calories" type="number" min="0" value="' + (recipe ? Number(recipe.calories || 0) : 0) + '"></div>' +
        '<div class="field"><label>蛋白质 g</label><input id="diet-recipe-protein" type="number" min="0" value="' + (recipe ? Number(recipe.protein || 0) : 0) + '"></div>' +
        '</div>',
      buttons: [
        { label: '取消', className: 'btn' },
        { label: '保存', className: 'btn btn-primary', onClick: function () { return saveRecipe(isEdit, recipe ? recipe.id : null); } }
      ]
    });
  }

  function saveRecipe(isEdit, id) {
    const name = document.getElementById('diet-recipe-name').value.trim();
    const food = document.getElementById('diet-recipe-food').value.trim();
    if (!name || !food) {
      LifeApp.ui.toast('名称和食物不能为空');
      return false;
    }
    const calories = Number(document.getElementById('diet-recipe-calories').value) || 0;
    const protein = Number(document.getElementById('diet-recipe-protein').value) || 0;
    const recipes = LifeApp.store.data.diet.recipes;
    if (isEdit) {
      const recipe = recipes.find(function (r) { return r.id === id; });
      if (recipe) Object.assign(recipe, { name: name, food: food, calories: calories, protein: protein });
    } else {
      recipes.push({ id: LifeApp.store.uid(), name: name, food: food, calories: calories, protein: protein });
    }
    LifeApp.store.save();
    render(containerRef, ctxRef);
    LifeApp.ui.toast(isEdit ? '菜谱已更新' : '菜谱已添加');
    return true;
  }

  function deleteRecipe(id) {
    LifeApp.ui.confirm('确定删除这个菜谱吗？').then(function (ok) {
      if (!ok) return;
      const recipes = LifeApp.store.data.diet.recipes;
      const idx = recipes.findIndex(function (r) { return r.id === id; });
      if (idx !== -1) recipes.splice(idx, 1);
      LifeApp.store.save();
      render(containerRef, ctxRef);
      LifeApp.ui.toast('菜谱已删除');
    });
  }

  return {
    render: render
  };
});
