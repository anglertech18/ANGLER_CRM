import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { clearAllPersistedFilters } from '../hooks/usePersistentFilters';

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string | null;
    role: string;
    privileges?: any[];
    department?: string;
    department_id?: number | null;
    company_id?: number | null;
    managed_companies?: any[];
    cashflow_management_access?: boolean;
    cashflow_management_companies?: { company_id: number }[];
}

interface AuthContextType {
    user: User | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasPrivilege: (moduleName: string, action: 'can_view' | 'can_add' | 'can_edit' | 'can_delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMe = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const res = await api.get('/auth/me');
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
            }
        } catch (error: any) {
            console.error('Failed to sync user data:', error);
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                // Clear React state so ProtectedRoute doesn't flash protected content
                // while the hard redirect (issued by the api interceptor) completes.
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Sync with backend to get latest privileges
            fetchMe();
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        clearAllPersistedFilters();
        setUser(null);
    };

    const hasPrivilege = (moduleName: string, action: 'can_view' | 'can_add' | 'can_edit' | 'can_delete') => {
        if (!user) return false;
        if (user.role === 'CEO') return true; // CEO always has full access

        const privilege = user.privileges?.find(p => p.module_name === moduleName);
        if (privilege) return !!privilege[action];

        // SalesManager: default can_view for their core modules when no explicit privilege record exists
        if (user.role === 'SalesManager' && action === 'can_view') {
            const managerDefaultModules = [
                'SealDashboard', 'WeeklySummary', 'POAs', 'EnquiryTracker',
                'Leads', 'Calls', 'Reports',
            ];
            if (managerDefaultModules.includes(moduleName)) return true;
        }

        return false;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, hasPrivilege }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
