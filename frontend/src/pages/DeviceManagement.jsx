import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import landImage from '../assets/land.png'; // ตรวจสอบ path รูปภาพให้ถูกต้อง
import axios from 'axios';
import Swal from 'sweetalert2';

const DeviceManagement = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    device_id: '',
    carplate: '',
    mac_address: ''
  });

  const fetchDevices = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/devices/');
      setDevices(response.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAddOrUpdate = async () => {
    if (!formData.device_id || !formData.mac_address) {
      Swal.fire('Warning', 'Please fill in Device ID and MAC Address', 'warning');
      return;
    }
    try {
      if (selectedId) {
        await axios.put(`http://127.0.0.1:8000/api/devices/${selectedId}/`, formData);
        Swal.fire('Success', 'Device updated successfully!', 'success');
      } else {
        await axios.post('http://127.0.0.1:8000/api/devices/', formData);
        Swal.fire('Success', 'Device added successfully!', 'success');
      }
      setFormData({ device_id: '', carplate: '', mac_address: '' });
      setSelectedId(null);
      fetchDevices();
    } catch (error) {
      console.error(`Error ${selectedId ? 'updating' : 'adding'} device:`, error.response?.data);
      Swal.fire('Error', `Failed: ` + JSON.stringify(error.response?.data), 'error');
    }
  };

  const handleRemove = async () => {
    if (!selectedId) {
      Swal.fire('Warning', 'Please select a device from the table first!', 'warning');
      return;
    }
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You want to remove Device: ${selectedId}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e63946',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, remove it!'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/devices/${selectedId}/`);
        Swal.fire('Deleted!', 'Device removed!', 'success');
        setSelectedId(null);
        fetchDevices();
      } catch (error) {
        console.error("Error removing device:", error);
        Swal.fire('Error', 'Failed to remove device.', 'error');
      }
    }
  };

  const handleRowClick = (device) => {
    if (selectedId === device.device_id) {
      // Unselect
      setSelectedId(null);
      setFormData({ device_id: '', carplate: '', mac_address: '' });
    } else {
      // Select
      setSelectedId(device.device_id);
      setFormData({
        device_id: device.device_id,
        carplate: device.carplate || '',
        mac_address: device.mac_address || ''
      });
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans">

      {/* --- เลเยอร์ 1: พื้นหลัง --- */}
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${landImage})` }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      </div>

      {/* --- เลเยอร์ 2: เนื้อหา --- */}
      <div className="relative z-10 flex flex-col min-h-screen">

        <nav className="flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-gray-100 px-8 py-4 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-6 text-gray-700 tracking-wide font-bold">
            <span className="text-gray-500 hover:text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider border-r border-gray-200 pr-6" onClick={() => navigate('/dashboard')}>
              Admin
            </span>
            <span className="text-gray-500 hover:text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider border-r border-gray-200 pr-6" onClick={() => navigate('/manage-pairing')}>
              Pair Driver
            </span>
            <span className="text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider" onClick={() => navigate('/manage-device')}>
              Manage Device
            </span>
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
                <h3 className="font-bold text-gray-800 text-lg uppercase tracking-widest">{selectedId ? 'Edit Device' : 'Add Device'}</h3>
                <p className="text-gray-400 text-sm mt-1">{selectedId ? 'Modify device details below' : 'Register a new device'}</p>
              </div>

              <div className="p-8 space-y-5 flex-1 flex flex-col justify-center bg-white">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 ml-2">Device ID <span className="text-red-500">*</span></label>
                  <input
                    type="text" placeholder="e.g. Pi_03" value={formData.device_id}
                    className="w-full h-12 px-5 rounded-full border-2 border-gray-200 bg-gray-50 outline-none focus:border-green-400 focus:bg-white text-gray-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                    disabled={selectedId !== null}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 ml-2">Car Plate</label>
                  <input
                    type="text" placeholder="e.g. 1กก 1234" value={formData.carplate}
                    className="w-full h-12 px-5 rounded-full border-2 border-gray-200 bg-gray-50 outline-none focus:border-green-400 focus:bg-white text-gray-800 transition-all font-medium"
                    onChange={(e) => setFormData({ ...formData, carplate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 ml-2">MAC Address <span className="text-red-500">*</span></label>
                  <input
                    type="text" placeholder="00:1B:44:11:3A:B7" value={formData.mac_address}
                    className="w-full h-12 px-5 rounded-full border-2 border-gray-200 bg-gray-50 outline-none focus:border-green-400 focus:bg-white text-gray-800 transition-all font-mono text-sm"
                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <button onClick={handleAddOrUpdate} className={`w-full py-3.5 text-white font-bold rounded-full shadow-md transition-all text-lg ${selectedId ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#3df025] hover:bg-[#32cc1f] text-black'}`}>
                    {selectedId ? 'Update Device' : 'Add Device'}
                  </button>
                  {selectedId && (
                    <button onClick={handleRemove} className="w-full py-3.5 bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold rounded-full shadow-sm transition-all text-lg">
                      Remove Selected
                    </button>
                  )}
                  {selectedId && (
                    <button onClick={() => handleRowClick({device_id: selectedId})} className="w-full py-3.5 bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold rounded-full shadow-sm transition-all text-sm">
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* --- ฝั่งขวา: Table --- */}
            <div className="bg-white text-black rounded-[30px] shadow-2xl overflow-hidden flex-1 border border-gray-100 flex flex-col">
              <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex justify-between items-center" style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg uppercase tracking-widest">Device Lists</h3>
                  <p className="text-gray-400 text-sm mt-1">All registered driver devices</p>
                </div>
                <div className="bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total: <span className="text-blue-600">{devices.length}</span></span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[450px] overflow-y-auto p-4 flex-1">
                <table className="w-full text-center border-collapse">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-gray-400 text-xs font-bold uppercase tracking-widest border-b-2 border-gray-50">
                      <th className="pb-4 pt-2">Device ID</th>
                      <th className="pb-4 pt-2">Car Plate</th>
                      <th className="pb-4 pt-2">MAC Address</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm">
                    {devices.map((device) => {
                      const isSelected = selectedId === device.device_id;
                      return (
                        <tr
                          key={device.device_id}
                          onClick={() => handleRowClick(device)}
                          className={`cursor-pointer transition-all duration-200 border-b border-gray-50 group
                            ${isSelected
                              ? 'bg-blue-50'
                              : 'hover:bg-blue-50/50'
                            }`}
                        >
                          <td className="py-4 px-2">
                             <span className={`font-bold transition-colors ${isSelected ? 'text-blue-700' : 'text-blue-600 group-hover:text-blue-800'}`}>{device.device_id}</span>
                          </td>
                          <td className="py-4 px-2">{device.carplate || '-'}</td>
                          <td className="py-4 px-2 font-mono text-gray-500 bg-gray-50/30">{device.mac_address}</td>
                        </tr>
                      );
                    })}
                    {devices.length === 0 && (
                      <tr>
                        <td colSpan="3" className="py-16">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                              <span className="text-gray-300 text-xl font-bold">?</span>
                            </div>
                            <span className="text-gray-400 font-medium tracking-wide">No devices found.</span>
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

export default DeviceManagement;