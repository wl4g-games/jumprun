# 动物跳跳跑：架构总览

## 定位与边界

《动物跳跳跑》是一个纯静态、浏览器端运行的 3D 儿童无尽跑酷游戏。玩家可选择十六种动物，通过摄像头体感或受保护的手动操作跳跃、收集胡萝卜、跨越障碍；手动模式可由本地答题锁暂停。

项目**没有**应用服务端、业务 API、数据库、账号体系或遥测服务。本文只描述当前源码已经实现的结构；待做或可扩展事项见[开发交接文档](../development/HARDCOVER.md)。

## 总体结构

```text
index.html + src/main.js
        |
        +-- 设置、语言、全屏、分享、浏览器本地状态
        |
        +-- 体感模式 --------------------------------------------------+
        |  摄像头 -> MediaPipe 姿态 -> 本地 MLP -> game.jump()        |
        |                                                            |
        +-- 手动模式 -> ManualQuizTimer -> 答题弹窗 -> 答题会话 -------+
        |                                                            |
        v                                                            v
  createDinoGame() <--------------------------------------------- 游戏状态
        |                                                   阶段/分数/速度
        v
  createRunnerScene(canvas)
        |
        +-- Three.js 场景、灯光、地面、景物、胡萝卜、障碍
        +-- 本地 GLB -> 运行时蒙皮 -> 步态 / 毛发 / 音频配置
        v
      WebGL 画布 + Web Audio
```

体感所需的 Pose 模型、MediaPipe WASM、MLP 权重、GLB、纹理和音频均随静态站点发布。摄像头画面只在当前浏览器处理，不上传到服务器。

## 运行时流程

1. `index.html` 加载 `src/main.js`；Vite 解析并打包 ESM 依赖图。
2. `main.js` 读取本地设置，创建答题锁状态、答题计时器、各个弹窗、纯游戏状态，并启动 `requestAnimationFrame` 主循环。
3. 首次设置选择动物与输入模式；设置完成前，游戏交互保持锁定。
4. `createRunnerScene()` 异步加载动物外观。优先使用本地 GLB 运行时管线；若加载失败，退回程序化动物模型。
5. 进行游戏时，`dino-game.js` 更新游戏规则和状态；`runner-scene.js` 将该状态映射为 Three.js 画面。
6. 体感模式优先使用 `requestVideoFrameCallback`，否则使用动画帧，执行本地姿态识别和跳跃分类。
7. 手动模式中，只有真正进行的游戏时间会消耗 `ManualQuizTimer`；到时后答题弹窗暂停游戏，达到所需正确数才开始下一轮。
8. 设置、家长管理、答题、分享任一弹窗打开时，交互和游戏计时都会被阻止；画面可以停留在暂停状态。

## 源码目录与主要逻辑

```text
.
├── index.html                    页面语义骨架、画布、弹窗与操作控件
├── src/
│   ├── main.js                   应用装配根、浏览器事件与主循环
│   ├── style.css                 响应式、横屏、弹窗和游戏 UI 样式
│   ├── dino-game.js              游戏规则与运行中状态
│   ├── runner-scene.js           Three.js 渲染器和世界状态同步
│   ├── animal-*.js               动物目录、资源、蒙皮、步态、毛发、体型、音效
│   ├── obstacle-*.js             障碍解锁进程和障碍几何构造
│   ├── carrot.js、cactus.js、
│   │   forest-*.js、desert-scene.js、
│   │   cloud-*.js、sun-light.js  各自独立的景物/场景构造器
│   ├── learned-jump-detector.js、
│   │   jump-features.js、
│   │   motion-startup.js、
│   │   person-ready.js、
│   │   pose-overlay.js           本地姿态到跳跃的识别链路及提示 UI
│   ├── question-bank*.js、
│   │   question-options.js、
│   │   quiz-session.js、
│   │   quiz-dialog.js            题库、选项轮换、抽题、答题会话和弹窗
│   ├── manual-quiz-timer.js、
│   │   quiz-lock-state.js、
│   │   game-settings.js、
│   │   admin-lock*.js            本地家长策略、答题锁和持久化
│   ├── i18n.js                   以中文为主的静态中英文翻译字典
│   ├── fullscreen-controller.js、
│   │   share-score.js、share-card.js 平台能力和成绩分享
│   └── vendor/                   随仓库提交的 Three.js / GLTFLoader
├── public/
│   ├── models/                   Pose task、MLP JSON 和本地动物 GLB
│   ├── vendor/mediapipe/wasm/    postinstall 复制的离线 WASM
│   ├── audio/                    动物叫声和游戏音效资源
│   └── textures/                 静态渲染纹理
├── test/                         Node 内置测试运行器的测试集
├── scripts/sync-wasm.mjs         安装依赖后复制 MediaPipe WASM
├── Dockerfile                    Vite 多阶段构建 + 非 root NGINX
└── .github/workflows/            PR CI 和 main 分支发布工作流
```

