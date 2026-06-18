const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 中介層設定
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 資料庫設定
const db = new Database('health.db');

// 建立 health_logs 資料表
db.exec(`
  CREATE TABLE IF NOT EXISTS health_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date TEXT NOT NULL,
    sleep_hours REAL NOT NULL,
    steps INTEGER NOT NULL,
    mood_score INTEGER NOT NULL,
    risk_level TEXT
  )
`);

console.log('✅ 資料庫連線成功');

// 決策樹分類函式
// 這裡不是單一 if，而是多層分支：睡眠 → 步數 → 心情
function classifyRisk(sleepHours, steps, moodScore) {
  if (sleepHours < 6) {
    if (steps < 4000) {
      if (moodScore <= 4) {
        return '高風險';
      } else {
        return '中風險';
      }
    } else {
      if (moodScore <= 3) {
        return '中風險';
      } else {
        return '中風險';
      }
    }
  } else {
    if (steps >= 6000) {
      if (moodScore >= 6) {
        return '低風險';
      } else {
        return '中風險';
      }
    } else {
      if (moodScore <= 4) {
        return '中風險';
      } else {
        return '中風險';
      }
    }
  }
}

// 產生隨機數字
function randomFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 自動產生 90 天種子資料
function seedData() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM health_logs').get().count;

  if (count > 0) {
    console.log('ℹ️ 已有資料，不重複產生種子資料');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO health_logs (log_date, sleep_hours, steps, mood_score, risk_level)
    VALUES (?, ?, ?, ?, ?)
  `);

  const today = new Date();

  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (89 - i));
    const logDate = date.toISOString().slice(0, 10);

    let sleepHours;
    let steps;
    let moodScore;

    // 前 25 天：高風險資料
    if (i < 25) {
      sleepHours = randomFloat(4, 5.5);
      steps = randomInt(1000, 3500);
      moodScore = randomInt(1, 4);
    }
    // 中間 40 天：普通資料
    else if (i < 65) {
      sleepHours = randomFloat(5.5, 7.2);
      steps = randomInt(3000, 6500);
      moodScore = randomInt(4, 7);
    }
    // 後 25 天：低風險資料
    else {
      sleepHours = randomFloat(7, 9);
      steps = randomInt(6000, 10000);
      moodScore = randomInt(6, 9);
    }

    const riskLevel = classifyRisk(sleepHours, steps, moodScore);
    insert.run(logDate, sleepHours, steps, moodScore, riskLevel);
  }

  console.log('✅ 已自動產生 90 筆健康日誌種子資料');
}

seedData();

// GET /health-logs：取得所有健康日誌
app.get('/health-logs', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM health_logs
    ORDER BY log_date DESC, id DESC
  `).all();

  res.json(rows);
});

// POST /health-logs：新增一筆健康日誌
app.post('/health-logs', (req, res) => {
  const { log_date, sleep_hours, steps, mood_score } = req.body;

  if (!log_date || sleep_hours === undefined || steps === undefined || mood_score === undefined) {
    return res.status(400).json({ error: '請填寫完整資料' });
  }

  const riskLevel = classifyRisk(
    Number(sleep_hours),
    Number(steps),
    Number(mood_score)
  );

  const result = db.prepare(`
    INSERT INTO health_logs (log_date, sleep_hours, steps, mood_score, risk_level)
    VALUES (?, ?, ?, ?, ?)
  `).run(log_date, sleep_hours, steps, mood_score, riskLevel);

  res.json({
    message: '新增成功',
    id: result.lastInsertRowid,
    risk_level: riskLevel
  });
});

// GET /health-logs/risk：取得最新一筆紀錄的風險等級
app.get('/health-logs/risk', (req, res) => {
  const latest = db.prepare(`
    SELECT * FROM health_logs
    ORDER BY log_date DESC, id DESC
    LIMIT 1
  `).get();

  if (!latest) {
    return res.json({ message: '目前沒有健康日誌資料' });
  }

  const riskLevel = classifyRisk(
    latest.sleep_hours,
    latest.steps,
    latest.mood_score
  );

  res.json({
    log_date: latest.log_date,
    sleep_hours: latest.sleep_hours,
    steps: latest.steps,
    mood_score: latest.mood_score,
    risk_level: riskLevel
  });
});

// PUT /health-logs/:id：修改指定日誌
app.put('/health-logs/:id', (req, res) => {
  const { id } = req.params;
  const { log_date, sleep_hours, steps, mood_score } = req.body;

  const riskLevel = classifyRisk(
    Number(sleep_hours),
    Number(steps),
    Number(mood_score)
  );

  db.prepare(`
    UPDATE health_logs
    SET log_date = ?, sleep_hours = ?, steps = ?, mood_score = ?, risk_level = ?
    WHERE id = ?
  `).run(log_date, sleep_hours, steps, mood_score, riskLevel, id);

  res.json({
    message: '修改成功',
    risk_level: riskLevel
  });
});

// DELETE /health-logs/:id：刪除指定日誌
app.delete('/health-logs/:id', (req, res) => {
  const { id } = req.params;

  db.prepare(`
    DELETE FROM health_logs
    WHERE id = ?
  `).run(id);

  res.json({ message: '刪除成功' });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});