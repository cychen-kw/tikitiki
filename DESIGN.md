---
name: TikiTiki 有票噴霧
description: 三秒內讀懂、事前設定好的購票控制台
colors:
  brand-red: "#d0333c"
  brand-red-deep: "#b32029"
  brand-red-tint: "#fbe4e5"
  tixcraft-blue: "#1a56b0"
  tixcraft-blue-deep: "#123f85"
  tixcraft-blue-tint: "#dbe7fa"
  kktix-green: "#4c9c2e"
  kktix-green-deep: "#3a7a22"
  kktix-green-tint: "#e3f3d7"
  ibon-magenta: "#e5006e"
  ibon-magenta-deep: "#b30054"
  ibon-magenta-tint: "#fde3ee"
  ticketplus-sky: "#1e88c8"
  ticketplus-sky-deep: "#156499"
  ticketplus-sky-tint: "#e1f1fb"
  saved-green: "#2a8a4a"
  ink: "#222222"
  ink-muted: "#6b6b6b"
  hairline: "#e2e2e2"
  booth-gray: "#f2f3f5"
  surface: "#ffffff"
  switch-off: "#cccccc"
typography:
  brand:
    fontFamily: "-apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
  clock:
    fontFamily: "-apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    fontFeature: "tnum"
  title:
    fontFamily: "-apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "15px"
    fontWeight: 700
  body:
    fontFamily: "-apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "13px"
    fontWeight: 600
  hint:
    fontFamily: "-apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "14px"
  lg: "20px"
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "18px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  radio-pill:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
  radio-pill-checked:
    backgroundColor: "{colors.brand-red-tint}"
    textColor: "{colors.brand-red-deep}"
    rounded: "{rounded.pill}"
  tag:
    backgroundColor: "{colors.brand-red-tint}"
    textColor: "{colors.brand-red-deep}"
    rounded: "{rounded.pill}"
    padding: "4px 6px 4px 12px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "7px 10px"
  toggle-switch:
    backgroundColor: "{colors.switch-off}"
    rounded: "{rounded.pill}"
    width: "36px"
    height: "20px"
  toast:
    backgroundColor: "{colors.saved-green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
  widget:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
---

# Design System: TikiTiki 有票噴霧

## Overview

**Creative North Star: "售票亭的控制台"**

TikiTiki 像一座整齊的售票亭：灰色亭身（#f2f3f5）上排著白色卡片，每張卡片頂端有一道平台色條，標出它屬於哪個售票平台。設定頁是開賣前慢慢調整的操作面板，懸浮小工具是開賣當下的小型儀表，只顯示時鐘、開關和優先規則。

視覺俐落克制：細邊框、近乎平面，色彩只用來標示平台和狀態。每個平台分頁會把 `--accent` 換成該平台的顏色，所以同一套元件在拓元是藍色、在 KKTIX 是綠色。品牌紅只留給品牌本身與小工具開關。唯一的玩心藏在 🎟️ logo：點擊後會搖晃，並噴出泡泡。

**Key Characteristics:**
- 單欄窄版（最寬 480px），灰底白卡片
- 平台色以 3px 卡片頂條、分頁底線、選中狀態出現，不大面積鋪色
- 只用系統字型，數字使用等寬數字（tabular-nums）
- 圓角分三級：8px 欄位、12px 容器、膠囊形的選項與標籤

## Colors

中性灰白打底，搭配四個平台色與一個品牌紅；每個顏色都有 deep（文字、hover）和 tint（選中背景）兩階。

### Primary
- **票根紅 Ticket Red**（brand-red）：品牌名稱、小工具開關開啟時、logo 噴出的泡泡。brand-red-deep 用於警告文字與邊框（例如未登入提示）。

### Secondary（平台色）
- **拓元藍**（tixcraft-blue）、**KKTIX 綠**（kktix-green）、**ibon 洋紅**（ibon-magenta）、**遠大天藍**（ticketplus-sky）：各自分頁的 `--accent`，用於卡片頂條、卡片標題、分頁底線、toggle 開啟、輸入框聚焦邊框、選中選項。

### Tertiary
- **已儲存綠**（saved-green）：只用於「設定已儲存」toast。

### Neutral
- **墨黑**（ink）：正文與時鐘。
- **灰字**（ink-muted）：欄位標籤、提示、版本號、未選中分頁。
- **細線灰**（hairline）：所有邊框與分隔線。
- **亭身灰**（booth-gray）：頁面底色、sticky 分頁列底色。
- **白**（surface）：卡片、輸入框、小工具底色。

### Named Rules
**The Platform Owns the Accent Rule.** 分頁內的元件只讀 `--accent`、`--accent-dark`、`--accent-tint`，不寫死平台色；新增平台時，只需替該分頁補上三個變數。

**The Tint-Not-Fill Rule.** 選中狀態用 tint 當背景、deep 當文字，不用飽和平台色鋪滿元件。實心的飽和色只出現在 toggle 開啟和分頁小圓 icon。

## Typography

