import React from 'react';
import { PackageOpen } from 'lucide-react';

const EmptyState = ({ title = 'No records found', message = 'Try adjusting your search or filters.', actionButton = null }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
        <PackageOpen className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h4>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">
        {message}
      </p>
      {actionButton && <div className="mt-5">{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
