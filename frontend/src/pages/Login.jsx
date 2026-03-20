import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase-config'; // ตรวจสอบ path ไฟล์ firebase ของคุณด้วย
import { signInWithEmailAndPassword } from 'firebase/auth';
import Swal from 'sweetalert2';

const Login = () => {
  const navigate = useNavigate();
  
  // 1. สร้าง State สำหรับเก็บค่าที่พิมพ์
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. ฟังก์ชันจัดการการ Login
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ขั้นตอนที่ ก: ยืนยันตัวตนผ่าน Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fb_uid = userCredential.user.uid;

      // ขั้นตอนที่ ข: ส่ง fb_uid ไปถาม Django ว่า User คนนี้มี Role อะไร
      // เปลี่ยน URL เป็น API ของคุณ (เช่น http://127.0.0.1:8000/api/user-info/)
      const response = await axios.get(`http://127.0.0.1:8000/api/user-info/${fb_uid}/`);

      if (response.data) {
        // ขั้นตอนที่ ค: เก็บข้อมูลลง localStorage (Low Effort)
        localStorage.setItem('user_role', response.data.role); 
        localStorage.setItem('user_name', response.data.name);
        // สมมติว่ามีฟิลด์ userid ใน response ซึ่งใช้ตอน Pair Driver
        if (response.data.userid) {
          localStorage.setItem('user_id', response.data.userid);
        }
        localStorage.setItem('isLoggedIn', 'true');

        // ไปที่หน้า Dashboard (เดี๋ยว App.jsx จะจัดการเลือกหน้า Admin/Driver เอง)
        navigate('/dashboard');
      }

    } catch (error) {
      console.error("Login Error:", error);
      Swal.fire('Login Failed', 'ตรวจสอบ Email/Password หรือการเชื่อมต่อ Server', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gray-900">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/src/assets/land.png')" }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <div className="relative z-10 w-full max-w-[380px] bg-white/80 backdrop-blur-sm p-8 rounded-[30px] shadow-2xl flex flex-col items-center">
        <h1 className="text-2xl font-bold text-black mb-6 tracking-wide">WELCOME</h1>
        
        <form onSubmit={handleSignIn} className="w-full flex flex-col gap-4">
          <input 
            type="email"  // เปลี่ยนเป็น email เพื่อให้ตรงกับ Firebase Auth
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 px-6 rounded-full border-none bg-white text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500 font-medium" 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-12 px-6 rounded-full border-none bg-white text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500 font-medium" 
          />
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#3df025] hover:bg-green-500 text-black font-bold rounded-full transition-all shadow-md active:scale-95 mt-2"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="text-center text-xs text-gray-600 font-bold my-4">OR</div>

        <button 
          onClick={() => navigate('/register')}
          className="w-full h-12 bg-[#3df025] hover:bg-green-500 text-black font-bold rounded-full transition-all shadow-md active:scale-95"
        >
          Register
        </button>

        <div className="text-center mt-4">
          <span 
            onClick={() => navigate('/forgot-password')}
            className="text-gray-600 text-sm font-semibold hover:text-black hover:underline transition-colors cursor-pointer"
          >
            Forget Password
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;