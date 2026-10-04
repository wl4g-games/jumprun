<div align="center">

# Animal Jump Run · 动物跳跳跑

**Sixteen runners, wild obstacles, and one more jump.**<br>
**十六种弹跳伙伴，百变动物障碍；跳一下，跑更远。**

<p>
  <a href="https://wl4g-games.github.io/jumprun/"><img src="https://img.shields.io/badge/%E2%96%B6%20PLAY%20NOW-%E7%AB%8B%E5%8D%B3%E5%BC%80%E7%8E%A9-568445?style=for-the-badge" alt="Play Animal Jump Run · 立即开玩" height="42"></a>
  <a href="https://github.com/wl4g-games/jumprun/actions/workflows/ci.yml"><img src="https://github.com/wl4g-games/jumprun/actions/workflows/ci.yml/badge.svg?event=pull_request" alt="Pull request CI status" height="28"></a>
  <a href="https://github.com/wl4g-games/jumprun/actions/workflows/release.yml"><img src="https://github.com/wl4g-games/jumprun/actions/workflows/release.yml/badge.svg?branch=main&event=push" alt="Release and deployment status" height="28"></a>
</p>

Play in your browser · 打开即玩 · No install · 无需安装<br>
Jump with your body, or enable protected manual controls · **体感跳跃 / 可选防沉迷手动操作**

**Default runner: 🦖 T. rex · 默认角色：霸王龙**

<sub>🦖 🐆 🐇 🦁 🐘 🦒 🐼 🦊 🐒 🐧 🐅 🦅 🐗 🐲 🦍 🦧</sub>

</div>

## About · 游戏简介

Animal Jump Run is a browser-based 3D endless runner. Choose a jumping animal, collect carrots, clear increasingly varied obstacles, and keep your rhythm as the world speeds up.

《动物跳跳跑》是一款浏览器 3D 无尽跑酷游戏。选择喜欢的动物，追逐胡萝卜、跨越逐渐丰富的障碍，在不断加速的世界中挑战最好成绩。

## What is new · 改造内容

- **16 runners · 十六种角色：**默认霸王龙，还可选择豹子、兔子、狮子、大象、长颈鹿、熊猫、狐狸、猴子、企鹅、老虎、老鹰、野猪、哥斯拉、金刚和刀疤王。
- **Articulated 3D runners · 真实关节角色：**14 个本地静态源 GLB 经过统一的运行时蒙皮管线生成 16 个角色；双足、四足、指关节跑和鹰类地面/展翅步态分别驱动髋、膝、踝、脚掌、脊柱、头、尾与翅膀，跳跃时使用各物种独立的收腿和配重姿态。
- **Dynamic coats · 动态毛发：**11 个毛皮、鬃毛或刚毛角色与 2 个羽毛角色按物种分区，奔跑与腾空时依据速度和垂直运动产生连续风摆；霸王龙、大象与哥斯拉不错误套毛，哥斯拉的程序化背棘阵列随根骨运动并带克制的二级摆动。
- **Species voices · 动物声音：**落地持续奔跑约 5 秒会轻声播放对应物种录音或明确标注的科学/角色化替代音源；16 个角色各有独立的趣味失败旋律。霸王龙与哥斯拉采用不同变速的鳄类拟声，金刚与刀疤王采用不同变速的灵长类录音，不伪称已灭绝或虚构角色的“真实录音”。
- **Progressive obstacles · 渐进障碍：**开局从仙人掌开始，随后随机出现豺、狼、虎、豹、野猪、剑齿虎，以及麒麟、貔貅、饕餮等上古神兽。
- **Two control modes · 两种操作：**默认使用前置摄像头体感跳跃且无需答题；也可启用按键/点按模式，此时默认启用防沉迷答题锁。
- **Protected manual play · 手动防沉迷：**手动模式默认每进行 5 分钟有效游戏弹出题目，答对 1 题才可继续；倒计时与到期锁独立持久化，换动物、改设置或刷新都不会“续命”。
- **Parent administration · 家长管理：**管理员验证密码后，可在当前浏览器持久开启或关闭自动答题锁；密码仅保存本地加盐 PBKDF2 摘要，不保存明文、不上传。
- **100-question bank · 百题题库：**按 `4:5:3:4:4:4:3:3` 权重覆盖趣味语文、实用数学、日常英语、趣味地理、物理科学、中国历史、世界历史与金融交易，面向约 12 岁的小朋友，兼顾趣味、实用与批判思考。
- **Local motion recognition · 本地体感识别：**延续原项目的本地 MediaPipe Pose Landmarker 与已训练 MLP 跳跃识别，不上传摄像头画面。
- **Persistent preferences · 设置持久化：**动物、控制模式、答题选项、管理员开关与全局倒计时状态分别保存在浏览器 localStorage，避免修改普通设置时意外重置答题锁。
- **Bilingual UI · 双语界面：**界面和全部 100 道题均支持中英文，默认跟随浏览器语言，也可随时切换。

