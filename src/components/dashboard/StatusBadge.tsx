import React from 'react';

export type StatusType = 
  | 'approved' 
  | 'submitted' 
  | 'pending' 
  | 'processing' 
  | 'under_review'
  | 'interview_requested'
  | 'interview_pending'
  | 'action_needed'
  | 'rejected'
  | 'incomplete'
  | 'visa_query'
  | 'draft'
  | 'signed'
  | 'suspended'
  | 'cancelled';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const s = status?.toLowerCase() || '';

  let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
  let label = s.replace(/_/g, ' ');

  if (s === 'approved' || s === 'submitted' || s === 'signed' || s === 'finalized') {
    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'approved' || s === 'finalized') label = 'Approved';
  } else if (s === 'rejected' || s === 'declined' || s === 'action_needed' || s === 'cancelled' || s === 'suspended') {
    badgeClass = 'bg-red-50 text-red-700 border-red-200';
    if (s === 'rejected' || s === 'declined') label = 'Rejected';
  } else if (s === 'interview_requested' || s === 'interview_pending' || s === 'visa_query' || s === 'under_review') {
    badgeClass = 'bg-blue-50 text-indigo-700 border-blue-200';
    if (s === 'interview_requested' || s === 'interview_pending' || s === 'under_review') label = 'Interview Pending';
  } else if (s === 'incomplete' || s === 'pending_docs' || s === 'pending_documents' || s === 'processing' || s === 'pending' || s === 'draft') {
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'incomplete' || s === 'pending_docs' || s === 'pending_documents') label = 'Incomplete';
  } else if (s === 'withdrawn') {
    badgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
    label = 'Withdrawn';
  }

  return (
    <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border whitespace-nowrap transition-all duration-200 ${badgeClass} ${className}`}>
      {label}
    </span>
  );
};