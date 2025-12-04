# 🍱 FOOD 剩食分享平台

本專案是一個「剩食分享平台」的基礎框架，包含：

- **backend**：使用 Python 實作的後端 API（已提供 Dockerfile）
- **frontend-app**：使用 React Native + Expo 的手機 App
- **docker-compose**：使用 Docker 一鍵啟動後端與資料庫

---
## 📁 專案結構

```text
/
├─ backend/               #後端
│  ├─ app/                # 後端 API 程式碼
│  ├─ Dockerfile          # 後端 Docker 設定
│  └─ requirements.txt    # 後端 Python 套件
│
├─ frontend-app/          #前端
│  ├─ app/              
│  │  ├─ _layout.tsx
│  │  └─ index.tsx
│  ├─ screens/            #分頁，目前只有Provider跟Receiver
│  │  ├─ ProviderScreen.js
│  │  └─ ReceiverScreen.js
│  ├─ api.js              # 前端呼叫後端 API 
│  ├─ assets/
│  ├─ package.json
│  └─ ...
│
├─ docker-compose.yml    # 啟動 db + backend
├─ .env                  # 給 backend 用的環境變數
└─ README.md
```

## 🛠 環境需求
安裝：
- Git
- Docker Desktop（含 docker compose）
- Node.js 18+（前端 Expo 用）
- 手機安裝 Expo app 並註冊登入

## 🚀 快速開始（推薦流程）
1️⃣ 下載專案
```
git clone https://github.com/marionchenchen/HCI_Final_Plate.git
cd HCI_Final_Plate
```

2️⃣ 在專案根目錄建立 .env 檔，加入：
```
DATABASE_URL=postgresql+psycopg2://hci_user:hci_password@db:5432/hci_demo
```

3️⃣ 使用 Docker 啟動後端（與資料庫）
```
cd HCI_Final_Plate
docker compose up --build
# Docker 會自動：建立後端 Python 環境、安裝 requirements.txt、啟動後端 API、啟動資料庫
```
啟動後預期後端在：
```
http://localhost:8000
```
你可用：
```
curl http://localhost:8000
```
確認是否正常。

## 測試方法
### 📱 啟動前端（Expo App）

1. 請確認 frontend-app/api.js 內的後端網址有指向 Docker：
```
#找到你自己的 IP：ex, ip addr show
export const API_BASE = "http://192.x.x.x:8000";
```
2. 前端預設在本機執行，需要 Node.js：
```
cd frontend-app
npm install    # 第一次才需要
npx expo start
```
Expo 會開一個控制台，用手機 Expo Go 掃描 QRCode 開啟 App 測試，像這樣
<img  height="400" alt="image" src="https://github.com/user-attachments/assets/e8e3f7d5-b847-463a-b9b1-5e186adb0b81" />
  <img  height="400" alt="image" src="https://github.com/user-attachments/assets/c2ef35ba-82cc-4dc9-abac-eb03ee63054f" />


### 📱 測試後端回應
- database
進資料庫查 foods 表
```
#在 Food/：
docker exec -it hci_db psql -U hci_user -d hci_demo

#進去之後會看到類似：
hci_demo=#

#看有什麼資料表
\dt

# 假設是要查 foods 表內容
SELECT id, title, total_quantity, reserved_quantity FROM foods;
```
<img width="505" height="271" alt="image" src="https://github.com/user-attachments/assets/f2e8b86a-97ee-423d-ba77-87faa9713b0f" />

- server :在瀏覽器打
```
http://localhost:8000/docs
```
http://localhost:8000/ 或是 docker 應該可以看到後端的更新狀態
<img width="1473" height="1035" alt="image" src="https://github.com/user-attachments/assets/f0b1c40e-fce4-4cd6-905d-db73f0a354f9" />


## 🧑‍💻 開發指南
前端開發位置
```
frontend-app/app/          # Expo 路由入口 (_layout.tsx / index.tsx)
frontend-app/api.js        # 後端 API
frontend-app/screens/      # App主要頁面
```
要新增畫面 → 在 screens/ 新增檔案並加入路由。

後端開發位置
```
backend/app/
```
## Update
現在預約功能是正常的 可以在app裡面預約一份並且更新到database
provider發佈功能不正常，如果要測試可以先在後端加剩食資訊:瀏覽器打http://localhost:8000/docs#/ 然後在“POST /food/” 按try it out 可以發布訂單
