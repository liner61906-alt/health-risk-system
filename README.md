\# 智慧健康日誌與風險評估系統



\## 專案說明



本專案選擇題目 A：智慧健康日誌與風險評估系統。



使用者可以輸入每日健康資料，包含睡眠時數、步數與心情分數。系統會使用決策樹分類邏輯，依序判斷「睡眠 → 步數 → 心情」，最後分類出低風險、中風險或高風險。



\## 系統功能



1\. 新增健康日誌

2\. 顯示最新風險等級

3\. 顯示歷史健康紀錄

4\. 使用決策樹分類風險

5\. 可刪除健康紀錄



\## 使用技術



\- Node.js

\- Express

\- SQLite

\- HTML

\- CSS

\- JavaScript



\## API



\- GET /health-logs

\- POST /health-logs

\- GET /health-logs/risk

\- DELETE /health-logs/:id



\## 啟動方式



先安裝套件：



```bash

npm.cmd install



