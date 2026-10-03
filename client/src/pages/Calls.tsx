import React from 'react';
import CallTracker from './calls/CallTracker';
import KraTracker from './calls/KraTracker';
import SwatMeeting from './calls/SwatMeeting';
import clsx from 'clsx';
import { Phone, Target, Users2 } from 'lucide-react';
import { usePersistentFilters } from '../hooks/usePersistentFilters';

type SubModule = 'call-tracker' | 'kra-tracker' | 'swat-meeting';

export default function Calls() {
    const { filters: cf, setFilters: setCf } = usePersistentFilters('calls_tab', {
        activeTab: 'call-tracker',
    });
    const activeTab = cf.activeTab as SubModule;
    const setActiveTab = (v: SubModule) => setCf({ activeTab: v });

    const tabs = [
        { id: 'call-tracker', label: 'Call Tracker', icon: Phone },
        { id: 'kra-tracker', label: 'KRA Tracker', icon: Target },
        { id: 'swat-meeting', label: 'SWAT Meeting', icon: Users2 },
    ];

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50/50">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Calls Module</h1>
                <p className="text-gray-500 mt-1">Manage outbound calls, KRAs, and SWAT meetings in one place.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-8 max-w-2xl">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as SubModule)}
                            className={clsx(
                                'flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200',
                                isActive
                                    ? 'bg-primary text-white shadow-md scale-[1.02]'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            )}
                        >
                            <Icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Active Submodule Rendering */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'call-tracker' && <CallTracker />}
                {activeTab === 'kra-tracker' && <KraTracker />}
                {activeTab === 'swat-meeting' && <SwatMeeting />}
            </div>
        </div>
    );
}