## Pick your runner · 选择弹跳伙伴

| | Animal · 动物 | | Animal · 动物 |
|---|---|---|---|
| 🦖 | **霸王龙 · T. rex（默认）** | 🐆 | 豹子 · Leopard |
| 🐇 | 兔子 · Rabbit | 🦁 | 狮子 · Lion |
| 🐘 | 大象 · Elephant | 🦒 | 长颈鹿 · Giraffe |
| 🐼 | 熊猫 · Panda | 🦊 | 狐狸 · Fox |
| 🐒 | 猴子 · Monkey | 🐧 | 企鹅 · Penguin |
| 🐅 | 老虎 · Tiger | 🦅 | 老鹰 · Eagle |
| 🐗 | 野猪 · Wild boar | 🐲 | 哥斯拉 · Godzilla |
| 🦍 | 金刚 · Kong | 🦧 | 刀疤王 · Skar King |

所有角色都使用同一套跑酷规则，选择会改变 PBR 造型、步态、毛发或羽毛风动、叫声和失败音乐，但不会带来数值优势。16 个角色共用 14 个本地 CC0 源 GLB：哥斯拉复用霸王龙源网格，刀疤王复用黑猩猩源网格，其余角色（包括使用独立银背大猩猩源网格的金刚）均有独立源文件。两者均为项目自制的运行时变体配方；项目不含第三方影视模型，亦不代表相关权利方或获得其背书。

## How to play · 操作方式

| | Manual · 手动（需启用） | Motion · 体感（默认） |
|---|---|---|
| **Start · 开始** | Press Space / ↑ or tap · 按键或点按画面 | Jump once · 原地跳一次 |
| **Jump · 跳跃** | Press Space / ↑ or tap · 按键或点按画面 | Jump in place · 原地起跳 |
| **Try again · 重来** | Press Space / ↑ or tap · 按键或点按画面 | Jump once after a fall · 摔倒后跳一次 |
| **Quiz · 答题** | Required while parent lock is enabled · 管理员锁启用时到时强制答题 | None · 无需答题 |

- 吃到一颗胡萝卜获得 1 颗星，错过胡萝卜不会失败。
- 越过障碍可获得星星；障碍大小和起跳准确度会影响奖励。
- 随着成绩和速度提高，野生动物、史前动物、神兽及双障碍会逐步加入。
- 没有摄像头时，可在“选择动物与控制方式”中启用手动模式；此模式默认强制定时答题，家长管理员可在验证后关闭答题锁。

体感模式固定请求前置摄像头，不再列出手机的后置、超广角或组合镜头。授权后短暂站稳完成校准，头部或上半身入镜即可，不要求拍到脚；右上角预览会绘制识别到的骨架点和连线。请预留安全、开阔的活动空间。

## Manual controls and quiz · 手动操作与答题

首次进入时可以选择动物和控制方式，保存后会写入 localStorage；之后刷新直接使用上次选择，也可以随时重新打开设置：

