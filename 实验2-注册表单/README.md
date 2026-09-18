# 第二次作业：用户注册页面

> 课程：Web应用开发技术实验（课程代号 F2431514）
> 实验项目：实验2 HTML5进阶综合训练
> 姓名：钟腾　学号：24310210　班级：软工2402　实验地点：E2-A504

**🔗 在线浏览（GitHub Pages）**：<https://kilakiller.github.io/web-course-projects/%E5%AE%9E%E9%AA%8C2-%E6%B3%A8%E5%86%8C%E8%A1%A8%E5%8D%95/>

**🎨 视觉设计**：页面 UI 参考主流 AI 产品官网（深色底、极光渐变光晕、玻璃拟态卡片、渐变文字、悬停发光、滚动淡入动画），全部使用纯 CSS（`backdrop-filter`、CSS 变量、`accent-color`、`clamp()`、`IntersectionObserver`）实现，未引入任何框架或外部资源。

## 一、作业内容

使用 HTML5 制作一个完整的「用户注册」页面，综合运用**列表、表格、表单**三大模块的知识。

页面包含五个部分：

| 模块 | 说明 |
| --- | --- |
| 页面头部 | `<header>` 包裹主标题与说明，`<nav>` 中放无序列表形式的锚点导航 |
| 注册须知 | `<ul>` 无序列表，列出注册前需要注意的 4 条事项 |
| 注册步骤 | `<ol>` 有序列表，按顺序列出 5 个注册步骤 |
| 注册表单 | `<form>` 表单主体，含文本框、密码框、单选框、复选框、日期、邮箱、电话、文件、下拉框、文本域、提交与重置按钮 |
| 会员权益对比 | `<table>` 表格，使用 `<thead>` / `<tbody>` / `<tfoot>` 分区，`rowspan` 与 `colspan` 合并单元格 |
| 常见问题 | `<dl>` 定义列表，给出 4 组术语与解释 |
| 页面底部 | `<footer>` 包裹版权信息 |

## 二、使用到的标签与属性

**结构标签**：`<!DOCTYPE>`、`<html>`、`<head>`、`<meta>`、`<title>`、`<link>`、`<body>`、`<header>`、`<nav>`、`<main>`、`<section>`、`<footer>`、`<h1>`~`<h3>`、`<p>`

**列表标签**：`<ul>`、`<ol>`、`<li>`、`<dl>`、`<dt>`、`<dd>`

**表格标签**：`<table>`、`<caption>`、`<thead>`、`<tbody>`、`<tfoot>`、`<tr>`、`<th>`、`<td>`，属性 `rowspan`、`colspan`、`scope`

**表单标签**：`<form>`、`<fieldset>`、`<legend>`、`<label>`、`<input>`、`<select>`、`<option>`、`<textarea>`、`<button>`、`<output>`

**input 的 type 类型**：`text`、`password`、`radio`、`checkbox`、`date`、`email`、`tel`、`file`

**核心属性**：`name`（提交字段名）、`value`、`placeholder`（占位提示）、`checked`（默认选中）、`selected`（下拉框默认选中）、`required`（必填校验）、`pattern`（正则校验）、`accept`、`multiple`、`rows` / `cols`、`action` / `method` / `enctype`

**label 的两种用法**：
1. `for` + `id` 关联（用户名、密码、性别等）：`<label for="username">用户名：</label><input id="username" ...>`
2. 包裹式（兴趣爱好、协议勾选）：`<label><input type="checkbox" name="hobby" value="reading"> 阅读</label>`

## 三、目录结构

```
实验2-注册表单/
├── index.html                  # 主页面（按实验要求命名）
├── style.css                   # 样式表
├── README.md                   # 作业说明
└── images/
    ├── 01-页面整体.png          # 页面整体效果截图
    ├── 02-提交数据收集.png      # 填写并提交后的数据收集结果
    └── 03-DevTools调试.png      # DevTools Elements + Console 面板截图
```

## 四、运行方式

1. 用 VS Code 打开本文件夹；
2. 右键 `index.html`，选择 **Open with Live Server**（或直接用 Chrome 打开）；
3. 填写表单后点击「注册」，页面中会回显收集到的数据；
4. 按 `F12` 打开 DevTools：
   - Elements 面板：查看 `<header>` / `<main>` / `<footer>` 语义化 DOM 结构；
   - Console 面板：查看 `console.log` 与 `console.table` 输出的表单数据。

## 五、表单数据收集

页面底部的 JavaScript 监听了表单的 `submit` 事件：

```js
form.addEventListener("submit", function (event) {
  event.preventDefault();              // 阻止默认跳转
  // 校验两次密码是否一致
  var formData = new FormData(form);   // 一次性收集所有带 name 的控件
  console.log(data);
  console.table(data);
});
```

提交后 Console 中输出的结果形如：

```json
{
  "username": "zhongteng",
  "password": "abc123456",
  "confirmPassword": "abc123456",
  "gender": "male",
  "birthday": "2006-05-20",
  "email": "zhongteng@example.com",
  "phone": "13800138000",
  "city": "changsha",
  "hobby": ["reading", "music"],
  "agree": "yes",
  "bio": "……"
}
```

## 六、遇到的困难及解决方法

1. **两次密码不一致无法在 HTML 层面校验**
   HTML5 自带属性只能做单控件校验，无法比较两个控件的值。解决：在 `submit` 事件中用 JavaScript 取出 `#password` 与 `#confirm-password` 的值进行比较，不一致时 `alert` 提示并 `return` 阻止提交。

2. **复选框 `hobby` 有多个同名值，被 FormData 覆盖**
   `formData.forEach` 遍历时对同名键直接赋值会只保留最后一个。解决：遍历时判断键名是否为 `hobby`，是则收集成数组 `["reading", "music"]`。

3. **文件上传控件的值是一个 File 对象，不能直接打印**
   解决：用 `formData.getAll("avatar")` 取出文件列表，过滤掉空文件后只取 `file.name` 存入数据对象，避免 Console 中显示成 `[object File]`。

4. **表单提交后页面跳转，看不到提交结果**
   解决：在 `submit` 事件中执行 `event.preventDefault()` 阻止默认提交行为，改为把数据打印到 Console 并回显到 `<output>` 区域。

5. **`rowspan` 合并后行单元格数量对不上导致表格错位**
   解决：被 `rowspan="2"` 覆盖的下一行要少写一个单元格；合并前先画草图确认每行的 `<th>` / `<td>` 数量。

6. **表单元素默认纵向堆叠、排版不齐**
   解决：用 CSS 给 `label` 设置 `display: inline-block` 与 `min-width: 90px`，让所有控件左侧对齐。
