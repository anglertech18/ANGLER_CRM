import { Link } from 'react-router-dom';
import { Database, ChevronRight } from 'lucide-react';

const masters = [
    { name: 'Company',             path: 'company' },
    { name: 'Client Company',      path: 'clientcompany' },
    { name: 'Vertical',            path: 'vertical' },
    { name: 'Payment Type',        path: 'paymenttype' },
    { name: 'SBU',                 path: 'sbu' },
    { name: 'Job Title',           path: 'jobtitle' },
    { name: 'Lead Source',         path: 'leadsource' },
    { name: 'Lead Source Type',    path: 'leadsourcetype' },
    { name: 'Industry',            path: 'industry' },
    { name: 'Country',             path: 'country' },
    { name: 'State',               path: 'state' },
    { name: 'City',                path: 'city' },
    { name: 'Product',             path: 'product' },
    { name: 'Persona',             path: 'persona' },
    { name: 'Avatar',              path: 'avatar' },
    { name: 'Collateral',          path: 'collateral' },
    { name: 'Sales Stage',         path: 'salesstage' },
    { name: 'Activity',            path: 'activity' },
    { name: 'Department',          path: 'department' },
    { name: 'Source of DB',        path: 'sourceofdb' },
    { name: 'Call Status',         path: 'callstatus' },
    { name: 'Email Status',        path: 'emailstatus' },
    { name: 'BANT Qualification',  path: 'bant' },
];

export default function Masters() {
    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <Database size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Master Data</h1>
                        <p className="page-subtitle">Manage reference data used across the application</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {masters.map((master) => (
                    <Link
                        key={master.path}
                        to={`/admin/masters/${master.path}`}
                        className="card-hover p-5 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary-600 transition-colors">
                                <Database size={15} className="text-slate-500 group-hover:text-white transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 group-hover:text-primary-600 transition-colors">
                                {master.name}
                            </span>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-primary-500 transition-colors shrink-0" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
