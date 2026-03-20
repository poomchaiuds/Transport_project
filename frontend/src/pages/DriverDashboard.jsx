import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import landImage from '../assets/land.png';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import Swal from 'sweetalert2';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const driverName = localStorage.getItem('user_name');
  const userId = localStorage.getItem('user_id');
  const [deviceId, setDeviceId] = useState('Inactive');
  const [deviceStatus, setDeviceStatus] = useState('offline');
  const [pairId, setPairId] = useState(null);
  const [co2Value, setCo2Value] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [alertActive, setAlertActive] = useState(false);
  const alertedMinuteRef = useRef(null); // เก็บนาทีล่าสุดที่ส่ง alert ไปแล้ว

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId) {
          setDeviceId('Inactive');
          setDeviceStatus('offline');
          return;
        }

        // Fetch bookings
        const resBooking = await axios.get('http://3.26.163.23/api/bookings/');
        const pairings = resBooking.data || [];
        const myPair = pairings.find((p) => String(p.user_id_val) === String(userId));

        if (!myPair) {
          setDeviceId('Inactive');
          setPairId(null);
          setDeviceStatus('offline');
          return;
        }

        const currentDeviceId = myPair.device_id_val || 'Inactive';
        setDeviceId(currentDeviceId);
        setPairId(myPair.id ?? null);

        // Fetch device status
        if (currentDeviceId !== 'Inactive') {
          const resDevice = await axios.get('http://3.26.163.23/api/devices/');
          const devices = resDevice.data || [];
          const myDevice = devices.find((d) => String(d.device_id) === String(currentDeviceId));
          if (myDevice) {
            setDeviceStatus(myDevice.status);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setDeviceId('Inactive');
        setPairId(null);
        setDeviceStatus('offline');
      }
    };

    fetchData();

    // Fetch CO2 ล่าสุดจาก driver_id ที่ตรงกัน
    const fetchCo2 = async () => {
      if (!userId) return;
      try {
        const res = await axios.get(`http://3.26.163.23/api/devices/driver/${userId}/latest-co2/`);
        setCo2Value(res.data.co2);
      } catch (err) {
        console.error('Error fetching CO2:', err);
      }
    };

    const fetchPredictionHistory = async () => {
      if (!userId) return;
      try {
        const res = await axios.get(`http://3.26.163.23/api/devices/driver/${userId}/prediction-history/`);
        const formattedData = res.data.map(item => {
          const date = new Date(item.timestamp);
          return {
            ...item,
            time: date.toLocaleTimeString('th-TH'),
            risk_numeric: item.risk_level === 'drowsy' ? 1 : 0
          };
        });
        setPredictionHistory(formattedData);
      } catch (err) {
        console.error('Error fetching prediction history:', err);
      }
    };

    fetchCo2();
    fetchPredictionHistory();
    const interval = setInterval(() => {
      fetchCo2();
      fetchPredictionHistory();
    }, 5000); // poll ทุก 5 วินาที
    return () => clearInterval(interval);
  }, [userId]);

  const handleRemoveDevice = async () => {
    if (!pairId) return;
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You want to remove this device pairing?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e63946',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, remove it!'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`http://3.26.163.23/api/bookings/${pairId}/`);
        setDeviceId('Inactive');
        setPairId(null);
        setDeviceStatus('offline');
        Swal.fire('Deleted!', 'Device pairing removed.', 'success');
      } catch (error) {
        console.error('Error removing device pairing:', error);
        Swal.fire('Error', 'Failed to remove device pairing.', 'error');
      }
    }
  };

  const handleToggleStatus = async () => {
    if (deviceId === 'Inactive') return;
    try {
      const res = await axios.post(`http://3.26.163.23/api/devices/${deviceId}/toggle-status/`);
      setDeviceStatus(res.data.status);
    } catch (error) {
      console.error('Error toggling device status:', error);
      Swal.fire('Error', 'Failed to update status', 'error');
    }
  };

  const hasDevice = deviceId && deviceId !== 'Inactive';

  // ดึงค่า sensor ล่าสุดจาก prediction history
  const latestPred = predictionHistory.length > 0 ? predictionHistory[predictionHistory.length - 1] : null;
  const cameraWorking = latestPred ? !(latestPred.ear === 0 && latestPred.mar === 0) : null;
  const gyroWorking = latestPred ? latestPred.gyro_x !== 0 : null;

  // กรุ๊ป prediction ตามนาที และนับจำนวน active/drowsy
  const chartData = useMemo(() => {
    const byMinute = {};
    predictionHistory.forEach(item => {
      const d = new Date(item.timestamp);
      const key = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      if (!byMinute[key]) byMinute[key] = { minute: key, active: 0, drowsy: 0 };
      if (item.risk_level === 'active') byMinute[key].active += 1;
      else byMinute[key].drowsy += 1;
    });
    return Object.values(byMinute);
  }, [predictionHistory]);

  // ตรวจสอบ drowsy % ในนาทีล่าสุด แล้วส่ง alert ถ้า >= 50%
  useEffect(() => {
    if (chartData.length === 0 || !deviceId || deviceId === 'Inactive') return;
    const latest = chartData[chartData.length - 1];
    const total = latest.active + latest.drowsy;
    if (total === 0) return;
    const drowsyPct = (latest.drowsy / total) * 100;
    // ส่งแค่ครั้งเดียวต่อนาที (ไม่ส่งซ้ำ)
    if (drowsyPct >= 50 && alertedMinuteRef.current !== latest.minute) {
      alertedMinuteRef.current = latest.minute;
      setAlertActive(true);
      axios.post(`http://3.26.163.23/api/devices/${deviceId}/alert/`, {
        driver_id: userId,
        driver_name: driverName
      })
        .then(() => console.log(`[ALERT] Sent alert for minute ${latest.minute}, drowsy ${Math.round(drowsyPct)}%`))
        .catch(err => console.error('[ALERT] Failed to send alert:', err));
      // ปิด banner หลังจาก 10 วินาที
      setTimeout(() => setAlertActive(false), 10000);
    } else if (drowsyPct < 50) {
      setAlertActive(false);
    }
  }, [chartData, deviceId]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      {/* พื้นหลังให้เหมือน Admin */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${landImage})` }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navbar เหมือนหน้า Admin แต่ใช้คำว่า Driver / Pair Driver */}
        <nav className="flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-gray-100 px-8 py-4 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-6 text-gray-700 tracking-wide font-bold">
            <span className="text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider border-r border-gray-200 pr-6" onClick={() => navigate('/dashboard')}>
              Driver
            </span>
            <span className="text-gray-500 hover:text-blue-600 text-sm font-bold cursor-pointer transition-colors uppercase tracking-wider" onClick={() => navigate('/manage-pairing')}>
              Pair Driver
            </span>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            className="px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 shadow-sm"
          >
            Logout
          </button>
        </nav>

        {/* Alert Banner */}
        {alertActive && (
          <div
            className="flex items-center gap-3 px-6 py-3 text-white font-bold text-sm"
            style={{
              background: 'linear-gradient(90deg,#dc2626,#b91c1c)',
              animation: 'pulse 1s infinite'
            }}
          >
            <span>DROWSINESS ALERT — คนขับง่วงนอนเกิน 50% ในนาทีนี้! กำลังส่งสัญญาณแจ้งเตือนไปที่อุปกรณ์...</span>
            <button
              onClick={() => setAlertActive(false)}
              className="ml-auto text-white/70 hover:text-white text-lg leading-none"
            >✕</button>
          </div>
        )}

        {/* เนื้อหาหลักเดิม แปลงเป็น Tailwind คร่าว ๆ ไว้ก่อนก็ได้ แต่ตามโจทย์หลักคือ Navbar */}
        <div className="flex-1 flex px-10 py-10 gap-8">
          <div className="w-[350px] space-y-4">
            {/* Device Info Card — white theme */}
            <div className="rounded-[20px] overflow-hidden shadow-md border border-gray-100" style={{ background: '#ffffff' }}>
              <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100" style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
                <p className="text-gray-700 font-bold text-sm tracking-widest uppercase">Device Info</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-sm">Driver</span>
                  <span className="text-gray-800 font-bold text-sm">{driverName}</span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-sm">Device ID</span>
                  <span className="text-gray-800 font-bold text-sm">{deviceId}</span>
                </div>
                {hasDevice && (
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <span className="text-gray-500 text-sm">Status</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide" style={{ background: deviceStatus === 'online' ? '#dcfce7' : '#fee2e2', color: deviceStatus === 'online' ? '#16a34a' : '#dc2626' }}>
                      {deviceStatus === 'online' ? '● ONLINE' : '● OFFLINE'}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-2 pt-1">
                  {hasDevice && (
                    <button onClick={handleToggleStatus} className="w-full py-2 rounded-full font-bold text-sm text-white transition-all" style={{ background: deviceStatus === 'online' ? 'linear-gradient(90deg,#f97316,#ef4444)' : 'linear-gradient(90deg,#3b82f6,#6366f1)' }}>
                      {deviceStatus === 'offline' ? 'Turn Online' : 'Turn Offline'}
                    </button>
                  )}
                  {hasDevice ? (
                    <button onClick={handleRemoveDevice} className="w-full py-2 rounded-full font-bold text-sm text-white transition-all" style={{ background: 'linear-gradient(90deg,#dc2626,#b91c1c)' }}>
                      Remove Device
                    </button>
                  ) : (
                    <button onClick={() => navigate('/manage-pairing')} className="w-full py-2 rounded-full font-bold text-sm text-white transition-all" style={{ background: 'linear-gradient(90deg,#22c55e,#16a34a)' }}>
                      Add Device
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Sensor Status Card — white theme */}
            <div className="rounded-[20px] overflow-hidden shadow-md border border-gray-100" style={{ background: '#ffffff' }}>
              <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100" style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
                <p className="text-gray-700 font-bold text-sm tracking-widest uppercase">Sensor Status</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {/* CO2 */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-semibold text-sm">CO2</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: co2Value !== null && co2Value > 1000 ? '#fee2e2' : '#dcfce7', color: co2Value !== null && co2Value > 1000 ? '#dc2626' : '#16a34a' }}>
                    {co2Value !== null ? `${co2Value} ppm` : '— ppm'}
                  </span>
                </div>
                {/* Camera */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-semibold text-sm">Camera</span>
                  </div>
                  {cameraWorking === null
                    ? <span className="px-3 py-1 rounded-full text-sm font-bold text-gray-400 bg-gray-100">—</span>
                    : cameraWorking
                      ? <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: '#dcfce7', color: '#16a34a' }}>● working</span>
                      : <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: '#fee2e2', color: '#dc2626' }}>● not working</span>}
                </div>
                {/* Gyroscope */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-semibold text-sm">Gyroscope</span>
                  </div>
                  {gyroWorking === null
                    ? <span className="px-3 py-1 rounded-full text-sm font-bold text-gray-400 bg-gray-100">—</span>
                    : gyroWorking
                      ? <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: '#dcfce7', color: '#16a34a' }}>● working</span>
                      : <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: '#fee2e2', color: '#dc2626' }}>● not working</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Graph Card — white theme */}
          <div className="flex-1 rounded-[20px] overflow-hidden shadow-md border border-gray-100 flex flex-col" style={{ background: '#ffffff' }}>
            <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100" style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
              <p className="text-gray-700 font-bold text-sm tracking-widest uppercase">Risk Graph</p>
              <span className="ml-auto text-xs text-gray-400 font-medium">Drowsy count per minute</span>
            </div>
            {/* Summary stats — latest minute */}
            {chartData.length > 0 && (() => {
              const latest = chartData[chartData.length - 1];
              const totalInMinute = latest.active + latest.drowsy;
              const drowsyPct = totalInMinute > 0 ? Math.round((latest.drowsy / totalInMinute) * 100) : 0;
              return (
                <div className="px-5 pb-1">
                  <p className="text-xs text-gray-400 mb-2">Latest minute: <span className="font-semibold text-gray-500">{latest.minute}</span></p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-xl px-3 py-3 text-center border border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Total</p>
                      <p className="text-lg font-bold text-gray-700">{totalInMinute}</p>
                      <p className="text-xs text-gray-400">/ 60</p>
                    </div>
                    <div className="bg-green-50 rounded-xl px-3 py-3 text-center border border-green-100">
                      <p className="text-xs text-green-500 mb-1">Active</p>
                      <p className="text-lg font-bold text-green-600">{latest.active}</p>
                      <p className="text-xs text-green-400">ครั้ง</p>
                    </div>
                    <div className="bg-red-50 rounded-xl px-3 py-3 text-center border border-red-100">
                      <p className="text-xs text-red-400 mb-1">Drowsy</p>
                      <p className="text-lg font-bold text-red-500">{latest.drowsy}</p>
                      <p className="text-xs text-red-300">ครั้ง</p>
                    </div>
                    <div className="rounded-xl px-3 py-3 text-center border" style={{ background: drowsyPct >= 50 ? '#fff1f2' : '#f0fdf4', borderColor: drowsyPct >= 50 ? '#fecaca' : '#bbf7d0' }}>
                      <p className="text-xs mb-1" style={{ color: drowsyPct >= 50 ? '#f87171' : '#4ade80' }}>Drowsy %</p>
                      <p className="text-lg font-bold" style={{ color: drowsyPct >= 50 ? '#dc2626' : '#16a34a' }}>{drowsyPct}%</p>
                      <p className="text-xs" style={{ color: drowsyPct >= 50 ? '#fca5a5' : '#86efac' }}>of min</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex-1 w-full min-h-[240px] flex items-center justify-center px-4 pb-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="drowsyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="minute"
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      tickMargin={8}
                      label={{ value: 'Time (HH:MM)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9ca3af' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, 60]}
                      ticks={[0, 10, 20, 30, 40, 50, 60]}
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      label={{ value: 'Drowsy / min', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#9ca3af' }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}
                      formatter={(value) => [
                        <span style={{ fontWeight: 'bold', color: '#dc2626' }}>{value} ครั้ง</span>,
                        'Drowsy'
                      ]}
                      labelFormatter={(label) => label}
                    />
                    <Area
                      type="monotone"
                      dataKey="drowsy"
                      name="Drowsy"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      fill="url(#drowsyGrad)"
                      dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#dc2626' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                <span className="text-sm">No prediction data for this driver.</span>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DriverDashboard;