<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eleave - เข้าสู่ระบบผู้อนุมัติ</title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
  <style>
    body {
      background: linear-gradient(135deg, #7fdaeb 0%, #3498db 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .login-box {
      background: #fff;
      padding: 40px;
      border-radius: 12px;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 20px 40px rgba(0,0,0,.2);
      text-align: center;
    }
    h2 { margin-bottom: 10px; color: #2c3e50; }
    p { color: #7f8c8d; margin-bottom: 25px; }
    .form-group { text-align: left; margin-bottom: 18px; }
    label { display: block; margin-bottom: 6px; font-weight: 600; }
    input {
      width: 100%;
      padding: 12px;
      border-radius: 6px;
      border: 2px solid #e1e8ed;
      font-size: 15px;
    }
    input:focus {
      outline: none;
      border-color: #3498db;
    }
    button {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 6px;
      background: linear-gradient(135deg, #27ae60, #2ecc71);
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      margin-top: 10px;
    }
    button:hover { opacity: .9; }
    .alert {
      display: none;
      margin-bottom: 15px;
      padding: 10px;
      border-radius: 6px;
      font-size: 14px;
    }
    .alert-error { background: #f8d7da; color: #721c24; }
    .loading { display: none; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="login-box">
    <h2><i class="fas fa-user-lock"></i> เข้าสู่ระบบ</h2>
    <p>ระบบอนุมัติการลางาน</p>

    <div id="alert" class="alert alert-error"></div>

    <div class="form-group">
      <label>รหัสพนักงาน</label>
      <input type="text" id="username" placeholder="รหัสพนักงาน" />
    </div>

    <div class="form-group">
      <label>รหัสผ่าน</label>
      <input type="password" id="password" placeholder="รหัสผ่าน" />
    </div>

    <button onclick="login()"><i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ</button>

    <div id="loading" class="loading">⏳ กำลังตรวจสอบ...</div>
  </div>

  <script>
    function showAlert(msg) {
      const el = document.getElementById('alert');
      el.textContent = msg;
      el.style.display = msg ? 'block' : 'none';
    }

    function showLoading(show) {
      document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    function login() {
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      if (!username || !password) {
        showAlert('กรุณากรอกข้อมูลให้ครบ');
        return;
      }

      showAlert('');
      showLoading(true);

      google.script.run
        .withSuccessHandler(function (result) {
          showLoading(false);
          const data = JSON.parse(result);

          if (!data.success) {
            showAlert(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
            return;
          }

          // เก็บข้อมูลผู้ใช้
          localStorage.setItem('approver_info', JSON.stringify(data.user));

          // ไปหน้าระบบอนุมัติ
          const baseUrl = window.location.origin + window.location.pathname;
          window.location.href = baseUrl + '?page=approver';
        })
        .withFailureHandler(function (err) {
          showLoading(false);
          showAlert('ระบบขัดข้อง: ' + err);
        })
        .login(username, password);
    }
  </script>
</body>
</html>
