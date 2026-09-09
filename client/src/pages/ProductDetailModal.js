import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import api from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Minus, History, Package, ShieldAlert } from 'lucide-react';

const ProductDetailModal = ({ isOpen, onClose, product, onUpdateSuccess }) => {
  const [adjustAmount, setAdjustAmount] = useState(1);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('ADD'); // 'ADD' or 'REDUCE'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (product && isOpen) {
      fetchLogs(product._id);
    }
    setAdjustAmount(1);
    setReason('');
    setError('');
  }, [product, isOpen]);

  const fetchLogs = async (productId) => {
    try {
      const res = await api.get(`/stock/history?productId=${productId}`);
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
    }
  };

  if (!product) return null;

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/stock/adjust', {
        productId: product._id,
        action,
        amount: Number(adjustAmount),
        reason: reason || (action === 'ADD' ? 'Manual stock addition' : 'Manual stock reduction'),
      });

      if (res.data.success) {
        onUpdateSuccess(`Stock ${action === 'ADD' ? 'increased' : 'reduced'} successfully!`);
        fetchLogs(product._id);
        setReason('');
      }
    } catch (err) {
      console.error('Stock adjust error:', err);
      setError(err.response?.data?.message || 'Failed to adjust stock.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return <span className="px-3 py-1 rounded-full text-xs font-bold badge-in-stock">In Stock</span>;
      case 'Low Stock':
        return <span className="px-3 py-1 rounded-full text-xs font-bold badge-low-stock">Low Stock</span>;
      case 'Out of Stock':
        return <span className="px-3 py-1 rounded-full text-xs font-bold badge-out-of-stock">Out of Stock</span>;
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Details & Stock Control" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Upper product summary banner */}
        <div className="flex flex-col md:flex-row gap-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {/* Image & QR */}
          <div className="flex flex-row md:flex-col gap-4 items-center justify-center">
            {product.imageUrl ? (
              <img
                src={`http://localhost:5000${product.imageUrl}`}
                alt={product.name}
                className="w-24 h-24 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Package className="w-10 h-10" />
              </div>
            )}

            {/* QR Code generator preview */}
            <div className="p-2 rounded-xl bg-white border border-slate-200 flex flex-col items-center">
              <QRCodeSVG value={product.sku} size={64} />
              <span className="text-[10px] text-slate-500 font-mono mt-1 font-bold">{product.sku}</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest">
                  SKU: {product.sku}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{product.name}</h2>
              </div>
              {getStatusBadge(product.status)}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {product.description || 'No description provided.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Unit Price</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">${product.unitPrice?.toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Current Stock</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{product.quantity} units</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Category</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{product.category?.name || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Supplier</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{product.supplierName || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stock Adjustment Form */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
            <span>Quick Stock Adjustment</span>
          </h4>

          {error && (
            <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdjustStock} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">Action</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAction('ADD')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${
                    action === 'ADD' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('REDUCE')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 ${
                    action === 'REDUCE' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Reduce</span>
                </button>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">Reason / Note</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Shipment received / Customer purchase"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs text-white shadow transition-all ${
                  action === 'ADD' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {loading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>

        {/* Audit Log Timeline */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-500" />
            <span>Product Audit Trail</span>
          </h4>

          {logs.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {log.reason || log.type}
                    </span>
                    <span className="text-slate-400">
                      By {log.user?.name || 'User'} • {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {log.previousQuantity} → {log.newQuantity}
                    </span>
                    <span className={`font-semibold ${log.quantityChange > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">No stock history logs yet</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProductDetailModal;