- 默认采用体感模式：只接受身体起跳，不计时、不弹题。
- 启用手动模式后，空格、上方向键和点按游戏画面可触发跳跃，同时默认启用自动答题锁。
- 手动模式默认每轮 **5 分钟**，可选择 **1 / 5 / 10 / 15 / 20 / 30 分钟**。
- 可设置答对 **1 / 2 / 3 题**后继续，默认答对 **1 题**。
- 到时游戏画面完全暂停；答错会显示讲解并自动随机切换下一题，弹窗不会消失；达到正确题数后自动关闭并重置一轮时间。
- 只有手动游戏实际进行时才计时，设置、答题和其他暂停状态不消耗时间。
- 倒计时与“已到期”状态是全局的：切换动物、关闭再开手动模式、重新保存设置或刷新页面都不会增加剩余时间。改成更长时长仅在答题成功后的下一轮生效，改成更短时长则会立即收紧当前轮。

“管理员”按钮用于管理自动答题锁。首次请由家长设置至少 6 位密码，之后每次开启或关闭都需要验证；关闭并不删除已到期的锁，重新开启时仍会继续要求答题。这是纯静态网页的本地家长保护：清除站点数据、使用无痕模式或开发者工具可以绕过，因此不等同于操作系统级家长控制。

题库的八类抽题权重为：趣味语文语言 **4**、实用应用数学 **5**、日常英语 **3**、常识/趣味地理 **4**、趣味物理科学 **4**、中国历史 **4**、有意义的世界历史 **3**、金融/交易 **3**。中国历史题同时练习用证据看制度、工程与传统的价值和代价，不把有害旧习俗包装成美德。

## Motion detection · 本地体感识别

体感识别全程在浏览器本地运行：

```text
Camera video
  → MediaPipe Pose Landmarker (VIDEO / detectForVideo)
  → pose landmarks and motion features
  → trained local MLP jump detector
  → game jump
```

Pose Landmarker 模型、MediaPipe WASM 和 MLP 权重均随站点静态发布。识别使用独立的视频帧循环，不依赖 3D 渲染是否已完成；运行时不依赖识别服务器、不上传视频，也不使用麦克风。摄像头权限要求通过 **HTTPS** 或 `localhost` 访问。

## Run locally · 本地运行

需要 Node.js 22 或更新版本。

```sh
npm ci
npm run dev
```

运行测试与生产构建：

```sh
npm test
npm run build
npm run preview
```

## Container image · 容器镜像

每次发布都会生成一个 `linux/amd64` 静态站点镜像，同时提供版本标签和 `latest` 标签：

```sh
docker run --rm --name jumprun -p 8080:8080 \
  ghcr.io/wl4g-games/jumprun:latest
```

启动后访问 <http://localhost:8080/>。镜像使用非 root NGINX 提供静态文件，并内置健康检查；通过远程主机访问且需要摄像头时，请在前面配置 HTTPS。

## CI, release and deployment · 持续集成与自动发布

[Pull Request CI](.github/workflows/ci.yml) 会在 PR 创建或更新时动态维护一条 started/final 状态评论，同时安装依赖、运行全部测试并验证生产构建；旧运行不会覆盖新运行的评论。代码进入 `main` 后，[release workflow](.github/workflows/release.yml) 会自动执行：

```text
版本计算 → npm ci → Vite build
        → jumprun-vX.Y.Z-dist.tar.gz → GitHub Release
             ├→ linux/amd64 image → ghcr.io/wl4g-games/jumprun
             └→ GitHub Pages deploy
```

首次发布使用 `package.json` 中的稳定版本；后续根据提交类型递增语义版本，并在重复运行同一提交时复用已有标签。完整规则见 [CI/CD architecture](.github/workflows/README.md)。

仓库首次启用 Pages 时，请在 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。之后代码每次进入 `main`（合并或直接推送）都会创建 GitHub Release，并自动更新：<https://wl4g-games.github.io/jumprun/>

## License and credits · 许可与致谢

Code: [MIT](LICENSE). Original artwork: [CC BY 4.0](ASSET-LICENSE). Third-party assets retain their own licenses; see [notices](licenses/NOTICE).

代码使用 MIT 许可，原始美术使用 CC BY 4.0。第三方资源遵循各自许可，详见许可声明。使用、修改或商用时，请保留所需署名与许可信息。

感谢 [guigulaoshi](https://github.com/guigulaoshi) 创作并开源原版 [Bunny Run](https://github.com/guigulaoshi/bunny-run)，本项目在其基础上继续改造。
