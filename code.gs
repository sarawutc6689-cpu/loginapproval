// ===============================
// Code.gs - Debug Version
// ===============================

const VERSION = '1.1.0';
const APPROVAL_SHEET_NAME = 'approval';
const REQUESTS_SHEET_NAME = 'leave_requests';

// ===============================
// Web App Router
// ===============================
function doGet(e) {
  console.log('doGet called with parameters:', JSON.stringify(e?.parameters || {}));
  const page = e?.parameter?.page || 'login';
  console.log('Page requested:', page);

  if (page === 'approver') {
    return HtmlService.createHtmlOutputFromFile('approver')
      .setTitle('ระบบอนุมัติการลา - Approver')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  }

  return HtmlService.createHtmlOutputFromFile('login')
    .setTitle('ระบบอนุมัติการลา - Login')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ===============================
// Authentication
// ===============================
function login(username, password) {
  console.log('Login attempt for user:', username);
  
  try {
    const sheet = getSheet(APPROVAL_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    console.log('Sheet headers:', headers);

    const idx = indexMap(headers);
    console.log('Column indexes:', idx);

    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      const userCode = String(r[idx.code]).trim();
      console.log('Checking user:', userCode);
      
      if (userCode === String(username).trim()) {
        console.log('User found:', userCode);
        
        const userPassword = String(r[idx.password]).trim();
        if (userPassword !== String(password).trim()) {
          console.log('Password mismatch');
          return json(false, 'รหัสผ่านไม่ถูกต้อง');
        }

        const permission = Number(r[idx.permission_level]) || 0;
        console.log('Permission level:', permission);
        
        if (permission < 2) {
          console.log('Insufficient permission');
          return json(false, 'คุณไม่มีสิทธิ์อนุมัติ');
        }

        const userData = {
          code: r[idx.code],
          name: r[idx.name],
          role: r[idx.role],
          role_name: getRoleName(r[idx.role]),
          section: r[idx.section],
          department: r[idx.department],
          position: r[idx.position],
          permission_level: permission
        };
        
        console.log('Login successful:', userData);
        return json(true, 'เข้าสู่ระบบสำเร็จ', {
          user: userData
        });
      }
    }

    console.log('User not found:', username);
    return json(false, 'ไม่พบผู้ใช้งาน');

  } catch (err) {
    console.error('Login error:', err);
    return json(false, 'เกิดข้อผิดพลาด: ' + err.toString());
  }
}

// ===============================
// Approver : Pending Requests
// ===============================
function getPendingRequestsByApprover(approverCode) {
  console.log('getPendingRequestsByApprover called with:', approverCode);
  
  try {
    const sheet = getSheet(REQUESTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    console.log('Requests sheet headers:', headers);
    
    const idx = indexMap(headers);
    console.log('Column indexes:', idx);
    
    // ตรวจสอบว่าคอลัมน์ที่จำเป็นมีอยู่
    if (idx['Ticket ID'] === undefined || idx.Status === undefined) {
      console.error('Required columns not found');
      return json(false, 'โครงสร้างไฟล์ไม่ถูกต้อง');
    }

    const result = [];
    console.log('Total rows in sheet:', data.length);

    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      const status = r[idx.Status];
      const approverCodeInRow = r[idx.approver_code];
      const managerCode = r[idx.manager_code];
      
      console.log(`Row ${i}: Status=${status}, Approver=${approverCodeInRow}, Manager=${managerCode}`);
      
      if (status === 'รออนุมัติ') {
        if (approverCodeInRow === approverCode || managerCode === approverCode) {
          const request = {
            ticketId: r[idx['Ticket ID']] || '',
            status: status,
            employeeCode: r[idx.employeeCode] || '',
            employeeName: r[idx.employeeName] || '',
            employeeSection: r[idx.employeeSection] || '',
            employeeDepartment: r[idx.employeeDepartment] || '',
            employeePosition: r[idx.employeePosition] || '',
            type: r[idx.type] || '',
            days: r[idx.days] || 0,
            startDate: r[idx.startDate] ? new Date(r[idx.startDate]) : null,
            endDate: r[idx.endDate] ? new Date(r[idx.endDate]) : null,
            details: r[idx.details] || '',
            phone: r[idx.phone] || '',
            timestamp: r[idx.Timestamp] || new Date()
          };
          
          result.push(request);
          console.log('Added request:', request.ticketId);
        }
      }
    }

    console.log('Total pending requests found:', result.length);
    return json(true, 'ok', { 
      requests: result,
      count: result.length 
    });

  } catch (err) {
    console.error('getPendingRequestsByApprover error:', err);
    return json(false, 'เกิดข้อผิดพลาด: ' + err.toString());
  }
}

// ===============================
// Update Leave Status
// ===============================
function updateLeaveStatus(ticketId, status, approverCode, note) {
  console.log(`updateLeaveStatus: ${ticketId}, ${status}, ${approverCode}`);
  
  try {
    const sheet = getSheet(REQUESTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idx = indexMap(headers);

    let updated = false;
    
    for (let i = 1; i < data.length; i++) {
      const currentTicketId = String(data[i][idx['Ticket ID']]);
      
      if (currentTicketId === String(ticketId)) {
        console.log(`Found ticket at row ${i + 1}`);
        
        // อัปเดตสถานะ
        sheet.getRange(i + 1, idx.Status + 1).setValue(status);
        
        // อัปเดตหมายเหตุ (ถ้ามีคอลัมน์)
        if (idx.approval_note !== undefined) {
          sheet.getRange(i + 1, idx.approval_note + 1).setValue(note || '');
        }
        
        // อัปเดตวันที่อนุมัติ
        if (idx.approval_date !== undefined) {
          sheet.getRange(i + 1, idx.approval_date + 1).setValue(new Date());
        }
        
        // อัปเดตชื่อผู้อนุมัติ
        if (idx.approved_by !== undefined) {
          const approverName = getApproverName(approverCode);
          sheet.getRange(i + 1, idx.approved_by + 1).setValue(approverName);
        }
        
        updated = true;
        console.log('Update successful');
        break;
      }
    }

    if (updated) {
      return json(true, `อัปเดตสถานะเป็น "${status}" สำเร็จ`);
    } else {
      console.log('Ticket ID not found:', ticketId);
      return json(false, 'ไม่พบ Ticket ID');
    }

  } catch (err) {
    console.error('updateLeaveStatus error:', err);
    return json(false, 'เกิดข้อผิดพลาด: ' + err.toString());
  }
}

// ===============================
// Test Functions (สำหรับ Debug)
// ===============================
function testConnection() {
  console.log('Test connection called');
  return json(true, 'Server is running', {
    timestamp: new Date().toISOString(),
    version: VERSION
  });
}

function testGetData() {
  console.log('Test get data called');
  
  try {
    const sheet = getSheet(REQUESTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    return json(true, 'Data loaded', {
      headers: headers,
      rowCount: data.length - 1,
      firstRow: data[1] || null
    });
    
  } catch (err) {
    return json(false, 'Error: ' + err.toString());
  }
}

// ===============================
// Helper Functions
// ===============================
function json(success, message, extra = {}) {
  const result = { success, message, ...extra };
  console.log('Returning JSON:', result);
  return JSON.stringify(result);
}

function getSheet(name) {
  console.log('Getting sheet:', name);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  
  if (!sh) {
    console.error('Sheet not found:', name);
    const allSheets = ss.getSheets().map(s => s.getName());
    console.log('Available sheets:', allSheets);
    throw new Error('ไม่พบชีต: ' + name);
  }
  
  return sh;
}

function indexMap(headers) {
  const map = {};
  console.log('Creating index map from headers:', headers);
  
  headers.forEach((h, i) => {
    map[h] = i;
    console.log(`${h} -> ${i}`);
  });
  
  return map;
}

function getApproverName(code) {
  try {
    const sheet = getSheet(APPROVAL_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idx = indexMap(headers);

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idx.code]) === String(code)) {
        return data[i][idx.name] || code;
      }
    }
    return code;
  } catch (err) {
    console.error('getApproverName error:', err);
    return code;
  }
}

