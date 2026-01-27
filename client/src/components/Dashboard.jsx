import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Droplets, Power, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';
import WaterTank from './WaterTank';

// Connect to backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

const StatsCard = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="glass-panel p-4 flex flex-col justify-between" style={{ minHeight: '140px' }}>
        <div className="flex justify-between items-center mb-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{title}</span>
            <div className="p-2 rounded-full" style={{ background: `${color}22`, color: color }}>
                <Icon size={20} />
            </div>
        </div>
        <div>
            <div className="text-2xl font-bold">{value}</div>
            {subtext && <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{subtext}</div>}
        </div>
    </div>
);

const Dashboard = () => {
    const [data, setData] = useState({ level: 100, percentage: 0 });
    const [history, setHistory] = useState([]);
    const [motorOn, setMotorOn] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const TANK_CAPACITY = 1000; // Liters

    useEffect(() => {
        const onConnect = () => {
            setIsConnected(true);
            setIsDemoMode(false);
        };
        const onDisconnect = () => {
            setIsConnected(false);
            // If disconnected for more than 3 seconds, offer/switch to demo mode
            setTimeout(() => {
                if (!socket.connected) setIsDemoMode(true);
            }, 3000);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        if (socket.connected) setIsConnected(true);

        socket.on('new_reading', (reading) => {
            setData(reading);
            setIsDemoMode(false); // Real data received
            setHistory(prev => {
                const newHistory = [...prev, { ...reading, time: new Date(reading.timestamp).toLocaleTimeString() }];
                return newHistory.slice(-20); // Keep last 20
            });
        });

        socket.on('motor_update', (state) => {
            setMotorOn(state);
        });

        socket.on('history_data', (hist) => {
            if (hist.length === 0) {
                setHistory([]);
                setData({ level: 100, percentage: 0 });
            } else {
                const formatData = hist.map(d => ({ ...d, time: new Date(d.timestamp).toLocaleTimeString() }));
                setHistory(formatData);
            }
        });

        fetch(`${API_URL}/api/history`)
            .then(res => res.json())
            .then(data => {
                const formatData = data.map(d => ({ ...d, time: new Date(d.timestamp).toLocaleTimeString() }));
                setHistory(formatData);
                if (formatData.length > 0) setData(formatData[formatData.length - 1]);
            })
            .catch(() => {
                console.log("Backend offline, switching to demo mode simulation.");
                setIsDemoMode(true);
            });

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('new_reading');
            socket.off('motor_update');
            socket.off('history_data');
        };
    }, []);

    // Frontend Simulation Fallback (for Vercel/Demo)
    useEffect(() => {
        let simInterval;
        if (motorOn && (isDemoMode || !isConnected)) {
            simInterval = setInterval(() => {
                setData(prev => {
                    const newPerc = Math.min(prev.percentage + 0.5, 100);
                    const newReading = {
                        level: 100 - newPerc,
                        percentage: parseFloat(newPerc.toFixed(1)),
                        timestamp: new Date().toISOString()
                    };

                    // Also update history locally in demo mode
                    setHistory(h => {
                        const last = h[h.length - 1];
                        const now = new Date().toLocaleTimeString();
                        if (!last || last.time !== now) {
                            return [...h, { ...newReading, time: now }].slice(-20);
                        }
                        return h;
                    });

                    if (newPerc >= 100) {
                        setMotorOn(false);
                        clearInterval(simInterval);
                    }
                    return newReading;
                });
            }, 500);
        }
        return () => clearInterval(simInterval);
    }, [motorOn, isDemoMode, isConnected]);

    const toggleMotor = () => {
        setMotorOn(!motorOn);
        fetch(`${API_URL}/api/motor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: !motorOn })
        });
    };

    const resetSystem = () => {
        fetch(`${API_URL}/api/reset`, { method: 'POST' });
        setHistory([]);
        setData({ percentage: 0, level: 100 });
    };

    const currentVolume = (data.percentage / 100) * TANK_CAPACITY;
    let statusColor = 'var(--success)';
    let statusText = 'Normal';

    if (data.percentage > 90) {
        statusColor = 'var(--danger)';
        statusText = 'Critical High';
    } else if (data.percentage < 20) {
        statusColor = 'var(--warning)';
        statusText = 'Low Level';
    }

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Top Stats Row */}
            {!isConnected && (
                <div className="banner-warning">
                    <AlertTriangle size={18} />
                    <span>Backend Offline - The system is running in **Local Simulation Mode**. Your deployed Vercel site will now work even without a persistent backend!</span>
                </div>
            )}
            <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', padding: 0 }}>
                <StatsCard
                    title="Current Volume"
                    value={`${currentVolume.toFixed(0)} L`}
                    subtext={`of ${TANK_CAPACITY} L Capacity`}
                    icon={Droplets}
                    color="var(--accent)"
                />
                <StatsCard
                    title="Percentage"
                    value={`${data.percentage}%`}
                    subtext="Fullness"
                    icon={Activity}
                    color="var(--accent)"
                />
                <StatsCard
                    title="Status"
                    value={statusText}
                    subtext="System Health"
                    icon={data.percentage > 90 ? AlertTriangle : CheckCircle}
                    color={statusColor}
                />
                <div className="glass-panel p-4 flex flex-col justify-between items-center">
                    <span className="text-sm w-full text-left" style={{ color: 'var(--text-secondary)' }}>System Control</span>
                    <button
                        onClick={toggleMotor}
                        className={`btn ${motorOn ? 'btn-danger' : 'btn-primary'} w-full mt-2`}
                        style={{ height: '50px' }}
                    >
                        <Power size={18} />
                        {motorOn ? 'STOP MOTOR' : 'START MOTOR'}
                    </button>
                    <button
                        onClick={resetSystem}
                        className="btn w-full mt-2"
                        style={{ height: '40px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                    >
                        <RefreshCcw size={14} />
                        RESET SYSTEM
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid-responsive">
                {/* Left: Visual Tank */}
                <WaterTank percentage={data.percentage} level={data.level} capacity={TANK_CAPACITY} />

                {/* Right: Chart */}
                <div className="glass-panel p-6 flex flex-col" style={{ minHeight: '400px' }}>
                    <h3 className="text-xl font-bold mb-4">Water Level History</h3>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickCount={5} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--card-border)', color: '#fff' }}
                                    itemStyle={{ color: 'var(--accent)' }}
                                />
                                <Area type="monotone" dataKey="percentage" stroke="var(--accent)" fillOpacity={1} fill="url(#colorLevel)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
