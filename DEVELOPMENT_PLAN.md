# 工作生活专属 App 开发计划

- 版本：v1.0
- 日期：2026-08-10
- 依据：PRD.md v1.0
- 状态：已完成（2026-08-10，151 项测试全部通过）

## 1. 开发目标与技术方案

按照 PRD 做第一个可本地使用的版本：双击打开即用，不启动服务、不联网、数据保存在浏览器 localStorage。

技术方案：

- 纯 HTML + CSS + 原生 JavaScript，不使用框架、构建工具和外部依赖
- 多个本地文件，双击 index.html 即可运行；不使用 ES Module，避免 file:// 协议下的 CORS 限制，所有脚本用普通 `<script src>` 顺序加载
- 全局命名空间 `LifeApp`，分为 store（数据层）、ui（通用组件）、views（各模块视图）、app（入口和导航）
- 数据使用 localStorage，每次操作后立即保存
- 使用 CSS 变量实现主题色和列表密度

## 2. 文件结构

```text
海星的app/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── storage.js      数据模型、读写、迁移、导出导入、日期工具
    ├── ui.js           弹窗、确认框、toast、空状态等通用组件
    ├── views/
    │   ├── home.js     首页总览
    │   ├── plan.js     今日计划
    │   ├── media.js    自媒体
    │   ├── campus.js   校招进展
    │   ├── product.js  产品工作
    │   ├── fitness.js  健身计划
    │   ├── diet.js     饮食计划
    │   ├── game.js     游戏娱乐
    │   └── settings.js 数据与设置
    └── app.js          初始化、导航、模块开关、主题应用
```

index.html 的脚本加载顺序：

```html
<script src="js/storage.js"></script>
<script src="js/ui.js"></script>
<script src="js/views/plan.js"></script>
<script src="js/views/home.js"></script>
<script src="js/views/media.js"></script>
<script src="js/views/campus.js"></script>
<script src="js/views/product.js"></script>
<script src="js/views/fitness.js"></script>
<script src="js/views/diet.js"></script>
<script src="js/views/game.js"></script>
<script src="js/views/settings.js"></script>
<script src="js/app.js"></script>
```

## 3. 数据模型

localStorage 键：`lifeApp.data.v1`，值为一个 JSON 对象，结构如下：

```json
{
  "version": 1,
  "updatedAt": "2026-08-10T12:00:00.000Z",
  "notes": [
    { "id": "n1", "text": "给电脑充电", "done": false, "createdAt": "2026-08-10T08:00:00.000Z" }
  ],
  "plans": {
    "2026-08-10": [
      { "id": "p1", "title": "完成 PRD", "time": "09:00", "priority": "high", "source": "product", "done": false }
    ]
  },
  "media": {
    "accounts": [
      { "id": "a1", "platform": "小红书", "name": "我的账号", "followers": 0, "works": 0 }
    ],
    "contents": [
      { "id": "c1", "title": "选题 A", "platform": "小红书", "status": "idea", "publishDate": "", "note": "" }
    ],
    "dailyStats": [
      { "id": "s1", "date": "2026-08-10", "playCount": 0, "followersDelta": 0 }
    ]
  },
  "campus": {
    "records": [
      {
        "id": "r1",
        "company": "某公司",
        "position": "产品经理",
        "appliedAt": "2026-08-10",
        "status": "applied",
        "nextAction": "准备笔试",
        "deadline": "2026-08-15",
        "timeline": [
          { "id": "t1", "date": "2026-08-10", "stage": "已投递", "note": "" }
        ],
        "note": ""
      }
    ]
  },
  "product": {
    "projects": [
      {
        "id": "pr1",
        "name": "工作生活 App",
        "desc": "个人项目",
        "requirements": [
          { "id": "q1", "title": "首页摘要", "priority": "P0", "status": "done" }
        ],
        "sprints": [
          { "id": "sp1", "name": "V1", "start": "2026-08-10", "end": "2026-08-17", "items": [] }
        ],
        "todos": [
          { "id": "td1", "text": "写开发计划", "done": true }
        ],
        "logs": [
          { "id": "lg1", "date": "2026-08-10", "content": "确认 PRD" }
        ]
      }
    ]
  },
  "fitness": {
    "plans": [
      {
        "id": "f1",
        "name": "胸部训练",
        "schedule": "周一",
        "exercises": [
          { "id": "e1", "name": "卧推", "sets": 4, "reps": 10, "weight": 50 }
        ]
      }
    ],
    "logs": [
      {
        "id": "fl1",
        "date": "2026-08-10",
        "planId": "f1",
        "exercises": [
          { "id": "e1", "name": "卧推", "sets": 4, "reps": 8, "weight": 50 }
        ],
        "note": ""
      }
    ],
    "metrics": [
      { "id": "m1", "date": "2026-08-10", "weight": 65, "bodyFat": 18 }
    ]
  },
  "diet": {
    "days": [
      {
        "id": "d1",
        "date": "2026-08-10",
        "meals": [
          { "id": "m1", "type": "breakfast", "food": "鸡蛋", "calories": 80 }
        ]
      }
    ],
    "water": [
      { "id": "w1", "date": "2026-08-10", "cups": 4 }
    ],
    "recipes": [
      { "id": "rc1", "name": "鸡胸肉沙拉", "food": "鸡胸肉 150g、生菜", "calories": 300 }
    ]
  },
  "games": {
    "library": [
      { "id": "g1", "name": "塞尔达", "status": "playing", "rating": 9, "review": "" }
    ],
    "sessions": [
      { "id": "gs1", "date": "2026-08-10", "gameId": "g1", "minutes": 90, "note": "" }
    ],
    "wishlist": [
      { "id": "gw1", "name": "某新游戏", "price": 199 }
    ]
  },
  "settings": {
    "accent": "blue",
    "density": "normal",
    "hiddenModules": []
  }
}
```

