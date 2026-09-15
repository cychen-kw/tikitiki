# TikiTiki 開發指引

## 專案

TikiTiki 是協助操作拓元 tixCraft、KKTIX 與 ibon 的 Chrome Manifest V3 擴充功能。使用原生 JavaScript、HTML、CSS，沒有建置步驟。對使用者的說明與介面文字使用繁體中文。

## 程式位置

- `manifest.json`：權限、網站 URL 比對、content script 載入順序。
- `background.js`：擴充功能背景事件與開啟設定頁。
- `options.html`、`options.js`、`css/options.css`：平台設定、自動儲存、關鍵字泡泡與 KKTIX 票種清單。
- `js/tixcraft/area.js`：區域隱藏、關鍵字標示與自動點擊排序。
- `js/tixcraft/ticket.js`：張數選擇與驗證碼輸入輔助。
- `js/tixcraft/verify.js`：自訂購票驗證字串與銀行偵測。
- `js/widget.js`：三平台共用的時鐘、優先規則、開關及拖曳工具。
- `js/tixcraft/login.js`：拓元登入狀態判斷，先於共用小工具載入；回傳 true、false 或 null（無法確認），不以缺少標記直接判定未登入。KKTIX 不判斷或顯示登入狀態。
- `js/kktix/kktix.js`：票種範圍、排序、自動加票、資格碼與畫面更新。
- `js/kktix/limits.js`：在 MAIN world 讀取網站每個票種的合法張數，提供給 content script。
- `js/ibon/ibon.js`：ibon UTK02 電腦配位選區、單一票種張數及不連位設定；使用原生控制項事件，停在票數頁，不點下一步。尚未涵蓋其他 ibon 流程。
- `tests/`：Node.js 內建 assert、vm 與 DOM mock 測試。
- `README.md`、`CHANGELOG.md`：使用說明與版本變更。

## 修改原則

- 先閱讀相關呼叫端與測試，保留工作區既有修改。優先沿用現有函式與瀏覽器原生 API，不為小功能新增依賴。
- 設定存於 `chrome.storage.local`；沿用既有 key。自動儲存只寫入變更欄位，避免覆蓋其他分頁或懸浮開關的設定；需要即時同步的 UI 使用 `storage.onChanged`。
- 設定文字保持一致：自動點擊、區域顯示、購票張數、加入順序、移除、設定已儲存。
- 拓元自動點擊關鍵字為逗號分隔字串，排列代表加入順序；空字串代表不限區域。KKTIX 未加入票種則不自動點擊。
- 指定張數預設須剛好符合；允許不足時選不超過目標的最高合法張數。最大張數依網站提供的選項或上限處理，不假定所有票種最多 4 張。
- KKTIX 的票種上限不等於庫存，也不代表整筆訂單上限。保留票種合法級距與逐次點擊網站原有按鈕的處理。
- 隱藏身障區域使用「身障」「身心障礙」「輪椅」；標示、排序或更新功能不能讓已隱藏的區域重新出現。
- 拓元自訂驗證字串有值時優先使用；KKTIX 資格碼保留大小寫與符號，避免覆蓋使用者已操作的欄位。
- 新增頁面支援時同時檢查 manifest URL 比對與實際 DOM，不假設不同報名流程結構相同。

## 驗證

執行全部測試：

```sh
node --test tests/*.test.js
git diff --check
```

為新增的非平凡邏輯補最小可執行測試，沿用現有測試方式。DOM mock 不能取代實際視覺檢查；回報時區分自動測試與瀏覽器驗證。

手動驗證時，在 `chrome://extensions` 重新載入未封裝擴充功能，並重新整理設定頁及對應網站。檢查設定同步、開關、縮小與拖曳等受影響操作；不要為了驗證 UI 完成真實購票或提交訂單。

## CodeGraph

若根目錄存在 `.codegraph/`，理解或定位程式碼前優先使用 `codegraph_explore` 或 `codegraph explore`。沒有索引則使用 `rg`，不要自行建立索引。
