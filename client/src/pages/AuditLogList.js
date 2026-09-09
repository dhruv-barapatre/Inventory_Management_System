import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { History, ChevronLeft, ChevronRight, User, Package, Calendar } from 'lucide-react';

const AuditLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/stock/history?page=${p}&limit=15`);
      if (res.data.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'ADD_STOCK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">ADD STOCK</span>;
      case 'REDUCE_STOCK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">REDUCE STOCK</span>;
      case 'CREATE_PRODUCT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">CREATE PRODUCT</span>;
      case 'UPDATE_PRODUCT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">UPDATE PRODUCT</span>;
      case 'DELETE_PRODUCT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">DELETE PRODUCT</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-500">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-3">
          <History className="w-6 h-6 text-blue-500" />
          <span>Inventory Audit Logs</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Complete historical ledger of stock movements and inventory adjustments.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading Audit Logs..." />
      ) : logs.length === 0 ? (
        <EmptyState title="No Audit Logs Recorded" message="Stock adjustments will be logged here automatically." />
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Performed By</th>
                  <th className="py-3.5 px-4">Quantity Change</th>
                  <th className="py-3.5 px-4">Stock Ledger</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getTypeBadge(log.type)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <Package className="w-3.5 h-3.5 text-blue-500" />
                        <span>{log.product?.name || 'Deleted Product'}</span>
                      </div>
                      {log.product?.sku && (
                        <span className="text-[10px] font-mono text-slate-400 block">SKU: {log.product.sku}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.user?.name || 'User'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold">
                      <span className={log.quantityChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-800 dark:text-slate-200">
                      {log.previousQuantity} → <span className="font-bold">{log.newQuantity}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate">
                      {log.reason || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            <span>
              Showing Page {pagination.page} of {pagination.pages} ({pagination.total} logs)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((prev) => Math.min(prev + 1, pagination.pages))}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogList;
