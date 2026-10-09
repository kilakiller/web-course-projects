# 实验3 CSS布局实战——导航菜单

Web应用开发技术实验 · 软工2402

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `一级菜单.html` | 表格布局的一级水平导航菜单（HTML 结构为题目提供，未修改，仅添加 CSS） |
| `二级菜单.html` | 基于学校官网视觉体系重新设计的二级下拉导航菜单（纯 CSS 实现，无 JS） |
| `images/` | 浏览器实际运行效果截图 |

## 运行效果

### 一级菜单

![一级菜单](images/01-一级菜单.png)

### 二级菜单（默认状态）

![二级菜单默认状态](images/02-二级菜单-默认状态.png)

### 二级菜单（悬停"教学院(部)"显示下拉）

![二级菜单悬停下拉](images/03-二级菜单-悬停下拉.png)

## 实现要点

**一级菜单**
- `td a` 转为块级元素并用 `padding` 扩大可点击区域；`border-collapse: collapse` 消除表格单元格间隙；`:hover` 悬停变色。

**二级菜单（官网风格改版）**
- **水平排列**：`display: flex` + `justify-content: center`，无需处理 inline-block 空白缝隙，增删菜单项自动适应。
- **视觉体系**：校红 `#a3050f` + 深蓝 `#1e3d8f` 取自学校官网；宋体校名 + 朱文印章“湖南文理”作标识；白底通栏导航配红色下划线（从左侧生长）。
- **下拉定位**：父级 `li` 设 `position: relative`，二级 `ul` 设 `position: absolute; top: 100%; left: 50%`，配合 `transform: translateX(-50%)` 水平居中。
- **过渡动画**：用 `visibility` + `opacity` + `transform: translateY` 组合替代 `display: none` 切换，实现下拉淡入上移效果。

## 运行方式

用 Chrome 浏览器直接打开两个 HTML 文件即可预览效果。
