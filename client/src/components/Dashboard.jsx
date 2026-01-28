import React, { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Droplets, Power, AlertTriangle, CheckCircle, RefreshCcw, Wifi, WifiOff } from 'lucide-react';
import WaterTank from './WaterTank';

// Connect to backend logic
const VITE_API_URL = import.meta.env.VITE_API_URL;
const API_URL = VITE_API_URL || '';

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
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const socketRef = useRef(null);
    const TANK_CAPACITY = 1000; // Liters

    // Initialize Connection & Mode
    useEffect(() => {
        const isLocal = window.location.hostname === 'localhost';
        const hasApiUrl = !!VITE_API_URL;

        // If we're on production and have no API URL, we MUST be in demo mode
        if (!isLocal && !hasApiUrl) {
            setIsDemoMode(true);
        }

        if (API_URL) {
            socketRef.current = io(API_URL, {
                reconnectionAttempts: 3,
                timeout: 5000,
                autoConnect: true
            });

            socketRef.current.on('connect', () => {
                setIsConnected(true);
                setIsDemoMode(false);
                setIsInitialLoad(false);
            });

            socketRef.current.on('disconnect', () => {
                setIsConnected(false);
            });

            socketRef.current.on('connect_error', () => {
                setIsConnected(false);
                setIsInitialLoad(false);
                // If we can't connect, fallback to demo
                setIsDemoMode(true);
            });

            socketRef.current.on('new_reading', (reading) => {
                setData(reading);
                setIsDemoMode(false);
                setHistory(prev => {
                    const now = new Date(reading.timestamp).toLocaleTimeString();
                    if (prev.length > 0 && prev[prev.length - 1].time === now) return prev;
                    const newHistory = [...prev, { ...reading, time: now }];
                    return newHistory.slice(-20);
                });
            });

            socketRef.current.on('motor_update', (state) => {
                setMotorOn(state);
            });

            socketRef.current.on('history_data', (hist) => {
                if (hist && hist.length > 0) {
                    const formatData = hist.map(d => ({ ...d, time: new Date(d.timestamp).toLocaleTimeString() }));
                    setHistory(formatData);
                    setData(formatData[formatData.length - 1]);
                }
            });

            // Initial fetch
            fetch(`${API_URL}/api/history`)
                .then(res => res.json())
                .then(data => {
                    if (data && Array.isArray(data) && data.length > 0) {
                        const formatData = data.map(d => ({ ...d, time: new Date(d.timestamp).toLocaleTimeString() }));
                        setHistory(formatData);
                        setData(formatData[formatData.length - 1]);
                    }
                })
                .catch(err => {
                    console.warn("API check failed, using simulation mode.");
                    setIsDemoMode(true);
                })
                .finally(() => setIsInitialLoad(false));
        } else {
            setIsInitialLoad(false);
            setIsDemoMode(true);
        }

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    // Frontend Simulation Fallback
    useEffect(() => {
        let simInterval;
        if (motorOn && (isDemoMode || !isConnected)) {
            simInterval = setInterval(() => {
                setData(prev => {
                    if (prev.percentage >= 100) {
                        setMotorOn(false);
                        return prev;
                    }

                    const newPerc = Math.min(prev.percentage + 0.8, 100);
                    const newReading = {
                        level: parseFloat((100 * (1 - newPerc / 100)).toFixed(1)),
                        percentage: parseFloat(newPerc.toFixed(1)),
                        timestamp: new Date().toISOString()
                    };

                    setHistory(h => {
                        const now = new Date(newReading.timestamp).toLocaleTimeString();
                        const last = h[h.length - 1];
                        if (!last || last.time !== now) {
                            return [...h, { ...newReading, time: now }].slice(-20);
                        }
                        return h;
                    });

                    return newReading;
                });
            }, 500);
        }
        return () => clearInterval(simInterval);
    }, [motorOn, isDemoMode, isConnected]);

    const toggleMotor = useCallback(() => {
        const newState = !motorOn;
        setMotorOn(newState);

        if (!isDemoMode && isConnected && API_URL) {
            fetch(`${API_URL}/api/motor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: newState })
            }).catch(err => console.error("Failed to update motor:", err));
        }
    }, [motorOn, isDemoMode, isConnected]);

    const resetSystem = () => {
        if (!isDemoMode && isConnected && API_URL) {
            fetch(`${API_URL}/api/reset`, { method: 'POST' });
        }
        setHistory([]);
        setData({ percentage: 0, level: 100 });
        setMotorOn(false);
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

    if (isInitialLoad) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-xl animate-pulse">Initializing System...</div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Status Indicator Bar */}
            <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase tracking-wider">
                            <Wifi size={14} /> LIVE CONNECTED
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider">
                            <WifiOff size={14} /> SIMULATION MODE
                        </div>
                    )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                    {isConnected ? `BASE_URL: ${API_URL}` : 'STANDALONE PRODUCTION BUILD'}
                </div>
            </div>

            {/* Top Stats Row */}
            {!isConnected && !isInitialLoad && (
                <div className="banner-warning">
                    <AlertTriangle size={18} />
                    <span>
                        <strong>Backend Offline:</strong> The system has automatically switched to <strong>Local Simulation Mode</strong>.
                        Your water level will rise when you start the motor, even without a server connection.
                    </span>
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
            <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                {/* Left: Visual Tank */}
                <WaterTank percentage={data.percentage} level={data.level} capacity={TANK_CAPACITY} />

                {/* Right: Chart */}
                <div className="glass-panel p-6 flex flex-col" style={{ minHeight: '400px' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Water Level History</h3>
                        {isDemoMode && <span className="text-[10px] bg-white/10 px-2 py-1 rounded">SIMULATED DATA</span>}
                    </div>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={10} tickCount={5} />
                                <YAxis stroke="var(--text-secondary)" fontSize={10} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--card-border)', color: '#fff' }}
                                    itemStyle={{ color: 'var(--accent)' }}
                                />
                                <Area isAnimationActive={!isDemoMode} type="monotone" dataKey="percentage" stroke="var(--accent)" fillOpacity={1} fill="url(#colorLevel)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
