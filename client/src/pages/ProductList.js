import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import ProductFormModal from './ProductFormModal';
import ProductDetailModal from './ProductDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Notification from '../components/Notification';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  ArrowUpDown,
} from 'lucide-react';

const ProductList = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter, Sort, Pagination states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  // Toast notification state
  const [notification, setNotification] = useState({ message: '', type: 'success' });

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: 'success' }), 4000);
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: 10,
        search,
        category: selectedCategory,
        status: selectedStatus,
        sortBy,
        sortOrder,
      });

      const res = await api.get(`/products?${queryParams.toString()}`);
      if (res.data.success) {
        setProducts(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
      triggerNotification('Failed to fetch products list', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        triggerNotification(`Product "${name}" deleted successfully.`);
        fetchProducts();
      }
    } catch (err) {
      triggerNotification(err.response?.data?.message || 'Failed to delete product', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggerNotification('Inventory exported to CSV successfully!');
    } catch (err) {
      triggerNotification('Failed to export CSV', 'error');
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/products/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        triggerNotification(res.data.message);
        fetchProducts();
      }
    } catch (err) {
      triggerNotification(err.response?.data?.message || 'CSV Import failed.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold badge-in-stock">In Stock</span>;
      case 'Low Stock':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold badge-low-stock">Low Stock</span>;
      case 'Out of Stock':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold badge-out-of-stock">Out of Stock</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: 'success' })}
      />

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Product Inventory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, and manage your full inventory catalog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          {/* Import CSV Button */}
          {isAdmin && (
            <label className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          )}

          {/* Add Product Button */}
          <button
            onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search product name or SKU..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="lg:col-span-3 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Stock Status Filter */}
        <div className="lg:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="">All Stock Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="lg:col-span-2 flex items-center space-x-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('-');
              setSortBy(f);
              setSortOrder(o);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="quantity-asc">Qty (Low-High)</option>
            <option value="quantity-desc">Qty (High-Low)</option>
            <option value="unitPrice-asc">Price (Low-High)</option>
            <option value="unitPrice-desc">Price (High-Low)</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <LoadingSpinner label="Fetching Products..." />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          message="No inventory records matched your current query."
          actionButton={
            <button
              onClick={() => { setSearch(''); setSelectedCategory(''); setSelectedStatus(''); }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Product Info</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Stock Quantity</th>
                  <th className="py-3.5 px-4">Unit Price</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        {p.imageUrl ? (
                          <img
                            src={`http://localhost:5000${p.imageUrl}`}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</div>
                          <span className="text-[11px] text-slate-400">Supplier: {p.supplierName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-500">
                      {p.sku}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {p.category?.name || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {p.quantity} units
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      ${p.unitPrice?.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(p.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => { setSelectedProductDetail(p); setIsDetailOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10"
                          title="View Details & Adjust Stock"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => { setEditingProduct(p); setIsFormOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteProduct(p._id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            <span>
              Showing {products.length} of {pagination.total} products (Page {pagination.page} of {pagination.pages})
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

      {/* Modals */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingProduct(null); }}
        product={editingProduct}
        categories={categories}
        onSaveSuccess={(msg) => { triggerNotification(msg); fetchProducts(); }}
      />

      <ProductDetailModal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedProductDetail(null); }}
        product={selectedProductDetail}
        onUpdateSuccess={(msg) => { triggerNotification(msg); fetchProducts(); }}
      />
    </div>
  );
};

export default ProductList;