### 应用装配、规则与渲染

| 模块 | 主要职责 | 修改边界 |
|---|---|---|
| `main.js` | DOM 查询、模式切换、摄像头生命周期、弹窗、RAF 主循环、音频事件和持久化接线。 | 保持为装配根。新增领域规则应先放进单一职责模块，再在此处连接。 |
| `dino-game.js` | 世界常量、难度、生成间隔/组合、跳跃物理、奖励、碰撞和分数状态。 | 保持不依赖 DOM 和 Three.js，便于快速测试。 |
| `runner-scene.js` | 渲染器、相机、光照、地面、对象池、动画时间更新和游戏状态到画面的映射。 | 只消费游戏状态，不应独立修改分数、碰撞或答题状态。 |
| `obstacle-catalog.js`、`obstacle-model.js` | 生成进程、物种配置和障碍视觉。 | 先在目录定义新物种/配置，再增加专门模型。 |
| 各景物模块 | 云、森林、沙漠、太阳、胡萝卜、终点玩具等单一视觉职责。 | 优先新增小构造器，避免把无关网格代码持续塞进 `runner-scene.js`。 |

### 动物外观管线

`animal-catalog.js` 是用户可选角色目录；`animal-assets.js` 将角色映射到本地资源与毛发配置。`animal-model-loader.js` 加载并缓存 GLB，然后执行：

```text
本地 GLB
  -> skinAnimalScene()             （标准化网格并生成小型骨架）
  -> attachAnimalCoat()            （可选实例化毛发/羽毛壳层）
  -> animateAnimalGait()           （每帧物种化地面/腾空姿态）
  -> 动物音频配置                   （叫声时机和播放参数）
```

`animal-skinner.js` 是静态资产与共享运行时骨架之间的专用边界；它通过体型、解剖和装饰数据处理差异，而不是每帧猜测资源。`animal-model.js` 是完整的程序化降级方案：高保真资源失败只能降低画面，不得阻止游戏开始。替换动物前必须调用 `disposeAnimalModel()` 释放旧实例。

### 体感输入

`main.js` 请求前置摄像头，目标为 640×480 / 30 fps。它加载本地 MediaPipe Pose Landmarker 和 `jump-visible-mlp.json`，由 `jump-features.js` 提取可见关键点分组和时间窗口，再交给 `LearnedJumpDetector` 分类。校准与人物缺失状态用于避免误跳；`pose-overlay.js` 只绘制本地预览。

体感模式要求 HTTPS 或 `localhost`；手动模式完全绕开摄像头识别链路。

### 答题锁与持久化

- `question-bank.js` 是中文题目、答案索引、科目权重和 ID 的权威数据；`question-bank.en.js` 提供同 ID 的英文文本；`question-options.js` 根据 ID 稳定轮换选项。
- `createWeightedQuestionPicker()` 在重置前会用尽全部题目，并维护短期不重复窗口。`createQuizSession()` 只累计正确答案；答错会继续下一题，不会解锁。
- `ManualQuizTimer` 只计算活跃的手动游戏时间；持久化状态包含剩余时间、是否到期和当前周期时长。
- 家长密码仅以加盐 PBKDF2 摘要保存于 `localStorage`，不是服务端凭据，只用于控制 UI，不能当作安全边界。
- `storage` 事件会在同源标签页间合并家长策略和锁状态，不会用远端标签页的动物/控制选择覆盖本地选择。

