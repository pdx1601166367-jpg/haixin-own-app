# 工作生活专属 App

一个只在自己电脑上运行的工作生活管理工具，把今日计划、自媒体、校招求职、产品工作、健身、饮食和游戏娱乐集中在一个本地应用里。

## 特点

- 双击即用，无需服务器、登录或联网
- 数据保存在当前电脑的浏览器本地存储中，刷新、关闭、重启后不丢失
- 支持导出 JSON 备份、恢复导入和清空数据
- 三套界面外观：流光玻璃、笔记、硬边，均支持浅色 / 深色主题
- 全局搜索（Ctrl+K）、快速新增、手动保存和保存状态提示
- 每个模块都有符合自身场景的功能，不是统一的待办列表

## 快速开始

Windows 下双击 `启动.bat`，或者直接双击 `index.html`，用 Edge 或 Chrome 打开。

macOS 下双击 `启动.command`。如果首次双击被系统拦截，在“系统设置 → 隐私与安全性”中允许运行，或在终端执行：

```bash
chmod +x 启动.command
./启动.command
```

浏览器建议使用 Chrome 或 Edge。Safari 在 `file://` 下可能限制本地存储，如果打开后侧边栏底部提示“当前浏览器无法本地保存”，请改用 Chrome 或 Edge。

## 数据与备份

- 数据保存在浏览器的 localStorage 中，删除浏览器站点数据会导致数据丢失
- 建议定期在“数据与设置 → 数据备份”中导出 JSON 备份
- 恢复导入会覆盖当前全部数据，导入前会要求二次确认
- 切换浏览器或迁移电脑时，先导出备份，再到新环境导入

## 界面外观

在“数据与设置 → 外观”中切换：

- 流光玻璃：半透明毛玻璃卡片、柔和壁纸背景、2.5D 撞色图标
- 笔记：米白底色、轻度毛玻璃、黑色主按钮、红蓝绿统计数字
- 硬边：米色纸底、网格背景、2px 硬边框、偏移硬阴影

## 开发与测试

项目是纯 HTML/CSS/JavaScript，没有构建步骤。运行端到端测试需要 Node.js 18+ 和 Playwright：

```bash
npm install
npm test
```

如果 Playwright 没有安装到默认位置，可以设置 `PLAYWRIGHT_PATH` 指向它的安装目录；浏览器可执行文件路径可以通过 `BROWSER_PATH` 覆盖，默认会查找 Windows 上的 Edge 和 Chrome。

测试覆盖：

- 数据层单元测试：存储、迁移、导入导出、统计、搜索、月历
- 浏览器端到端测试：九个模块、全局搜索、快速新增、备份恢复、外观切换、布局稳定性
- PRD 第 10 节 20 条验收标准

## 项目结构

```text
index.html          应用入口
启动.bat            Windows 双击启动脚本
启动.command        macOS 双击启动脚本
css/                全局样式、设计系统、三套外观
js/                 存储层、通用组件、视图
assets/ambient/     流光外观使用的本地壁纸素材
tests/              单元测试与端到端测试
PRD.md              产品需求文档
DEVELOPMENT_PLAN.md 开发计划
OPTIMIZATION_NOTES.md 参考项目学习与优化记录
```

## 发布到 GitHub

```bash
git init
git add .
git commit -m "初始化工作生活专属 App"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

提交前请检查：

- `LICENSE` 中的版权信息替换为你的名字
- 本地 git 作者信息使用你自己的 `user.name` 和 `user.email`
- 不要在仓库中包含真实的个人数据备份文件

## 致谢

流光外观的壁纸素材来自 [TianyiDataScience/my-own-app](https://github.com/TianyiDataScience/my-own-app)，遵循 MIT 许可证，详见 `assets/ambient/CREDITS.md`。

## 许可证

MIT License
