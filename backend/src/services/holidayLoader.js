const fs = require('fs');
const { parse } = require('csv-parse/sync');
const path = require('path');
const config = require('../config');

class HolidayLoader {
  constructor() {
    this.holidays = new Set();
    this.lastLoaded = null;
  }

  loadHolidays() {
    this.holidays.clear();
    const csvPath = path.resolve(config.holidayCsvPath);
    
    if (!fs.existsSync(csvPath)) {
      console.warn(`Holiday CSV not found at: ${csvPath}. Weekend-only calculation will be used.`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(csvPath, 'utf8');
      const records = parse(fileContent, {
        columns: false,
        skip_empty_lines: true
      });

      // CSVの1列目が日付 (format: YYYY-MM-DD or YYYY/MM/DD) であることを想定
      records.forEach(row => {
        const dateStr = row[0]?.replace(/\//g, '-');
        if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
          this.holidays.add(dateStr.substring(0, 10));
        }
      });
      
      this.lastLoaded = new Date();
      console.log(`Loaded ${this.holidays.size} holidays from CSV.`);
    } catch (error) {
      console.error('Failed to load holiday CSV:', error.message);
    }
  }

  isWorkingDay(date) {
    const day = date.getDay();
    // 土日判定 (0: 日, 6: 土)
    if (day === 0 || day === 6) return false;

    // 祝日CSV判定 (ローカルの日付文字列を取得)
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (this.holidays.has(dateStr)) return false;

    return true;
  }

  /**
   * 2つの日付の間の営業日数を計算する (開始日を含み、終了日を含まない)
   */
  getWorkingDaysCount(start, end) {
    let count = 0;
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    
    const targetEnd = new Date(end);
    targetEnd.setHours(0, 0, 0, 0);

    while (current < targetEnd) {
      if (this.isWorkingDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
}

const loader = new HolidayLoader();
loader.loadHolidays(); // 初期化時に読み込み

module.exports = loader;