当前键名：`jump-run-settings-v2`、`jump-run-quiz-lock-state-v1`、`jump-run-quiz-admin-v1`、`bunny-run-accuracy-stars-best`。变更数据结构时，应保留迁移逻辑或启用新的版本化键名。

### UI 与平台能力

| 模块 | 作用 |
|---|---|
| `i18n.js` | 应用静态中英文文案并刷新动态 UI；题目翻译交由配对题库。 |
| `fullscreen-controller.js` | 优先使用原生全屏和可用时的方向锁定；否则使用 CSS 沉浸式回退。 |
| `share-score.js`、`share-card.js` | 生成文本/分享数据和本地 Canvas 成绩图；支持时调用 Web Share。 |
| `game-audio.js`、`animal-audio.js` | 惰性初始化 Web Audio、游戏音效、动物叫声、静音和奔跑叫声计时。 |
| `ready-animal.js`、`menu-jump.js`、`person-ready.js` | 开始/重开引导和已校准人物状态。 |

## 状态归属

| 状态 | 所有者 | 持久化 | 说明 |
|---|---|---|---|
| 阶段、速度、实体、分数 | `createDinoGame()` | 否 | 新一局时重置。 |
| Three.js 对象和当前动物实例 | `createRunnerScene()` | 否 | 替换时释放 GPU/对象资源。 |
| 动物选择和手动模式策略 | `game-settings.js` | `localStorage` | 加载时清洗，兼容 v1 迁移。 |
| 计时/到期锁 | `quiz-lock-state.js` + `ManualQuizTimer` | `localStorage` | 同源多标签共享。 |
| 家长密码摘要 | `admin-lock.js` | `localStorage` | 仅便利性 UI 门禁；清除站点数据即可绕过。 |
| 最佳分数 | `main.js` | `localStorage` | 独立于设置迁移。 |
| 摄像头流、Pose 模型、跟踪状态 | `main.js` | 否 | `stopCamera()` 和页面生命周期释放。 |

## 构建、测试与交付

`npm ci` 安装 Vite 与 MediaPipe，并由 `postinstall` 把所需 WASM 复制到 `public/vendor/mediapipe/wasm`。`npm run build` 生成 `dist/`；Vite 默认使用相对基路径，CI 会传入 GitHub Pages 基路径。Docker 生产镜像用 Node 22 Alpine 构建，再由非 root NGINX 在 8080 提供 `dist`。

```text
PR -> npm ci -> npm test -> Vite 生产构建

main push -> 计算版本 -> 同样构建 -> dist 压缩包 -> GitHub Release
                                               |-> GHCR linux/amd64 镜像
                                               +-> GitHub Pages 部署
```

发布工作流才是交付的事实来源；访问地址和运维命令见[交接文档](../development/HARDCOVER.md)。

## 测试策略

使用 Node 内置测试运行器（`node --test`），覆盖：

- 游戏机制、障碍、得分/奖励、设置和本地化；
- 每种动物的解剖、步态、体型、毛发行为和可降级渲染；
- 题库数量、ID 顺序、选项合法性、答案位置、英文对齐和抽题周期；
- 答题锁持久化与跨标签语义；
- 全屏状态、弹窗行为和静态 UI 合约。

摄像头授权、MediaPipe 性能、Audio 解锁、iOS 全屏回退和 Web Share 仍需真实设备验证。

## 架构不变量

1. 没有摄像头、或高保真 GLB 载入失败时，游戏仍必须可玩。
2. 除非未来有明确且经隐私评审的设计，摄像头处理必须保持本地。
3. 游戏规则应放在可测试模块，不能埋在 DOM 或 Three.js 代码中。
4. 设置、家长管理、答题、分享弹窗打开时，必须一致地阻止游戏输入和手动模式计时。
5. 本地家长控制不得描述成账号级或不可绕过的家长控制。
6. 题目 ID、顺序和中英文配对属于数据合约；需同一改动中更新并同步测试。
7. 新视觉资源必须保留许可/署名记录，并保留程序化降级方案。
