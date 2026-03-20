import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase-config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import axios from 'axios';
import Swal from 'sweetalert2';

const Register = () => {
  const navigate = useNavigate();
  // สร้าง State เก็บข้อมูลจาก Input
  const [formData, setFormData] = useState({
    userid: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    role: 'driver' // กำหนด default ตามรูปพื้นหลังที่เป็นรถ
  });

  const handleRegister = async () => {
    try {
      // 1. สมัครสมาชิกผ่าน Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const fb_uid = userCredential.user.uid;

      // 2. ส่งข้อมูลไปเก็บที่ Django (PostgreSQL)
      const djangoData = {
    userid: formData.userid,
    fb_uid: fb_uid,      // ได้มาจาก Firebase
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    role: formData.role
};

await axios.post('http://3.26.163.23/api/register/', djangoData);
      Swal.fire({
        icon: 'success',
        title: 'Registration Successful!',
        showConfirmButton: false,
        timer: 1500
      }).then(() => {
        navigate('/'); // สมัครเสร็จกลับไปหน้า Login
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', "Error: " + error.message, 'error');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gray-900">
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('/src/assets/land.png')" }}>
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <div className="relative z-10 w-full max-w-[400px] bg-white/80 backdrop-blur-sm p-10 rounded-[40px] shadow-2xl">
        <h1 className="text-center text-2xl font-bold text-gray-800 mb-8">Register</h1>
        
        <div className="flex flex-col gap-4">
          <input type="text" placeholder="UserID" className="w-full h-12 px-6 rounded-full bg-white shadow-sm outline-none focus:ring-2 focus:ring-green-400" 
            onChange={(e) => setFormData({...formData, userid: e.target.value})} />
          
          <input type="password" placeholder="Password" className="w-full h-12 px-6 rounded-full bg-white shadow-sm outline-none focus:ring-2 focus:ring-green-400" 
            onChange={(e) => setFormData({...formData, password: e.target.value})} />
          
          <input type="text" placeholder="Full Name" className="w-full h-12 px-6 rounded-full bg-white shadow-sm outline-none focus:ring-2 focus:ring-green-400" 
            onChange={(e) => setFormData({...formData, name: e.target.value})} />
          
          <input type="text" placeholder="Phone Number" className="w-full h-12 px-6 rounded-full bg-white shadow-sm outline-none focus:ring-2 focus:ring-green-400" 
            onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          
          <input type="email" placeholder="Email" className="w-full h-12 px-6 rounded-full bg-white shadow-sm outline-none focus:ring-2 focus:ring-green-400" 
            onChange={(e) => setFormData({...formData, email: e.target.value})} />
          
          <button onClick={handleRegister} className="w-full h-12 bg-[#3df025] hover:bg-green-500 text-black font-bold rounded-full transition-all mt-4 shadow-lg">
            Register
          </button>

          <div className="text-center text-xs text-gray-500 font-bold my-1">OR</div>

          <button onClick={() => navigate('/')} className="w-full h-12 bg-[#3df025] hover:bg-green-500 text-black font-bold rounded-full transition-all shadow-lg">
            Back to Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;