约定：

- 所有日期键统一为本地时区 `YYYY-MM-DD` 字符串
- 所有 id 用 `uid()` 生成：时间戳 + 随机数
- `version` 固定为 1，后续升级时在 `storage.js` 的 `migrate()` 中做迁移
- 模块开关用模块 id 列表：`home, plan, media, campus, product, fitness, diet, game, settings`
- `hiddenModules` 只控制显示，不清除数据

## 4. 通用组件与编码约定

storage.js 提供：

- `LifeApp.store.load()`：读取并迁移数据，无数据时返回默认结构
- `LifeApp.store.save()`：写回 localStorage 并更新时间戳
- `LifeApp.store.reset()`：清空并写默认结构
- `LifeApp.store.export()`：返回当前数据 JSON 字符串
- `LifeApp.store.importJson(text)`：解析并校验后覆盖当前数据
- `LifeApp.store.migrate(raw)`：旧数据升级入口
- `LifeApp.store.uid()`：生成 id
- `LifeApp.store.dateKey(date)`、`todayKey()`、`addDays(key, n)`：日期工具
- `LifeApp.store.getModuleSummary(id)`：返回首页摘要卡片数据

ui.js 提供：

- `LifeApp.ui.modal({ title, bodyHtml, onSubmit })`：通用弹窗
- `LifeApp.ui.confirm(message)`：返回 Promise 的二次确认框
- `LifeApp.ui.toast(message)`：短暂提示
- `LifeApp.ui.emptyState(text, actionHtml)`：空状态
- `LifeApp.ui.esc(html)`：转义用户输入

每个视图文件挂载到 `LifeApp.views`，统一实现：

```js
LifeApp.views.plan = {
  render(container) { /* 全量渲染并绑定事件 */ },
  summary() { /* 返回首页摘要数据 */ }
};
```

渲染约定：

- 每次数据变化后全量重渲染当前模块，保持实现简单
- 事件绑定在 render 内完成，行内操作用 `data-action` 区分
- 所有用户输入必须经过 `LifeApp.ui.esc()` 转义
- 所有删除、清空、覆盖导入必须走 `confirm()`
- 快速备忘的“回车即记”必须监听 `compositionend`，避免中文输入法回车误提交
- 每次修改数据后调用 `LifeApp.store.save()`，不设手动保存按钮

## 5. 阶段计划总览

| 阶段 | 内容 | 对应 PRD |
| --- | --- | --- |
| 0 | 项目骨架、侧边栏导航、模块切换 | 2 |
| 1 | 数据层、通用组件、主题和模块开关基础 | 7、8 |
| 2 | 今日计划 + 快速备忘 | 5 |
| 3 | 首页总览 | 3、6 |
| 4 | 自媒体 | 5 |
| 5 | 校招进展 | 5 |
| 6 | 产品工作 | 5 |
| 7 | 健身计划 | 5 |
| 8 | 饮食计划 | 5 |
| 9 | 游戏娱乐 | 5 |
| 10 | 数据与设置完善：统计、备份、恢复、清空 | 7 |
| 11 | 联调与按验收标准逐条检查 | 10 |