**Body Font:** 系統字型堆疊（-apple-system → Segoe UI → PingFang TC → Microsoft JhengHei）

**Character:** 不載入網頁字型，中英文都使用作業系統原生字，載入快，看起來也像系統的一部分。

### Hierarchy
- **Brand**（700，18px）：設定頁頂部的品牌名稱，品牌紅。
- **Clock**（700，20px，tabular-nums）：小工具時鐘，數字寬度固定，不會跳動。
- **Title**（700，15px）：卡片標題，使用平台色。
- **Body**（400，14px，1.5）：選項列和輸入文字。
- **Label**（600，13px）：欄位標籤，灰字；選項膠囊與標籤也是 13px。
- **Hint**（12px）：說明文字、小工具狀態列；11px 用於版本號和頁尾。

### Named Rules
**The Steady Digits Rule.** 時間、倒數、張數等會變動的數字一律使用 tabular-nums。

## Layout

單欄，`.page` 最寬 480px，置中，左右 20px 內距。頂部有品牌列，平台分頁列 sticky 在頂端，卡片之間以 14px 間距垂直堆疊；卡片內距為 18px 20px，選項列之間 12px。巢狀設定使用 26px 縮排的 subpanel。

小工具固定在右上角（top/right 14px），寬度隨內容而定（最小 120px），文字置中；可以拖曳時鐘移動位置，縮小後只剩時鐘。

## Elevation & Depth

設定頁以色階表現層次：灰底、白卡片、細邊框，沒有陰影。陰影只出現在浮在其他內容之上的元素。

### Shadow Vocabulary
- **懸浮小工具**（`0 4px 16px rgba(0,0,0,.12)`）：小工具浮在網站上，要和網站內容分開。
- **Toast**（`0 2px 8px rgba(0,0,0,.15)`）：儲存提示。
- **Toggle 圓鈕**（`0 1px 2px rgba(0,0,0,.3)`）：開關裡的白色圓鈕。

### Named Rules
**The Only-Floaters-Cast-Shadows Rule.** 只有浮在網頁上的東西（小工具、toast）可以有陰影；卡片和欄位維持平面。

## Shapes

圓角分三級：8px 用於輸入框、按鈕、subpanel；12px 用於卡片和小工具；膠囊形（999px）用於選項、標籤、toggle、toast。圓形用於分頁 icon 和移除鈕。邊框一律是 1px 細線灰；subpanel 使用虛線，表示從屬於上層設定。

## Components

### Buttons
- **Shape:** 8px 圓角，白底細線灰邊框，灰字 13px。
- **Hover:** 邊框和文字換成 `--accent-dark`。
- **Disabled:** 透明度 .5。
- 沒有實心主要按鈕：設定會自動儲存，不需要「儲存」鈕。

### Chips
- **Radio pill:** 膠囊形，細邊框；選中後換成 tint 背景、deep 文字、600 字重。
- **Tag（關鍵字泡泡）:** tint 背景、deep 文字的膠囊，右側有 × 移除鈕；可以拖曳排序，排列順序就是加入順序。

### Cards / Containers
- **Corner Style:** 12px
- **Background:** 白
- **Border:** 1px 細線灰，頂部改為 3px 平台色條
- **Internal Padding:** 18px 20px

### Inputs / Fields
- **Style:** 白底、1px 細線灰、8px 圓角、14px 字。
- **Focus:** 邊框換成 `--accent`，不顯示外框光暈。標籤輸入框使用 focus-within 達到同樣效果。

### Navigation
- **平台分頁:** 文字分頁，前面有 18px 平台色小圓 icon；未選中為灰字，選中時文字和 2px 底線換成平台色。分頁列 sticky 在頂端。

### Toggle Switch
36×20 膠囊；關閉時為 #ccc，開啟時為 `--accent`，白色圓鈕以 .15s 滑動。小工具內的版本是 32×18，開啟時為品牌紅。

### 懸浮小工具（Signature）
白色小卡，12px 圓角，帶陰影；最上方是品牌字（10px 紅），下方是 20px 時鐘；細分隔線之下是自動點擊開關，再下面是 12px 灰色狀態列。左上角是 ⚙️ 設定鈕，右上角是縮小鈕，皆為 22px 圓形，hover 時底色為 #f2f2f2。警告使用淡紅底、深紅邊框和 13px 粗體字。

## Do's and Don'ts

### Do:
- **Do** 透過 `--accent` 系列變數套用平台色，讓同一個元件在四個平台分頁各自正確。
- **Do** 選中狀態用 tint 背景加 deep 文字。
- **Do** 時間和數字使用 tabular-nums。
- **Do** 保留 🎟️ logo 的搖晃與泡泡小互動，但只放在品牌區。

### Don't:
- **Don't** 給卡片或欄位加陰影；陰影只屬於小工具和 toast。
- **Don't** 加入網頁字型或額外 UI 函式庫。
- **Don't** 用品牌紅表示某個平台；品牌紅只代表 TikiTiki 本身和小工具。
- **Don't** 在小工具放開賣當下用不到的資訊。
