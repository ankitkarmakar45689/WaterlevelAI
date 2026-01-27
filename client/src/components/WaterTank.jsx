import React from 'react';
import { motion } from 'framer-motion';

const WaterTank = ({ percentage, level, capacity }) => {
    // Determine color based on level
    let liquidColor = 'var(--accent)';
    if (percentage > 90) liquidColor = 'var(--danger)';
    else if (percentage < 20) liquidColor = 'var(--warning)';

    return (
        <div className="glass-panel p-6 flex flex-col items-center justify-center relative" style={{ minHeight: '400px', overflow: 'hidden' }}>
            <h2 className="text-xl font-bold mb-4" style={{ zIndex: 10 }}>Live Tank Status</h2>

            {/* Tank Container */}
            <div
                className="relative"
                style={{
                    width: '180px',
                    height: '260px',
                    border: '4px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 10,
                    background: 'rgba(255,255,255,0.02)'
                }}
            >
                {/* Liquid */}
                <motion.div
                    className="absolute w-full"
                    initial={{ height: '0%' }}
                    animate={{ height: `${percentage}%` }}
                    transition={{ type: 'spring', damping: 20 }}
                    style={{
                        bottom: 0,
                        background: `linear-gradient(to top, ${liquidColor}, ${liquidColor}88)`,
                        boxShadow: `0 0 20px ${liquidColor}44`
                    }}
                >
                    {/* Wave Animation on top */}
                    <div className="water-wave" style={{ top: '-10px' }}></div>
                </motion.div>

                {/* Measurement Lines */}
                <div className="absolute w-full h-full flex flex-col justify-between" style={{ padding: '8px', pointerEvents: 'none', opacity: 0.5 }}>
                    {[100, 75, 50, 25, 0].map(mark => (
                        <div key={mark} className="w-full flex" style={{ borderTop: '1px dashed rgba(255,255,255,0.5)', justifyContent: 'flex-end' }}>
                            <span className="text-sm" style={{ marginTop: '-10px', marginRight: '4px' }}>{mark}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Text Stats */}
            <div className="mt-6 text-center" style={{ zIndex: 10 }}>
                <div className="text-4xl" style={{ color: liquidColor }}>
                    {percentage.toFixed(0)}%
                </div>
                <div className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
                    {level.toFixed(1)} cm / {capacity} Liters
                </div>
            </div>
        </div>
    );
};

export default WaterTank;