## 6. 各阶段详细任务

### 阶段 0：项目骨架与导航

任务：

1. 创建 index.html，包含侧边栏（9 个导航项）、顶部标题区、内容区
2. 创建 css/styles.css，定义布局、CSS 变量、组件基础样式
3. 创建 app.js：点击导航切换模块、当前项高亮、调用对应视图 render
4. 先创建 storage.js 和 ui.js 的占位版本，保证页面能打开

完成标志：

- 双击 index.html 能打开，9 个导航项可切换，内容区能显示模块名
- 当前模块有高亮

### 阶段 1：数据层、通用组件、设置基础

任务：

1. 实现 storage.js：默认数据、load/save/reset、uid、日期工具、migrate
2. 实现 ui.js：modal、confirm、toast、emptyState、esc
3. 在 app.js 启动时读取 settings 并应用主题色和密度
4. 实现模块开关的最小逻辑：settings.hiddenModules 过滤侧边栏
5. 实现 settings 视图的第一版：主题色选择、密度选择、模块开关

完成标志：

- 刷新页面数据不丢
- 主题色和密度切换后立即生效
- 关闭模块后侧边栏不显示该模块，重新开启后恢复

### 阶段 2：今日计划 + 快速备忘

今日计划任务：

1. 实现 plans 数据结构按日期存放
2. 实现日期导航：前一天、后一天、回到今天
3. 实现任务列表：标题、时间、优先级徽章、来源标签、完成勾选、编辑、删除
4. 新增/编辑弹窗字段：标题、时间、优先级（高/中/低）、来源（无/自媒体/校招/产品工作/健身/其他）
5. 计算当天完成率并显示进度条

快速备忘任务：

1. 实现 notes 列表，输入框回车即记
2. 支持勾选完成和删除
3. 快速备忘展示在首页，也支持在首页新增

完成标志：

- 今日计划可跨日期查看，勾选后进度条更新，刷新后保留
- 快速备忘回车新增，刷新后保留
- 删除任务和删除备忘有二次确认

### 阶段 3：首页总览

任务：

1. 实现 home 视图：日期和欢迎区、今日计划进度与清单、快速备忘、模块摘要卡片
2. 今日计划区域点击“去今日计划”跳转 plan 模块
3. 摘要卡片读取 `getModuleSummary()`，过滤 hiddenModules
4. 点击摘要卡片跳转到对应模块
5. 每个模块开发时同步补充自己的 summary()，阶段 11 统一核对

完成标志：

- 首页显示全部四块内容
- 无数据时各区域显示空状态和新增按钮

### 阶段 4：自媒体

任务：

1. 账号区：平台、账号名、粉丝数、作品数，增删改
2. 内容区：标题、平台、状态（灵感/选题/草稿/已发布）、发布时间、备注
3. 状态流转：条目上的“下一步”按钮或状态下拉，支持灵感→选题→草稿→已发布
4. 按天数据：日期、播放量、涨粉数，增删改
5. 发布日历：简单月历，已发布内容按日期显示，点击日期看当天发布列表

完成标志：

- 账号、内容、数据记录均可增删改
- 内容状态可流转，发布日历能看到已发布内容

### 阶段 5：校招进展

任务：

1. 顶部统计：投递总数、面试中、Offer 数，随数据实时变化
2. 记录列表按状态分组：准备中/已投递/笔试/面试/Offer/已放弃
3. 新增记录弹窗：公司、岗位、投递时间、当前状态、下一步行动、截止时间、备注
4. 记录卡片显示关键字段，点击展开详情
5. 详情内可添加流程时间线节点：日期、阶段、备注
6. 状态修改：卡片内状态下拉或按钮流转

完成标志：

- 新增记录后出现在对应分组，统计同步更新
- 时间线可添加节点，详情可编辑

### 阶段 6：产品工作

任务：

1. 项目列表在左侧，右侧显示选中项目详情
2. 项目增删改：名称、描述
3. 项目内四个标签页：需求池、迭代计划、本周待办、工作日志
4. 需求池：标题、优先级 P0/P1/P2、状态 待排期/进行中/已完成/砍掉
5. 迭代计划：迭代名称、起止日期、条目列表
6. 本周待办：文本待办，可勾选完成
7. 工作日志：按天新增、编辑、删除

完成标志：

- 多项目可切换，项目内四个标签页均可增删改

### 阶段 7：健身计划

任务：

