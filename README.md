# 浊堤

账本三部曲第一部。中篇小说，二十章。嘉靖四十年，浙西小县，户房书办沈默。

纯静态网页，没有构建步骤。正文和资料放在 `chapters/`、`data/` 里，网页打开时现场读取、排版，所以**可以直接在 GitHub 上改字**。

## 改正文

正文在 `chapters/` 文件夹，一章一个文件：`ch01.md` 是第一章，`ch20.md` 是第二十章。

在 GitHub 上点开那一章 → 右上角铅笔图标（Edit）→ 直接改字 → 页面底部 **Commit changes**。一两分钟后网页自动更新（读者那边刷新一下）。

写法规则（照原样保持）：

- 第一行 `## 第一章　章名`，改这里就是改章名。“第一章”和章名之间是一个全角空格。
- 一段一行，段与段之间空一行。
- 单独一行 `---` 是分节的三个小圆点。
- 引号用 `"` 或 `“”` 都行，网页会排成弯引号。

**抄录的文书、竹纸记录、批语（楷体加一道朱线）是按“整段原文”对应的。**
这类段落改了字，要把 `data/book.json` 里 `chao` 列表中同样的那句也改成一样，否则它会退回成普通段落（不会白屏，只是少了楷体和朱线）。想让新的一段也排成抄录样式，把整段原文加进 `chao` 列表即可。

## data/ 里的文件（也能在 GitHub 上直接改）

| 文件 | 管什么 |
| --- | --- |
| `data/book.json` | 书名、扉页题记（epigraph）、页脚、目录下的说明、三部曲链接（series_nav）、时间线页的导语（timeline_lede）、抄录段落列表（chao） |
| `data/characters.json` | 人物卡：身份（role）、简介（intro）、出场事件（events，ch 是章号）、关系（rel）；`mark` 是正文里自动标出的称呼 |
| `data/timeline.json` | 时间线：日期（d）、标题（t）、说明（s）、所在章（ch）、人物（who） |
| `data/recaps.json` | 每章开头的前情提要：`"5": "……"` 是第五章开头显示的那段 |

只改引号里的中文，引号、逗号、括号保持原样。某个文件格式写错了，网页会改用 `index.html` 里原来的那份，不会白屏（浏览器控制台会提示哪个文件没读到）。

## 上线

1. 把本目录里的**全部文件**（含 `chapters/`、`data/`、`fonts/` 文件夹和 `.nojekyll`）放在仓库根目录。
2. 仓库 Settings → Pages → Source 选 `Deploy from a branch`，Branch 选 `main`，目录选 `/ (root)`。
3. 等一两分钟，打开 `https://<用户名>.github.io/<仓库名>/`。

用网页上传时文件夹被拆平了也没关系：加载器找不到 `chapters/`、`data/` 里的文件，会到根目录找同名文件。

本地预览：在本目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/`。直接双击 index.html 读不到正文，需要放到网站上。

## 其他文件

| 文件 | 作用 |
| --- | --- |
| `index.html` | 入口，内含全书和资料的备份 |
| `loader.js` | 读取 chapters/ 和 data/，排好版交给阅读器 |
| `reader.js` / `reader.css` | 阅读器内核（路由、排版、字号、底色、进度） |
| `features.js` / `features.css` | 人物检索与关系图、时间线、全文搜索、划线批注书签金句卡、我的书房 |
| `theme.css` | 浊堤的外观：浅绿羊皮纸、线装书封、朱印章号、竖排章名、抄录样式 |
| `scene.js` / `zd.js` | 章首落雨、听雨、大写章号、书封落雨 |
| `fonts/`、`fonts.css` | 思源宋体（Noto Serif SC）子集，SIL Open Font License 1.1 |
| `ch01.html` … `ch20.html` | 旧版每章单页的地址，打开后跳到 `index.html#chNN` |
