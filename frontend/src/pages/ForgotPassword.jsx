import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { auth } from '../firebase-config';
import { sendPasswordResetEmail } from 'firebase/auth';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleResetPassword = async () => {
    if (!email) {
      Swal.fire('Warning', 'Please enter your email address first!', 'warning');
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      Swal.fire({
        icon: 'success',
        title: 'Email Sent!',
        text: 'Please check your inbox to reset your password.',
        confirmButtonColor: '#3085d6',
      }).then(() => {
        navigate('/');
      });
    } catch (error) {
      console.error("Reset Password Error:", error);
      
      let errorMsg = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'No user found with this email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email format.';
      }
      
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gray-900">
      {/* พื้นหลัง */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/src/assets/land.png')" }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* การ์ด Reset Password */}
      <div className="relative z-10 w-full max-w-[400px] bg-white/80 backdrop-blur-sm p-8 rounded-[30px] shadow-2xl">
        <h1 className="text-center text-2xl font-bold text-black mb-6">Reset Password</h1>
        
        <div className="flex flex-col gap-4">
          
          {/* Input Email */}
          <div>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-6 rounded-full border-none bg-white text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500 font-medium" 
            />
            {/* ข้อความ Helper Text */}
            <p className="text-center text-gray-600 text-sm mt-3 font-medium">
              Please type your email to<br />reset password.
            </p>
          </div>

          {/* ปุ่ม Sent */}
          <button 
            onClick={handleResetPassword}
            className="w-full h-12 bg-[#3df025] hover:bg-green-500 text-black font-bold rounded-full transition-all shadow-md active:scale-95 mt-2"
          >
            Sent
          </button>

          <div className="text-center text-xs text-gray-600 font-bold">OR</div>

          {/* ปุ่ม Back to Sign in */}
          <button 
            onClick={() => navigate('/')}
            className="w-full h-12 bg-[#3df025] hover:bg-green-500 text-black font-bold rounded-full transition-all shadow-md active:scale-95"
          >
            Back to Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;