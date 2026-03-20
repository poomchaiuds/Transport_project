import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

/**
 * AdminDriverView — แสดงข้อมูล driver เดียวกับ DriverDashboard
 * แต่ถูก embed อยู่ใน AdminDashboard (ไม่มี navbar ของตัวเอง)
 * รับ prop: driverId (string)
 */
const AdminDriverView = ({ driverId }) => {
  const [deviceId, setDeviceId] = useState('Inactive');
  const [deviceStatus, setDeviceStatus] = useState('offline');
  const [co2Value, setCo2Value] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [alertActive, setAlertActive] = useState(false);
  const alertedMinuteRef = useRef(null);

  useEffect(() => {
    if (!driverId) return;

    const fetchAll = async () => {
      try {
        // Device pairing
        const resBooking = await axios.get('http://3.26.163.23/api/bookings/');
        const myPair = (resBooking.data || []).find(p => String(p.user_id_val) === String(driverId));
        if (myPair) {
          const currentDeviceId = myPair.device_id_val || 'Inactive';
          setDeviceId(currentDeviceId);
          if (currentDeviceId !== 'Inactive') {
            const resDevice = await axios.get('http://3.26.163.23/api/devices/');
            const myDevice = (resDevice.data || []).find(d => String(d.device_id) === String(currentDeviceId));
            if (myDevice) setDeviceStatus(myDevice.status);
          }
        } else {
          setDeviceId('Inactive');
          setDeviceStatus('offline');
        }
      } catch (e) {
        console.error(e);
      }
    };

    const fetchCo2 = async () => {
      try {
        const res = await axios.get(`http://3.26.163.23/api/devices/driver/${driverId}/latest-co2/`);
        setCo2Value(res.data.co2);
      } catch (e) { /* ignore */ }
    };

    const fetchHistory = async () => {
      try {
        const res = await axios.get(`http://3.26.163.23/api/devices/driver/${driverId}/prediction-history/`);
        setPredictionHistory(res.data.map(item => ({
          ...item,
          time: new Date(item.timestamp).toLocaleTimeString('th-TH'),
        })));
      } catch (e) { /* ignore */ }
    };

    fetchAll();
    fetchCo2();
    fetchHistory();
    const interval = setInterval(() => { fetchCo2(); fetchHistory(); }, 5000);
    return () => clearInterval(interval);
  }, [driverId]);

  // Sensor status from latest prediction
  const latestPred = predictionHistory.length > 0 ? predictionHistory[predictionHistory.length - 1] : null;
  const cameraWorking = latestPred ? !(latestPred.ear === 0 && latestPred.mar === 0) : null;
  const gyroWorking = latestPred ? latestPred.gyro_x !== 0 : null;

  // Chart data — group by minute, count drowsy
  const chartData = useMemo(() => {
    const byMinute = {};
    predictionHistory.forEach(item => {
      const d = new Date(item.timestamp);
      const key = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      if (!byMinute[key]) byMinute[key] = { minute: key, active: 0, drowsy: 0 };
      if (item.risk_level === 'active') byMinute[key].active += 1;
      else byMinute[key].drowsy += 1;
    });
    return Object.values(byMinute);
  }, [predictionHistory]);

  // Alert logic
  useEffect(() => {
    if (chartData.length === 0 || !deviceId || deviceId === 'Inactive') return;
    const latest = chartData[chartData.length - 1];
    const total = latest.active + latest.drowsy;
    if (total === 0) return;
    const drowsyPct = (latest.drowsy / total) * 100;
    if (drowsyPct >= 50 && alertedMinuteRef.current !== latest.minute) {
      alertedMinuteRef.current = latest.minute;
      setAlertActive(true);
      // ฝั่ง Admin จะแค่โชว์ banner แต่ไม่ยิง MQTT ไปกวนคนขับซ้ำซ้อน
      setTimeout(() => setAlertActive(false), 10000);
    } else if (drowsyPct < 50) {
      setAlertActive(false);
    }
  }, [chartData, deviceId]);

  // Stat chips (latest minute)
  const latestMinute = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const totalInMinute = latestMinute ? latestMinute.active + latestMinute.drowsy : 0;
  const drowsyPct = totalInMinute > 0 ? Math.round((latestMinute.drowsy / totalInMinute) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Alert Banner */}
      {alertActive && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl text-white font-bold text-sm"
          style={{ background: 'linear-gradient(90deg,#dc2626,#b91c1c)', animation: 'pulse 1s infinite' }}>
          <span>DROWSINESS ALERT — Driver {driverId} ง่วงเกิน 50% ในนาทีนี้!</span>
          <button onClick={() => setAlertActive(false)} className="ml-auto text-white/70 hover:text-white">✕</button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Left column */}
        <div className="w-[300px] space-y-4 flex-shrink-0">
          {/* Device Info */}
          <div className="rounded-[20px] overflow-hidden shadow-md border border-gray-100 bg-white">
            <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100"
              style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
              <p className="text-gray-700 font-bold text-sm tracking-widest uppercase">Device Info</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-gray-500 text-sm">Driver ID</span>
                <span className="text-gray-800 font-bold text-sm">{driverId}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-gray-500 text-sm">Device ID</span>
                <span className="text-gray-800 font-bold text-sm">{deviceId}</span>
              </div>
              {deviceId !== 'Inactive' && (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-sm">Status</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
                    style={{ background: deviceStatus === 'online' ? '#dcfce7' : '#fee2e2', color: deviceStatus === 'online' ? '#16a34a' : '#dc2626' }}>
                    {deviceStatus === 'online' ? '● ONLINE' : '● OFFLINE'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sensor Status */}
          <div className="rounded-[20px] overflow-hidden shadow-md border border-gray-100 bg-white">
            <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100"
              style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
              <p className="text-gray-700 font-bold text-sm tracking-widest uppercase">Sensor Status</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* CO2 */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-700 font-semibold text-sm">CO2</span>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{ background: co2Value !== null && co2Value > 1000 ? '#fee2e2' : '#dcfce7', color: co2Value !== null && co2Value > 1000 ? '#dc2626' : '#16a34a' }}>
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

        {/* Graph Card */}
        <div className="flex-1 rounded-[20px] overflow-hidden shadow-md border border-gray-100 bg-white flex flex-col">
          <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100"
            style={{ background: 'linear-gradient(90deg,#f0f4ff,#f0fdf4)' }}>
            <p className="text-gray-700 font-bold text-sm tracking-widest uppercase">Risk Graph</p>
            <span className="ml-auto text-xs text-gray-400 font-medium">Drowsy count per minute</span>
          </div>

          {/* Stat chips */}
          {latestMinute && (
            <div className="px-5 pt-4 pb-1">
              <p className="text-xs text-gray-400 mb-2">Latest minute: <span className="font-semibold text-gray-500">{latestMinute.minute}</span></p>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl px-3 py-3 text-center border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Total</p>
                  <p className="text-lg font-bold text-gray-700">{totalInMinute}</p>
                  <p className="text-xs text-gray-400">/ 60</p>
                </div>
                <div className="bg-green-50 rounded-xl px-3 py-3 text-center border border-green-100">
                  <p className="text-xs text-green-500 mb-1">Active</p>
                  <p className="text-lg font-bold text-green-600">{latestMinute.active}</p>
                  <p className="text-xs text-green-400">ครั้ง</p>
                </div>
                <div className="bg-red-50 rounded-xl px-3 py-3 text-center border border-red-100">
                  <p className="text-xs text-red-400 mb-1">Drowsy</p>
                  <p className="text-lg font-bold text-red-500">{latestMinute.drowsy}</p>
                  <p className="text-xs text-red-300">ครั้ง</p>
                </div>
                <div className="rounded-xl px-3 py-3 text-center border"
                  style={{ background: drowsyPct >= 50 ? '#fff1f2' : '#f0fdf4', borderColor: drowsyPct >= 50 ? '#fecaca' : '#bbf7d0' }}>
                  <p className="text-xs mb-1" style={{ color: drowsyPct >= 50 ? '#f87171' : '#4ade80' }}>Drowsy %</p>
                  <p className="text-lg font-bold" style={{ color: drowsyPct >= 50 ? '#dc2626' : '#16a34a' }}>{drowsyPct}%</p>
                  <p className="text-xs" style={{ color: drowsyPct >= 50 ? '#fca5a5' : '#86efac' }}>of min</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 w-full min-h-[220px] flex items-center justify-center px-4 pb-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="adminDrowsyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="minute" tick={{ fontSize: 11, fill: '#9ca3af' }} tickMargin={8}
                    label={{ value: 'Time (HH:MM)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis allowDecimals={false} domain={[0, 60]} ticks={[0, 10, 20, 30, 40, 50, 60]}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    label={{ value: 'Drowsy / min', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                    formatter={(value) => [<span style={{ fontWeight: 'bold', color: '#dc2626' }}>{value} ครั้ง</span>, 'Drowsy']}
                    labelFormatter={(label) => label} />
                  <Area type="monotone" dataKey="drowsy" stroke="#ef4444" strokeWidth={2.5}
                    fill="url(#adminDrowsyGrad)" dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#dc2626' }} />
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
  );
};

export default AdminDriverView;
