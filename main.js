const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// ============================================================
function getShiftDuration(startTime, endTime) {
    let [startClock, startPeriod] = startTime.split(' ');
    let [startH, startM, startS] = startClock.split(':').map(Number);

    if (startPeriod === 'am') {
        if (startH === 12) startH = 0;
    } else {
        if (startH !== 12) startH += 12;
    }

    let [endClock, endPeriod] = endTime.split(' ');
    let [endH, endM, endS] = endClock.split(':').map(Number);

    if (endPeriod === 'am') {
        if (endH === 12) endH = 0;
    } else {
        if (endH !== 12) endH += 12;
    }

    let startTotal = startH * 3600 + startM * 60 + startS;
    let endTotal = endH * 3600 + endM * 60 + endS;
    let diff = endTotal - startTotal;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    let mm = String(m).padStart(2, '0');
    let ss = String(s).padStart(2, '0');

    return `${h}:${mm}:${ss}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// ============================================================
function getIdleTime(startTime, endTime) {
    let [startClock, startPeriod] = startTime.split(' ');
    let [startH, startM, startS] = startClock.split(':').map(Number);

    if (startPeriod === 'am') {
        if (startH === 12) startH = 0;
    } else {
        if (startH !== 12) startH += 12;
    }

    let [endClock, endPeriod] = endTime.split(' ');
    let [endH, endM, endS] = endClock.split(':').map(Number);

    if (endPeriod === 'am') {
        if (endH === 12) endH = 0;
    } else {
        if (endH !== 12) endH += 12;
    }
    let deliveryStart = 8 * 3600;
    let deliveryEnd = 22 * 3600;

    let startTotal = startH * 3600 + startM * 60 + startS;
    let endTotal = endH * 3600 + endM * 60 + endS;

    let idleBefore = 0;
    if (startTotal < deliveryStart) {
        idleBefore = Math.min(deliveryStart, endTotal) - startTotal;
    }

    let idleAfter = 0;
    if (endTotal > deliveryEnd) {
        idleAfter = endTotal - Math.max(deliveryEnd, startTotal);
    }

    let diff = idleBefore + idleAfter;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    let mm = String(m).padStart(2, '0');
    let ss = String(s).padStart(2, '0');

    return `${h}:${mm}:${ss}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    let [shiftHour, shiftMin, shiftSec] = shiftDuration.split(':').map(Number);
    let [idleHour, idleMin, idleSec] = idleTime.split(':').map(Number);

    let shiftTotal = shiftHour * 3600 + shiftMin * 60 + shiftSec;
    let idleTotal = idleHour * 3600 + idleMin * 60 + idleSec;

    let diff = shiftTotal - idleTotal;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    let mm = String(m).padStart(2, '0');
    let ss = String(s).padStart(2, '0');

    return `${h}:${mm}:${ss}`;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// ============================================================
function metQuota(date, activeTime) {
    let [year, month, day] = date.split('-').map(Number);

    let isEid = (year === 2025 && month === 4 && day >= 10 && day <= 30);

    let quota = isEid ? 6 * 3600 : 8 * 3600 + 24 * 60;

    let [h, m, s] = activeTime.split(':').map(Number);
    let activeTotal = h * 3600 + m * 60 + s;

    return activeTotal >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let rawData;
    try {
        rawData = fs.readFileSync(textFile, "utf8");
    } catch (err) {
        rawData = "DriverID,DriverName,Date,StartTime,EndTime,ShiftDuration,IdleTime,ActiveTime,MetQuota,HasBonus\n";
    }

    let lines = rawData.replace(/\r/g, '').split('\n');
    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let metQuotaBool = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQuotaBool,
        hasBonus: false
    };

    let newLine = `${newRecord.driverID},${newRecord.driverName},${newRecord.date},${newRecord.startTime},${newRecord.endTime},${newRecord.shiftDuration},${newRecord.idleTime},${newRecord.activeTime},${newRecord.metQuota},${newRecord.hasBonus}`;

    let lastIndex = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i] === "") continue;
        let cols = lines[i].split(',');
        if (cols[0] === shiftObj.driverID && cols[2] === shiftObj.date) {
            return {};
        }
        if (cols[0] === shiftObj.driverID) {
            lastIndex = i;
        }
    }

    if (lastIndex !== -1) {
        lines.splice(lastIndex + 1, 0, newLine);
    } else {
        if (lines[lines.length - 1] === "") {
            lines.splice(lines.length - 1, 0, newLine);
        } else {
            lines.push(newLine);
        }
    }

    fs.writeFileSync(textFile, lines.join('\n'), "utf8");
    return newRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let rawData = fs.readFileSync(textFile, "utf8");
    let lines = rawData.replace(/\r/g, '').split('\n');

    for (let i = 1; i < lines.length; i++) {
        if (lines[i] === "") continue;
        let cols = lines[i].split(',');
        if (cols[0] === driverID && cols[2] === date) {
            cols[9] = String(newValue);
            lines[i] = cols.join(',');
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join('\n'), "utf8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let rawData = fs.readFileSync(textFile, "utf8");
    let lines = rawData.replace(/\r/g, '').split('\n');

    let driverExists = false;
    let bonusCount = 0;
    let targetMonth = Number(month);

    for (let i = 1; i < lines.length; i++) {
        if (lines[i] === "") continue;
        let cols = lines[i].split(',');
        if (cols[0] === driverID) {
            driverExists = true;
            let recordDate = cols[2];
            let recordMonth = Number(recordDate.split('-')[1]);
            if (recordMonth === targetMonth) {
                if (cols[9] === "true") {
                    bonusCount++;
                }
            }
        }
    }

    if (!driverExists) return -1;
    return bonusCount;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let rawData = fs.readFileSync(textFile, "utf8");
    let lines = rawData.replace(/\r/g, '').split('\n');

    let targetMonth = Number(month);
    let totalSeconds = 0;

    for (let i = 1; i < lines.length; i++) {
        if (lines[i] === "") continue;
        let cols = lines[i].split(',');
        if (cols[0] === driverID) {
            let recordDate = cols[2];
            let recordMonth = Number(recordDate.split('-')[1]);
            if (recordMonth === targetMonth) {
                let activeTimeStr = cols[7];
                let parts = activeTimeStr.split(':').map(Number);
                totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        }
    }

    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;

    let hStr = String(h);
    let mm = String(m).padStart(2, '0');
    let ss = String(s).padStart(2, '0');

    return `${hStr}:${mm}:${ss}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    let rateData = fs.readFileSync(rateFile, "utf8").replace(/\r/g, '').split('\n');
    let dayOff = "";
    for (let line of rateData) {
        if (line === "") continue;
        let cols = line.split(',');
        if (cols[0] === driverID) {
            dayOff = cols[1];
            break;
        }
    }

    let shiftData = fs.readFileSync(textFile, "utf8").replace(/\r/g, '').split('\n');
    let targetMonth = Number(month);
    let totalSeconds = 0;

    let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let i = 1; i < shiftData.length; i++) {
        let line = shiftData[i];
        if (line === "") continue;
        let cols = line.split(',');
        if (cols[0] === driverID) {
            let recordDate = cols[2];
            let [y, m, d] = recordDate.split('-').map(Number);
            if (m === targetMonth) {
                let dateObj = new Date(y, m - 1, d);
                let dayName = daysOfWeek[dateObj.getDay()];

                if (dayName !== dayOff) {
                    let isEid = (y === 2025 && m === 4 && d >= 10 && d <= 30);
                    if (isEid) {
                        totalSeconds += 6 * 3600;
                    } else {
                        totalSeconds += 8 * 3600 + 24 * 60;
                    }
                }
            }
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;
    if (totalSeconds < 0) totalSeconds = 0;

    let h = Math.floor(totalSeconds / 3600);
    let ms = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;

    let hStr = String(h);
    let mm = String(ms).padStart(2, '0');
    let ss = String(s).padStart(2, '0');

    return `${hStr}:${mm}:${ss}`;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let rateData = fs.readFileSync(rateFile, "utf8").replace(/\r/g, '').split('\n');
    let basePay = 0;
    let tier = 0;

    for (let line of rateData) {
        if (line === "") continue;
        let cols = line.split(',');
        if (cols[0] === driverID) {
            basePay = parseInt(cols[2]);
            tier = parseInt(cols[3]);
            break;
        }
    }

    let allowedMissing = 0;
    if (tier === 1) allowedMissing = 50 * 3600;
    else if (tier === 2) allowedMissing = 20 * 3600;
    else if (tier === 3) allowedMissing = 10 * 3600;
    else if (tier === 4) allowedMissing = 3 * 3600;

    let actualParts = actualHours.split(':').map(Number);
    let actualSec = actualParts[0] * 3600 + actualParts[1] * 60 + actualParts[2];

    let reqParts = requiredHours.split(':').map(Number);
    let reqSec = reqParts[0] * 3600 + reqParts[1] * 60 + reqParts[2];

    let missingSec = reqSec - actualSec;
    let salaryDeduction = 0;

    if (missingSec > allowedMissing) {
        let billableSec = missingSec - allowedMissing;
        let billableHours = Math.floor(billableSec / 3600);

        let deductionRatePerHour = Math.floor(basePay / 185);
        salaryDeduction = billableHours * deductionRatePerHour;
    }

    return basePay - salaryDeduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};