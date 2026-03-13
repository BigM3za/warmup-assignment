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

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord
}