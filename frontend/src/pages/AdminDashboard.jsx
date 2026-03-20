import React, { useEffect, useState } from 'react';
import landImage from '../assets/land.png';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminDriverView from './AdminDriverView';

const AdminDashboard = () => {
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [alertLogs, setAlertLogs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchedDriverId, setSearchedDriverId] = useState(null);
  const name = localStorage.getItem('user_name');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActiveDrivers = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/api/bookings/');
        setActiveDrivers(res.data || []);
      } catch (error) {
        console.error('Error fetching active drivers:', error);
        setActiveDrivers([]);
      }
    };
    const fetchAlertLogs = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/api/devices/alert-logs/');
        setAlertLogs(res.data || []);
      } catch (error) {
        console.error('Error fetching alert logs:', error);
      }
    };
    fetchActiveDrivers();
    fetchAlertLogs();
    const interval = setInterval(() => {
      fetchActiveDrivers();
      fetchAlertLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) setSearchedDriverId(trimmed);
  };

  const handleRowClick = (userId) => {
    setSearchInput(String(userId));
    setSearchedDriverId(String(userId));
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${landImage})` }}>
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Admin Navbar */}
        <nav className="flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-gray-100 px-8 py-4 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-6 text-gray-700 tracking-wide font-bold">
            <span className="text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider border-r border-gray-200 pr-6" onClick={() => navigate('/dashboard')}>
              Admin
            </span>
            <span className="text-gray-500 hover:text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider border-r border-gray-200 pr-6" onClick={() => navigate('/manage-pairing')}>
              Pair Driver
            </span>
            <span className="text-gray-500 hover:text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider" onClick={() => navigate('/manage-device')}>
              Manage Device
            </span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/'); }}
            className="px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 shadow-sm">
            Logout
          </button>
        </nav>

        {/* Main Content */}
        <div className="p-8 flex flex-col gap-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex justify-center gap-3">
            <input
              type="text"
              placeholder="Search by Driver ID..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="rounded-full px-6 py-2 w-80 text-black outline-none bg-white/90 focus:ring-2 focus:ring-green-400 shadow-lg"
            />
            <button type="submit"
              className="px-6 py-2 rounded-full font-bold text-sm text-white shadow-lg transition-all"
              style={{ background: 'linear-gradient(90deg,#3b82f6,#6366f1)' }}>
              Search
            </button>
            {searchedDriverId && (
              <button type="button" onClick={() => { setSearchedDriverId(null); setSearchInput(''); }}
                className="px-5 py-2 rounded-full font-bold text-sm text-white bg-gray-400 hover:bg-gray-500 shadow-lg transition-all">
                Clear
              </button>
            )}
          </form>

          {/* Driver View (when searched) */}
          {searchedDriverId ? (
            <div className="w-full">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-white font-bold text-xl drop-shadow">
                  Driver Monitor — <span className="text-green-300">ID: {searchedDriverId}</span>
                </h2>
              </div>
              <AdminDriverView driverId={searchedDriverId} />
            </div>
          ) : (
            /* Default: Active Drivers table + Alert Logs */
            <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl mx-auto">
              {/* Active Drivers */}
              {/* Active Drivers */}
              <div className="bg-white text-black rounded-[30px] shadow-2xl overflow-hidden flex-1 border border-gray-100 flex flex-col">
                <div className="px-8 pt-6 pb-4 border-b border-gray-100" style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
                  <h3 className="font-bold text-gray-800 text-lg uppercase tracking-widest">Active Drivers</h3>
                  <p className="text-gray-400 text-sm mt-1">Currently paired user and device list</p>
                </div>
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto p-4">
                  <table className="w-full text-center border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="text-gray-400 text-xs font-bold uppercase tracking-widest border-b-2 border-gray-50">
                        <th className="pb-4 pt-2">User ID</th>
                        <th className="pb-4 pt-2">Device ID</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm">
                      {activeDrivers.map((item) => (
                        <tr key={item.id}
                          className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                          onClick={() => handleRowClick(item.user_id_val)}
                          title="Click to view driver dashboard"
                        >
                          <td className="py-4 px-2">
                            <span className="font-bold text-blue-600 group-hover:text-blue-800 transition-colors">{item.user_id_val}</span>
                          </td>
                          <td className="py-4 px-2 font-mono text-gray-500 bg-gray-50/30">
                            {item.device_id_val}
                          </td>
                        </tr>
                      ))}
                      {activeDrivers.length === 0 && (
                        <tr>
                          <td colSpan="2" className="py-16">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                <span className="text-gray-300 text-xl font-bold">?</span>
                              </div>
                              <span className="text-gray-400 font-medium tracking-wide">No active drivers found.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alert Logs */}
              <div className="bg-white text-black rounded-[30px] shadow-2xl overflow-hidden flex-[2] border border-gray-100 flex flex-col">
                <div className="px-8 pt-6 pb-4 border-b border-gray-100" style={{ background: 'linear-gradient(90deg,#fff1f2,#fef2f2)' }}>
                  <h3 className="font-bold text-gray-800 text-lg uppercase tracking-widest">Alert Logs</h3>
                  <p className="text-gray-400 text-sm mt-1">Recent drowsiness alerts over 50%</p>
                </div>
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto p-4">
                  <table className="w-full text-center border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="text-gray-400 text-xs font-bold uppercase tracking-widest border-b-2 border-gray-50">
                        <th className="pb-4 pt-2">Time</th>
                        <th className="pb-4 pt-2 text-left px-4">Driver</th>
                        <th className="pb-4 pt-2">Device ID</th>
                        <th className="pb-4 pt-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm">
                      {alertLogs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-red-50/50 transition-colors group">
                          <td className="py-4 px-2">
                            <span className="font-medium text-gray-500">{new Date(log.timestamp).toLocaleTimeString('th-TH')}</span>
                          </td>
                          <td className="py-4 px-4 text-left">
                            <div className="font-bold text-gray-800 group-hover:text-red-700 transition-colors">{log.driver_name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">ID: {log.driver_id}</div>
                          </td>
                          <td className="py-4 px-2 font-mono text-gray-500">{log.device_id}</td>
                          <td className="py-4 px-2">
                            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-wide border border-red-100 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              Drowsy &gt; 50%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {alertLogs.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-16">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                <span className="text-gray-300 text-xl font-bold">!</span>
                              </div>
                              <span className="text-gray-400 font-medium tracking-wide">No recent alerts.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;