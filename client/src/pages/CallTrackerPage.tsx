import React from 'react';
import CallTracker from './calls/CallTracker';

export default function CallTrackerPage() {
    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50/50">
            <CallTracker />
        </div>
    );
}
