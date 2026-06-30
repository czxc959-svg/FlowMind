/* ============================================
   FlowMind — 新版专注作战台 API
   负责保存新版 focus.html 的完整工作状态
   ============================================ */

const express = require('express');
const router = express.Router();
const db = require('../db');

function ensureFocusState() {
  if (!db.data.focus) {
    db.data.focus = {};
  }

  db.data.focus.tasks = Array.isArray(db.data.focus.tasks) ? db.data.focus.tasks : [];
  db.data.focus.distractions = Array.isArray(db.data.focus.distractions) ? db.data.focus.distractions : [];
  db.data.focus.sessions = Array.isArray(db.data.focus.sessions) ? db.data.focus.sessions : [];
  db.data.focus.dailyNotes = db.data.focus.dailyNotes && typeof db.data.focus.dailyNotes === 'object'
    ? db.data.focus.dailyNotes
    : {};
  db.data.focus.timer = db.data.focus.timer && typeof db.data.focus.timer === 'object'
    ? db.data.focus.timer
    : { selectedMinutes: 25 };

  return db.data.focus;
}

function cleanState(input) {
  return {
    tasks: Array.isArray(input.tasks) ? input.tasks : [],
    distractions: Array.isArray(input.distractions) ? input.distractions : [],
    sessions: Array.isArray(input.sessions) ? input.sessions : [],
    dailyNotes: input.dailyNotes && typeof input.dailyNotes === 'object' ? input.dailyNotes : {},
    timer: input.timer && typeof input.timer === 'object' ? input.timer : { selectedMinutes: 25 }
  };
}

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: ensureFocusState()
  });
});

router.put('/', (req, res) => {
  db.data.focus = cleanState(req.body || {});
  db.save();
  res.json({
    success: true,
    data: db.data.focus,
    message: '专注数据已保存'
  });
});

router.post('/reset', (req, res) => {
  db.data.focus = {
    tasks: [],
    distractions: [],
    sessions: [],
    dailyNotes: {},
    timer: { selectedMinutes: 25 }
  };
  db.save();
  res.json({
    success: true,
    data: db.data.focus,
    message: '专注数据已重置'
  });
});

module.exports = router;
