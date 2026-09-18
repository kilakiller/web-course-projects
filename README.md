# Web应用开发技术实验 · 课程作业仓库

课程名称：Web应用开发技术实验（课程代号 F2431514）
学生：钟腾　学号：24310210　班级：软工2402
指导老师：罗恺韵

> 目录约定：**一次实验 = 一个独立文件夹**，命名格式为 `实验N-主题/`，文件夹内自带 `index.html`、`style.css`（如有）、`README.md` 与 `images/` 截图。仓库根目录只放 `.gitignore` 和本说明。

## 目录结构

```
web-course-projects/
├── README.md                  # 仓库总览（本文件）
├── .gitignore
├── 实验1-个人简介/             # 实验1 HTML基础排版
│   ├── index.html
│   ├── README.md
│   ├── screenshot.png
│   └── images/
│       └── photo.png
└── 实验2-注册表单/              # 实验2 HTML5进阶综合训练
    ├── index.html
    ├── style.css
    ├── README.md
    └── images/
        ├── 01-页面整体.png
        ├── 02-提交数据收集.png
        ├── 03-DevTools调试.png
        └── 04-Console数据收集.png
```

## 作业列表

| 实验 | 主题 | 主要内容 | 状态 |
| --- | --- | --- | --- |
| 实验1 | [个人简介](./实验1-个人简介/) | HTML 基础标签：标题、段落、`<strong>` / `<em>`、`<hr>`、`<img>`、`<a>` | 已完成 |
| 实验2 | [用户注册页面](./实验2-注册表单/) | 列表（`<ul>` / `<ol>` / `<dl>`）、表格（`<thead>` / `<tbody>` / `rowspan` / `colspan`）、表单（各类 `<input>`、`<select>`、`<textarea>`、`required` / `pattern` 校验、FormData 数据收集） | 已完成 |
| 实验3 | 待添加 | — | 未开始 |

## 运行方式

1. 用 VS Code 打开对应实验的文件夹；
2. 右键 `index.html` → **Open with Live Server**；
3. 按 `F12` 打开 DevTools 检查 DOM 结构与 Console 输出。
