<div align="center">

# Animal Jump Run · 动物跳跳跑

**Ten runners, wild obstacles, and one more jump.**<br>
**十种弹跳伙伴，百变动物障碍；跳一下，跑更远。**

<p>
  <a href="https://wl4g-games.github.io/jumprun/"><img src="https://img.shields.io/badge/%E2%96%B6%20PLAY%20NOW-%E7%AB%8B%E5%8D%B3%E5%BC%80%E7%8E%A9-568445?style=for-the-badge" alt="Play Animal Jump Run · 立即开玩" height="42"></a>
  <a href="https://github.com/wl4g-games/jumprun/actions/workflows/ci.yml"><img src="https://github.com/wl4g-games/jumprun/actions/workflows/ci.yml/badge.svg" alt="Pull request CI status" height="28"></a>
  <a href="https://github.com/wl4g-games/jumprun/actions/workflows/release.yml"><img src="https://github.com/wl4g-games/jumprun/actions/workflows/release.yml/badge.svg" alt="Release and deployment status" height="28"></a>
</p>

Play in your browser · 打开即玩 · No install · 无需安装<br>
Jump with your body, or enable protected manual controls · **体感跳跃 / 可选防沉迷手动操作**

**Default runner: 🦖 T. rex · 默认角色：霸王龙**

</div>

## About · 游戏简介

Animal Jump Run is a browser-based 3D endless runner. Choose a jumping animal, collect carrots, clear increasingly varied obstacles, and keep your rhythm as the world speeds up.

《动物跳跳跑》是一款浏览器 3D 无尽跑酷游戏。选择喜欢的动物，追逐胡萝卜、跨越逐渐丰富的障碍，在不断加速的世界中挑战最好成绩。

本项目基于并感谢原项目 [Bunny Run](https://github.com/guigulaoshi/bunny-run) 改造。

## What is new · 改造内容

- **10 animals · 十种角色：**默认霸王龙，还可选择豹子、兔子、狮子、大象、长颈鹿、熊猫、狐狸、猴子和企鹅。
- **Progressive obstacles · 渐进障碍：**开局从仙人掌开始，随后随机出现豺、狼、虎、豹、野猪、剑齿虎，以及麒麟、貔貅、饕餮等上古神兽。
- **Two control modes · 两种操作：**默认使用前置摄像头体感跳跃且无需答题；也可启用按键/点按模式，并自动强制开启防沉迷答题。
- **Protected manual play · 手动防沉迷：**手动模式默认每进行 5 分钟有效游戏弹出题目，答对 1 题才可继续。
- **100-question bank · 百题题库：**语文、数学、英语、地理、物理各 20 题，面向约 12 岁的小朋友，兼顾趣味性与学习价值。
- **Local motion recognition · 本地体感识别：**延续原项目的本地 MediaPipe Pose Landmarker 与已训练 MLP 跳跃识别，不上传摄像头画面。
- **Persistent preferences · 设置持久化：**动物、控制模式和答题选项保存在浏览器 localStorage，首次设置后刷新不会重复询问。
- **Bilingual UI · 双语界面：**界面和全部 100 道题均支持中英文，默认跟随浏览器语言，也可随时切换。

## Pick your runner · 选择弹跳伙伴

| | Animal · 动物 | | Animal · 动物 |
|---|---|---|---|
| 🦖 | **霸王龙 · T. rex（默认）** | 🐆 | 豹子 · Leopard |
| 🐇 | 兔子 · Rabbit | 🦁 | 狮子 · Lion |
| 🐘 | 大象 · Elephant | 🦒 | 长颈鹿 · Giraffe |
| 🐼 | 熊猫 · Panda | 🦊 | 狐狸 · Fox |
| 🐒 | 猴子 · Monkey | 🐧 | 企鹅 · Penguin |

所有角色都使用同一套跑酷规则，选择只改变角色造型与个性，不会带来数值优势。

## How to play · 操作方式

| | Manual · 手动（需启用） | Motion · 体感（默认） |
|---|---|---|
| **Start · 开始** | Press Space / ↑ or tap · 按键或点按画面 | Jump once · 原地跳一次 |
| **Jump · 跳跃** | Press Space / ↑ or tap · 按键或点按画面 | Jump in place · 原地起跳 |
| **Try again · 重来** | Press Space / ↑ or tap · 按键或点按画面 | Jump once after a fall · 摔倒后跳一次 |
| **Quiz · 答题** | Required on timer · 到时强制答题 | None · 无需答题 |

- 吃到一颗胡萝卜获得 1 颗星，错过胡萝卜不会失败。
- 越过障碍可获得星星；障碍大小和起跳准确度会影响奖励。
- 随着成绩和速度提高，野生动物、史前动物、神兽及双障碍会逐步加入。
- 没有摄像头时，可在“选择动物与控制方式”中启用手动模式；手动模式会强制定时答题。

体感模式固定请求前置摄像头，不再列出手机的后置、超广角或组合镜头。授权后短暂站稳完成校准，头部或上半身入镜即可，不要求拍到脚；右上角预览会绘制识别到的骨架点和连线。请预留安全、开阔的活动空间。

## Manual controls and quiz · 手动操作与答题

首次进入时可以选择动物和控制方式，保存后会写入 localStorage；之后刷新直接使用上次选择，也可以随时重新打开设置：

- 默认采用体感模式：只接受身体起跳，不计时、不弹题。
- 启用手动模式后，空格、上方向键和点按游戏画面可触发跳跃，同时答题机制不可单独关闭。
- 手动模式默认每轮 **5 分钟**，可选择 **5 / 10 / 15 / 20 / 30 分钟**。
- 可设置答对 **1 / 2 / 3 题**后继续，默认答对 **1 题**。
- 到时游戏画面完全暂停；答错会显示讲解并自动随机切换下一题，弹窗不会消失；达到正确题数后自动关闭并重置一轮时间。
- 只有手动游戏实际进行时才计时，设置、答题和其他暂停状态不消耗时间。

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

[Pull Request CI](.github/workflows/ci.yml) 会在 PR 创建或更新时安装依赖、运行全部测试，并验证生产构建。代码进入 `main` 后，[release workflow](.github/workflows/release.yml) 会自动执行：

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

<p align="center">
  <a href="https://wl4g-games.github.io/jumprun/"><b>Play Animal Jump Run · 开始游戏</b></a><br>
  <sub>🦖 🐆 🐇 🦁 🐘 🦒 🐼 🦊 🐒 🐧</sub>
</p>
