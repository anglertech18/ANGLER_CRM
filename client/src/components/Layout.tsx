import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Database, Users, Phone, FileText, LogOut,
    Sprout, Menu, X, ChevronRight, CheckCircle2, ShieldCheck,
    BarChart2, Settings, User as UserIcon, Activity, DollarSign,
    RefreshCw, Bell
} from 'lucide-react';
import NotificationBell from './renewal/NotificationBell';
import clsx from 'clsx';

export default function Layout() {
    const { user, logout, hasPrivilege } = useAuth();
    const location = useLocation();
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isReportsOpen, setIsReportsOpen] = React.useState(location.pathname.startsWith('/reports'));
    const [isCallsOpen, setIsCallsOpen] = React.useState(
        location.pathname.startsWith('/call-management') || location.pathname.startsWith('/call-tracker')
    );
    const [isSealOpen, setIsSealOpen] = React.useState(location.pathname.startsWith('/seal'));
    const [isRenewalsOpen, setIsRenewalsOpen] = React.useState(location.pathname.startsWith('/renewals'));
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(location.pathname.startsWith('/settings'));
    const [isCashFlowOpen, setIsCashFlowOpen] = React.useState(location.pathname.startsWith('/cashflow'));
    const [isUsersOpen, setIsUsersOpen] = React.useState(location.pathname.startsWith('/admin/users'));
    const [profileOpen, setProfileOpen] = React.useState(false);

    const canSeeReports = hasPrivilege('Reports', 'can_view');
    const canSeeMasters = hasPrivilege('Masters', 'can_view') || hasPrivilege('RenewalMasters', 'can_view');
    const canSeeUsers   = hasPrivilege('UserMaster', 'can_view');

    const isActive = (path: string) => location.pathname === path;
    const isPrefix = (prefix: string) => location.pathname.startsWith(prefix);

    const closeMobile = () => setIsMobileOpen(false);

    const NavLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
        <Link
            to={to}
            onClick={closeMobile}
            title={isCollapsed ? label : undefined}
            className={clsx(
                'nav-item',
                isActive(to) ? 'nav-item-active' : 'nav-item-inactive',
                isCollapsed && 'justify-center px-2'
            )}
        >
            <Icon size={18} className="shrink-0" />
            {!isCollapsed && <span>{label}</span>}
        </Link>
    );

    const GroupToggle = ({ icon: Icon, label, isOpen, onToggle, isActiveGroup }: any) => (
        <button
            onClick={() => !isCollapsed && onToggle()}
            title={isCollapsed ? label : undefined}
            className={clsx(
                'nav-item w-full',
                isActiveGroup ? 'nav-item-active' : 'nav-item-inactive',
                isCollapsed && 'justify-center px-2'
            )}
        >
            <Icon size={18} className="shrink-0" />
            {!isCollapsed && (
                <>
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronRight
                        size={14}
                        className={clsx('text-slate-500 transition-transform duration-200', isOpen && 'rotate-90')}
                    />
                </>
            )}
        </button>
    );

    const SubLink = ({ to, label }: { to: string; label: string }) => (
        <Link
            to={to}
            onClick={closeMobile}
            className={clsx(
                'nav-sub-item',
                isActive(to) ? 'nav-sub-active' : 'nav-sub-inactive'
            )}
        >
            {label}
        </Link>
    );

    const Sidebar = () => (
        <div
            className={clsx(
                'flex flex-col h-full transition-all duration-300',
                isCollapsed ? 'w-[60px]' : 'w-[220px]'
            )}
            style={{ backgroundColor: '#074388' }}
        >
            {/* Logo */}
            <div className={clsx(
                'flex items-center h-14 px-4 border-b shrink-0',
                'border-white/8'
            )}>
                {!isCollapsed ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
                            <BarChart2 size={14} className="text-white" />
                        </div>
                        <span className="font-semibold text-white text-sm tracking-tight truncate">Angler CRM & Trinetra</span>
                    </div>
                ) : (
                    <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
                        <BarChart2 size={14} className="text-white" />
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:flex p-1 rounded text-slate-500 hover:text-white transition-colors ml-1 shrink-0"
                >
                    <Menu size={16} />
                </button>
                <button
                    onClick={closeMobile}
                    className="md:hidden p-1 rounded text-slate-500 hover:text-white transition-colors ml-auto"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-2 space-y-0.5">
                <NavLink to="/"               icon={LayoutDashboard} label="Dashboard" />
                {hasPrivilege('Leads', 'can_view') && (
                    <NavLink to="/leads"      icon={FileText}        label="Leads" />
                )}
                <NavLink to="/partner-signup" icon={Users}           label="Partner Sign-Up" />
                {/* <NavLink to="/farming"        icon={Sprout}          label="Farming" /> */}

                {hasPrivilege('Calls', 'can_view') && (
                    <div>
                        <GroupToggle
                            icon={Phone} label="Call Management"
                            isOpen={isCallsOpen}
                            onToggle={() => setIsCallsOpen(v => !v)}
                            isActiveGroup={isPrefix('/call-management') || isPrefix('/call-tracker')}
                        />
                        {isCallsOpen && !isCollapsed && (
                            <div className="pl-8 mt-0.5 space-y-0.5">
                                <SubLink to="/call-management/tracker"      label="Call Tracker" />
                                <SubLink to="/call-management/bulk-uploads" label="DB Uploads" />
                            </div>
                        )}
                    </div>
                )}

                <NavLink to="/swat-performance" icon={CheckCircle2} label="SWAT Performance" />

                {hasPrivilege('SealDashboard', 'can_view') && (
                    <div>
                        <GroupToggle
                            icon={ShieldCheck} label="SEAL"
                            isOpen={isSealOpen}
                            onToggle={() => setIsSealOpen(v => !v)}
                            isActiveGroup={isPrefix('/seal')}
                        />
                        {isSealOpen && !isCollapsed && (
                            <div className="pl-8 mt-0.5 space-y-0.5">
                                <SubLink to="/seal/dashboard"      label="Dashboard" />
                                {hasPrivilege('WeeklySummary', 'can_view') && (
                                    <SubLink to="/seal/weekly-summary"  label="Weekly Summary" />
                                )}
                                {hasPrivilege('LeadGenSummary', 'can_view') && (
                                    <SubLink to="/seal/lead-gen"        label="Lead Gen Summary" />
                                )}
                                {hasPrivilege('POAs', 'can_view') && (
                                    <SubLink to="/seal/poas"            label="POAs" />
                                )}
                                {hasPrivilege('EnquiryTracker', 'can_view') && (
                                    <SubLink to="/seal/enquiry-tracker" label="Enquiry Tracker" />
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <GroupToggle
                        icon={DollarSign} label="Cash Flow"
                        isOpen={isCashFlowOpen}
                        onToggle={() => setIsCashFlowOpen(v => !v)}
                        isActiveGroup={isPrefix('/cashflow')}
                    />
                    {isCashFlowOpen && !isCollapsed && (
                        <div className="pl-8 mt-0.5 space-y-0.5">
                            <SubLink to="/cashflow/order-won" label="Order Won Leads" />
                            <SubLink to="/cashflow/tracker" label="Cashflow Tracker" />
                            {hasPrivilege('CashflowReport', 'can_view') && (
                                <SubLink to="/cashflow/report" label="Cash Flow Report" />
                            )}
                            {hasPrivilege('CashflowForecast', 'can_view') && (
                                <SubLink to="/cashflow/forecast" label="Cashflow Forecast" />
                            )}
                        </div>
                    )}
                </div>

                {canSeeReports && (
                    <div>
                        <GroupToggle
                            icon={BarChart2} label="Reports"
                            isOpen={isReportsOpen}
                            onToggle={() => setIsReportsOpen(v => !v)}
                            isActiveGroup={isPrefix('/reports')}
                        />
                        {isReportsOpen && !isCollapsed && (
                            <div className="pl-8 mt-0.5 space-y-0.5">
                                {hasPrivilege('DailyReport', 'can_view') && (
                                    <SubLink to="/reports/daily-report" label="Daily Report" />
                                )}
                                <SubLink to="/reports/products"     label="Products" />
                                <SubLink to="/reports/kra-tracker"  label="KRA Tracker" />
                                <SubLink to="/reports/order-won"    label="Order Won Report" />
                                <SubLink to="/reports"              label="MIS Dashboard" />
                            </div>
                        )}
                    </div>
                )}

                {hasPrivilege('Renewals', 'can_view') && (
                    <div>
                        <GroupToggle
                            icon={RefreshCw} label="Renewals"
                            isOpen={isRenewalsOpen}
                            onToggle={() => setIsRenewalsOpen(v => !v)}
                            isActiveGroup={isPrefix('/renewals')}
                        />
                        {isRenewalsOpen && !isCollapsed && (
                            <div className="pl-8 mt-0.5 space-y-0.5">
                                <SubLink to="/renewals"               label="Dashboard" />
                                <SubLink to="/renewals/register"      label="Register" />
                                <SubLink to="/renewals/mappings"      label="Service Mappings" />
                                <SubLink to="/renewals/follow-ups"    label="Follow-up Queue" />
                                <SubLink to="/renewals/drafts"        label="Draft Approvals" />
                                <SubLink to="/renewals/templates"     label="Email Templates" />
                                <SubLink to="/renewals/whatsapp-gateway" label="WhatsApp Gateway" />
                                <SubLink to="/renewals/contacts"      label="Contacts" />
                                <SubLink to="/renewals/reports"       label="Reports" />
                            </div>
                        )}
                    </div>
                )}

                {hasPrivilege('RenewalSettings', 'can_view') && (
                    <div>
                        <GroupToggle
                            icon={Settings} label="Settings"
                            isOpen={isSettingsOpen}
                            onToggle={() => setIsSettingsOpen(v => !v)}
                            isActiveGroup={isPrefix('/settings')}
                        />
                        {isSettingsOpen && !isCollapsed && (
                            <div className="pl-8 mt-0.5 space-y-0.5">
                                <SubLink to="/settings/renewals"      label="Renewal Settings" />
                                <SubLink to="/settings/brand-profile" label="Brand Profile" />
                                <SubLink to="/settings/email-config"  label="Email Config" />
                            </div>
                        )}
                    </div>
                )}

                {canSeeMasters && (
                    <NavLink to="/admin/masters" icon={Database} label="Masters" />
                )}

                {canSeeUsers && (
                    <div>
                        <GroupToggle
                            icon={Users} label="Users"
                            isOpen={isUsersOpen}
                            onToggle={() => setIsUsersOpen(v => !v)}
                            isActiveGroup={isPrefix('/admin/users')}
                        />
                        {isUsersOpen && !isCollapsed && (
                            <div className="pl-8 mt-0.5 space-y-0.5">
                                <SubLink to="/admin/users/invite"     label="Invite Users" />
                                <SubLink to="/admin/users/management" label="Target Management" />
                            </div>
                        )}
                    </div>
                )}
            </nav>

            {/* Profile Footer */}
            <div className="shrink-0 border-t border-white/8 p-2 relative">
                <button
                    onClick={() => setProfileOpen(v => !v)}
                    title={isCollapsed ? user?.first_name : undefined}
                    className={clsx(
                        'flex items-center gap-3 w-full px-2 py-2 rounded-lg',
                        'hover:bg-white/10 transition-colors duration-150',
                        isCollapsed && 'justify-center'
                    )}
                >
                    <div className="w-8 h-8 shrink-0 rounded-full bg-primary-600 flex items-center justify-center text-xs font-semibold text-white uppercase">
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-white truncate leading-tight">
                                {user?.first_name} {user?.last_name}
                            </p>
                            <p className="text-xs text-slate-500 truncate leading-tight">{user?.role}</p>
                        </div>
                    )}
                    {!isCollapsed && (
                        <Settings size={14} className="text-slate-500 shrink-0" />
                    )}
                </button>

                {profileOpen && (
                    <div className={clsx(
                        'absolute bottom-full mb-1 bg-white border border-slate-200',
                        'rounded-xl shadow-dropdown overflow-hidden z-50 animate-slide-up py-1',
                        isCollapsed ? 'left-full ml-2 w-44' : 'left-2 right-2'
                    )}>
                        <Link
                            to="/profile"
                            onClick={() => { setProfileOpen(false); closeMobile(); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <UserIcon size={15} className="text-slate-400" />
                            My Profile
                        </Link>
                        <button
                            onClick={() => { setProfileOpen(false); closeMobile(); logout(); }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={15} />
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-[#0F172A] z-30 flex items-center justify-between px-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
                        <BarChart2 size={12} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-white">Angler CRM & Trinetra</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={closeMobile}
                />
            )}

            {/* Mobile drawer */}
            <div className={clsx(
                'fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300',
                isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <Sidebar />
            </div>

            {/* Desktop sidebar */}
            <div className="hidden md:flex md:flex-col shrink-0 relative">
                <Sidebar />
                {/* Desktop notification bell — floats above sidebar footer */}
                <div className="absolute top-3 right-2 z-10">
                    <NotificationBell />
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 overflow-auto pt-14 md:pt-0">
                <Outlet />
            </div>
        </div>
    );
}
