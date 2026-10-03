import React from 'react';
import { Users2 } from 'lucide-react';

export default function SwatMeeting() {
    return (
        <div className="flex flex-col items-center justify-center p-20 text-gray-400 bg-white rounded-lg shadow-sm border border-dashed border-gray-200">
            <Users2 size={48} className="mb-4 opacity-20" />
            <h2 className="text-xl font-medium text-gray-600">SWAT Meeting</h2>
            <p className="text-sm">This module is under development.</p>
        </div>
    );
}