function getRoleName(code) {
  const map = {
    'ADMIN': 'ผู้ดูแลระบบ',
    'HR': 'ฝ่ายบุคคล',
    'MANAGER': 'ผู้จัดการ',
    'SUPERVISOR': 'หัวหน้าแผนก',
    'APPROVER': 'ผู้อนุมัติ',
    'HEADER': 'หัวหน้างาน'
  };
  
  return map[String(code).toUpperCase()] || code;
}

// ===============================
// Debug Functions
// ===============================
function debugInfo() {
  const user = Session.getActiveUser();
  const email = user.getEmail();
  
  const info = {
    userEmail: email,
    scriptId: ScriptApp.getScriptId(),
    scriptUrl: ScriptApp.getService().getUrl(),
    spreadsheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    version: VERSION,
    timestamp: new Date().toISOString()
  };
  
  console.log('Debug Info:', info);
  return json(true, 'Debug info', info);
}

function createTestData() {
  try {
    const approvalSheet = getSheet(APPROVAL_SHEET_NAME);
    
    // ข้อมูลทดสอบสำหรับ approval sheet
    const testData = [
      ['code', 'name', 'sex', 'section', 'department', 'position', 'role', 'permission_level', 'manager_code', 'password'],
      ['APP001', 'สมชาย ใจดี', 'ชาย', 'การผลิต', 'ผลิตยาง', 'ผู้จัดการ', 'MANAGER', '3', '', 'password123'],
      ['APP002', 'สุภาพร สวยงาม', 'หญิง', 'ทรัพยากรบุคคล', 'HR', 'หัวหน้า HR', 'HR', '4', '', 'password123'],
      ['EMP001', 'พนักงาน ตัวอย่าง', 'ชาย', 'การผลิต', 'ผลิตยาง', 'พนักงาน', 'EMPLOYEE', '1', 'APP001', 'password123']
    ];
    
    approvalSheet.clear();
    testData.forEach((row, index) => {
      approvalSheet.getRange(index + 1, 1, 1, row.length).setValues([row]);
    });
    
    console.log('Test data created in approval sheet');
    
    return json(true, 'Test data created');
    
  } catch (err) {
    console.error('Error creating test data:', err);
    return json(false, 'Error: ' + err.toString());
  }
}
