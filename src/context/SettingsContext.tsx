import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
    sosVisible: boolean;
    setSosVisible: (visible: boolean) => void;
    shakeDetectionEnabled: boolean;
    setShakeDetectionEnabled: (enabled: boolean) => void;
    alarmEnabled: boolean;
    setAlarmEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    // Initialize from localStorage or default to true
    const [sosVisible, setSosVisibleState] = useState(() => {
        const saved = localStorage.getItem('sosVisible');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [shakeDetectionEnabled, setShakeDetectionEnabledState] = useState(() => {
        const saved = localStorage.getItem('shakeDetectionEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [alarmEnabled, setAlarmEnabledState] = useState(() => {
        const saved = localStorage.getItem('alarmEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // specialized setters that also update localStorage
    const setSosVisible = (visible: boolean) => {
        setSosVisibleState(visible);
        localStorage.setItem('sosVisible', JSON.stringify(visible));
    };

    const setShakeDetectionEnabled = (enabled: boolean) => {
        setShakeDetectionEnabledState(enabled);
        localStorage.setItem('shakeDetectionEnabled', JSON.stringify(enabled));
    };

    const setAlarmEnabled = (enabled: boolean) => {
        setAlarmEnabledState(enabled);
        localStorage.setItem('alarmEnabled', JSON.stringify(enabled));
    };

    return (
        <SettingsContext.Provider value={{
            sosVisible,
            setSosVisible,
            shakeDetectionEnabled,
            setShakeDetectionEnabled,
            alarmEnabled,
            setAlarmEnabled
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
