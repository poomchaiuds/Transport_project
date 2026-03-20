import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import landImage from '../assets/land.png'; // ตรวจสอบ path รูปภาพให้ถูกต้องด้วยนะครับ
import axios from 'axios';
import Swal from 'sweetalert2';

const PairDriver = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [pairings, setPairings] = useState([]);

  // ข้อมูล role และ user ของคนที่ล็อกอินอยู่
  const role = localStorage.getItem('user_role');
  const userId = localStorage.getItem('user_id');
  const isDriver = role === 'driver';

  // State สำหรับ Form และแถวที่ถูกเลือกในตาราง
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedPairId, setSelectedPairId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, devicesRes, bookingsRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/users/'),
        axios.get('http://127.0.0.1:8000/api/devices/'),
        axios.get('http://127.0.0.1:8000/api/bookings/')
      ]);
      setDrivers(usersRes.data);
      setDevices(devicesRes.data);
      setPairings(bookingsRes.data);

      // ถ้าเป็นฝั่ง Driver ให้บังคับเลือก User เป็นตัวเองเท่านั้น
      if (isDriver && userId) {
        setSelectedUser(userId);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleAddPairing = async () => {
    // ฝั่ง Driver บังคับใช้ userId ปัจจุบันเสมอ
    const userForPair =
      isDriver && userId
        ? userId
        : selectedUser;

    if (!userForPair || !selectedDevice) {
      Swal.fire('Warning', 'Please select both Driver and Device', 'warning');
      return;
    }

    try {
      await axios.post('http://127.0.0.1:8000/api/bookings/', {
        user: userForPair,    
        device: selectedDevice 
      });
      Swal.fire('Success', 'Pairing added successfully!', 'success');
      if (!isDriver) {
        setSelectedUser('');
      }
      setSelectedDevice('');
      fetchData();
    } catch (error) {
      console.error("Error Details:", error.response?.data);
      Swal.fire('Error', "Failed: " + JSON.stringify(error.response?.data), 'error');
    }
  };

  const handleRemove = async () => {
    if (!selectedPairId) {
      Swal.fire('Warning', 'Please select a pairing from the table first!', 'warning');
      return;
    }
    // ตรวจสอบว่าเป็น pairing ของตัวเองเท่านั้น (กรณีเป็น Driver)
    const targetPair = pairings.find((p) => p.id === selectedPairId);
    if (isDriver && targetPair && String(targetPair.user_id_val) !== String(userId)) {
      Swal.fire('Warning', 'You can remove only your own pairing.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You want to remove this pairing?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e63946',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, remove it!'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/bookings/${selectedPairId}/`);
        Swal.fire('Deleted!', 'Pairing removed!', 'success');
        setSelectedPairId(null); // ล้างค่าที่เลือก
        fetchData();
      } catch (error) {
        console.error("Error removing pairing:", error);
        Swal.fire('Error', 'Failed to remove pairing.', 'error');
      }
    }
  };

  // กำหนดรายการ pairing สำหรับแสดงในตาราง
  const visiblePairings = isDriver && userId
    ? pairings.filter((p) => String(p.user_id_val) === String(userId))
    : pairings;

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans">
      
      {/* --- เลเยอร์ 1: พื้นหลัง --- */}
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${landImage})` }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      </div>

      {/* --- เลเยอร์ 2: เนื้อหา --- */}
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Navbar แยกตาม role */}
        <nav className="flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-gray-100 px-8 py-4 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-6 text-gray-700 tracking-wide font-bold">
            {isDriver ? (
              <>
                <span className="text-gray-500 hover:text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider border-r border-gray-200 pr-6" onClick={() => navigate('/dashboard')}>
                  Driver
                </span>
                <span className="text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider" onClick={() => navigate('/manage-pairing')}>
                  Pair Driver
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-500 hover:text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider border-r border-gray-200 pr-6" onClick={() => navigate('/dashboard')}>
                  Admin
                </span>
                <span className="text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider border-r border-gray-200 pr-6" onClick={() => navigate('/manage-pairing')}>
                  Pair Driver
                </span>
                <span className="text-gray-500 hover:text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider" onClick={() => navigate('/manage-device')}>
                  Manage Device
                </span>
              </>
            )}
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/'); }}
            className="px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 shadow-sm">
            Logout
          </button>
        </nav>

        {/* --- พื้นที่จัดกึ่งกลาง (Center Container) --- */}
        <div className="flex-1 flex justify-center items-center p-6">
          <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl items-stretch">
            
            {/* --- ฝั่งซ้าย: Form --- */}
            <div className="bg-white text-black rounded-[30px] shadow-2xl overflow-hidden md:w-[400px] border border-gray-100 flex flex-col">
              <div className="px-8 pt-6 pb-4 border-b border-gray-100" style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
                <h3 className="font-bold text-gray-800 text-lg uppercase tracking-widest">Pair Driver</h3>
                <p className="text-gray-400 text-sm mt-1">Assign a device to a driver</p>
              </div>
              
              <div className="p-8 space-y-5 flex-1 flex flex-col justify-center bg-white">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 ml-2">Driver (User ID) <span className="text-red-500">*</span></label>
                  {/* ถ้าเป็น Driver ให้ล็อกเป็นของตัวเอง แสดงแบบอ่านอย่างเดียว */}
                  {isDriver ? (
                    <div className="w-full h-12 px-5 flex items-center rounded-full border-2 border-gray-200 bg-gray-50 text-gray-800 font-medium">
                      {drivers.find((d) => String(d.userid) === String(userId))
                        ? `${drivers.find((d) => String(d.userid) === String(userId)).name} (${userId})`
                        : userId || 'Current Driver'}
                    </div>
                  ) : (
                    <select
                      className="w-full h-12 px-5 rounded-full border-2 border-gray-200 bg-gray-50 outline-none focus:border-green-400 focus:bg-white text-gray-800 transition-all font-medium appearance-none"
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                    >
                      <option value="">-- Select Driver --</option>
                      {drivers.map((driver) => (
                        <option key={driver.userid} value={driver.userid}>
                          {driver.name} ({driver.userid})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 ml-2">Device ID <span className="text-red-500">*</span></label>
                  <select
                    className="w-full h-12 px-5 rounded-full border-2 border-gray-200 bg-gray-50 outline-none focus:border-green-400 focus:bg-white text-gray-800 transition-all font-medium appearance-none"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                  >
                    <option value="">-- Select Device --</option>
                    {devices.map((device) => (
                      <option key={device.device_id} value={device.device_id}>
                        {device.device_id} {device.carplate ? `(${device.carplate})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-4 space-y-3">
                  <button onClick={handleAddPairing} className="w-full py-3.5 bg-[#3df025] hover:bg-[#32cc1f] text-black font-bold rounded-full shadow-md transition-all text-lg">
                    Add Pairing
                  </button>
                  <button onClick={handleRemove} className="w-full py-3.5 bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold rounded-full shadow-sm transition-all text-lg">
                    Remove Selected
                  </button>
                </div>
              </div>
            </div>

            {/* --- ฝั่งขวา: Table --- */}
            <div className="bg-white text-black rounded-[30px] shadow-2xl overflow-hidden flex-1 border border-gray-100 flex flex-col">
              <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex justify-between items-center" style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg uppercase tracking-widest">Pairing Lists</h3>
                  <p className="text-gray-400 text-sm mt-1">All active driver-device pairings</p>
                </div>
                <div className="bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total: <span className="text-blue-600">{visiblePairings.length}</span></span>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-[450px] overflow-y-auto p-4 flex-1">
                <table className="w-full text-center border-collapse">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-gray-400 text-xs font-bold uppercase tracking-widest border-b-2 border-gray-50">
                      <th className="pb-4 pt-2">User ID</th>
                      <th className="pb-4 pt-2">Device ID</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm">
                    {visiblePairings.map((pair) => {
                      const isSelected = selectedPairId === pair.id;
                      return (
                        <tr 
                          key={pair.id} 
                          onClick={() => setSelectedPairId(pair.id)}
                          className={`cursor-pointer transition-all duration-200 border-b border-gray-50 group
                            ${isSelected 
                              ? 'bg-blue-50' 
                              : 'hover:bg-blue-50/50'}`}
                        >
                          <td className="py-4 px-2">
                             <span className={`font-bold transition-colors ${isSelected ? 'text-blue-700' : 'text-blue-600 group-hover:text-blue-800'}`}>{pair.user_id_val}</span>
                          </td>
                          <td className="py-4 px-2 font-mono text-gray-500 bg-gray-50/30">{pair.device_id_val}</td>
                        </tr>
                      );
                    })}
                    {pairings.length === 0 && (
                      <tr>
                        <td colSpan="2" className="py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                              <span className="text-gray-300 text-xl font-bold">?</span>
                            </div>
                            <span className="text-gray-400 font-medium tracking-wide">No pairings found.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default PairDriver;