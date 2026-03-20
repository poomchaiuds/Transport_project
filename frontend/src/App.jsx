import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';   // เพิ่มไฟล์หน้า Admin
import DriverDashboard from './pages/DriverDashboard'; // เพิ่มไฟล์หน้า Driver
import DeviceManagement from './pages/DeviceManagement';
import PairDriver from './pages/PairDriver';

// --- 1. ตัวเลือกหน้า Dashboard ตาม Role (Low Effort) ---
const DashboardSelector = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const role = localStorage.getItem('user_role');

  // ถ้ายังไม่ได้ Login ให้กลับไปหน้า Login
  if (isLoggedIn !== 'true') {
    return <Navigate to="/" replace />;
  }

  // แยกหน้าตาม Role
  if (role === 'admin') {
    return <AdminDashboard />;
  } else if (role === 'driver') {
    return <DriverDashboard />;
  }

  // กรณี Error หรือไม่มี Role ให้กลับไป Login
  return <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* หน้าพื้นฐาน */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/manage-device" element={<DeviceManagement />} />

        {/* --- 2. หน้าหลักหลัง Login --- */}
        <Route path="/dashboard" element={<DashboardSelector />} />
        <Route path="/manage-pairing" element={<PairDriver />} />

        {/* ถ้า User พิมพ์ URL มั่ว ให้ดีดกลับหน้า Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;