1. 训练计划列表：名称、每周安排（如“周一”）
2. 每个计划包含动作列表：动作名、组数、次数、重量
3. 打卡：选择计划，按动作填写实际组数、次数、重量，保存为训练记录
4. 训练记录按日期查看
5. 身体指标：日期、体重、体脂，最近记录列表和简单变化提示（如“较上次 -0.5kg”）

完成标志：

- 计划、动作、打卡、指标均可增删改
- 打卡后首页摘要能显示“今天练胸”之类信息

### 阶段 8：饮食计划

任务：

1. 日期导航，按天查看三餐和加餐
2. 每餐记录：食物、大致热量，可增删改
3. 顶部显示当天合计热量
4. 菜谱库：名称、包含食物、热量；记录餐食时可从菜谱选择并填充
5. 饮水打卡：当天杯数，可加减

完成标志：

- 三餐和加餐可记录，热量合计正确
- 菜谱可复用，饮水杯数刷新后保留

### 阶段 9：游戏娱乐

任务：

1. 游戏库：名称、状态（在玩/想玩/已通关/弃坑）、评分、感想，增删改
2. 游玩记录：日期、关联游戏、时长分钟、感想，增删改
3. 心愿单：名称、预计价格，增删改
4. 顶部统计：本月游玩时长（小时）、游戏总数

完成标志：

- 游戏库、游玩记录、心愿单均可增删改
- 本月游玩时长统计正确

### 阶段 10：数据与设置完善

任务：

1. 数据概览：各模块条目数量
2. 导出备份：生成 `life-app-backup-YYYY-MM-DD.json` 下载
3. 恢复导入：文件选择、解析校验、确认后覆盖当前数据
4. 清空数据：二次确认后重置默认结构
5. 外观设置：主题色、列表密度
6. 模块开关：显示/隐藏模块

完成标志：

- 导出文件可正常解析且包含全部模块数据
- 清空后为空，导入后恢复

### 阶段 11：联调与验收

任务：

1. 按 PRD 第 10 节 20 条验收标准逐条检查，记录结果
2. 修正发现的问题
3. 补充每个模块首页摘要的显示
4. 检查空状态、删除确认、模块开关、主题切换在真实浏览器中的表现

完成标志：

- 20 条验收标准全部通过

## 7. 验收标准对照

| PRD 验收项 | 检查方式 |
| --- | --- |
| 1 打开即用 | 直接双击 index.html，断网状态下打开 |
| 2 导航 | 点击 9 个导航项，确认高亮和内容切换 |
| 3 首页结构 | 首页四块区域都存在 |
| 4 备忘持久化 | 新增备忘、刷新、确认还在 |
| 5 今日计划 | 跨日期新增编辑删除勾选，进度更新 |
| 6 自媒体 | 账号/内容/数据记录增删改，状态流转，日历可见 |
| 7 校招 | 记录分组正确，状态流转，时间线可加，统计一致 |
| 8 产品工作 | 项目、需求、迭代、待办、日志均可操作 |
| 9 健身 | 计划、动作、打卡、指标均可操作 |
| 10 饮食 | 餐食记录、热量合计、菜谱选择、饮水打卡 |
| 11 游戏 | 游戏库、记录、心愿单、时长统计 |
| 12 刷新不丢 | 每个模块抽样新增一条并刷新验证 |
| 13 重启不丢 | 关闭浏览器重新打开验证 |
| 14 导出可用 | 下载 JSON，检查包含 version 和各模块字段 |
| 15 清空恢复 | 清空后导入备份，数据与导出前一致 |
| 16 二次确认 | 删除和清空都弹出确认 |
| 17 模块开关 | 关闭模块后导航和首页摘要隐藏，数据保留 |
| 18 外观生效 | 切换主题色和密度立即生效 |
| 19 空状态 | 空模块显示引导文字和新增按钮 |
| 20 即时保存 | 无手动保存按钮，操作后刷新仍保留 |

## 8. 风险与注意事项

- file:// 下 localStorage 在 Chrome/Edge 中可用；若个别浏览器限制，使用 Chrome/Edge 打开即可
- 中文输入时回车事件要先等 `compositionend`，避免拼音候选确认触发新增
- 导入备份前必须校验 JSON 的 version 和关键字段，失败时提示且不改动现有数据
- 清空和导入都是不可逆操作，一律二次确认
- 模块 id 在代码中固定，不要用用户输入作为存储键
- 开发过程中每完成一个阶段先按该阶段完成标志自测，再进行下一个阶段
