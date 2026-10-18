# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
使用者是開發者本人和親友，屬於私人工具，沒有公開發布。他們在熱門場次開賣前先設定好偏好，開賣時讓擴充功能在購票頁上自動選區、選票種和張數。

## Product Purpose
TikiTiki 🎟️ 有票噴霧是 Chrome MV3 擴充功能，協助操作拓元 tixCraft、KKTIX、ibon、遠大 ticketplus 及 MyVideo 活動報名。它負責篩選和隱藏區域、依加入順序自動選票、填入張數與驗證資料，最後一步仍由使用者確認送出。開賣當下能快速選到正確的區域和張數，就算成功。

## Operating Context
- 設定頁（options.html）在開賣前使用，用來設定各平台的關鍵字、票種清單、張數和開關，變更會自動儲存。
- 購票頁上的懸浮小工具在開賣當下使用，提供時鐘、優先規則、自動點擊開關和設定入口，可以縮小和拖曳。開賣時要一眼就能看懂。
- 各平台的頁面結構不同，網站也會改版，因此支援範圍以實際 DOM 為準。

## Capabilities and Constraints
- 使用原生 JS/HTML/CSS，沒有建置步驟，設定存在 chrome.storage.local。
- 不自動送出訂單或付款。KKTIX 與 ibon 選完票後停住；ticketplus 只在指定頁面點一次「下一步」。
- 會隱藏身障區域，其他功能不能讓已隱藏的區域重新出現。
- 指定張數預設須剛好符合；最大張數以網站提供的選項為準。
- 介面文字一律使用繁體中文，用語保持一致：自動點擊、區域顯示、購票張數、加入順序、移除、設定已儲存。

## Brand Commitments
- 保留名稱「TikiTiki」、中文名「有票噴霧」和 🎟️。

## Evidence on Hand
- README.md、CHANGELOG.md。沒有使用者見證或統計資料，不得虛構。

## Product Principles
1. 開賣當下的速度和準確優先：小工具的狀態要一眼可讀，不干擾網站本身的操作。
2. 設定好後就不必再管：自動儲存，並在各分頁之間即時同步。
3. 不越過使用者：不覆蓋使用者已操作的欄位，最後的確認和送出留給使用者。
