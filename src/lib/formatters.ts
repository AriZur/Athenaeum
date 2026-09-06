export function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  const formatted = num % 1 === 0
    ? num.toLocaleString('en-KE')
    : num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `KSh ${formatted}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

export function getDueDateRelative(dueDateString: string, isReturned: boolean): {
  label: string;
  isOverdue: boolean;
  daysDiff: number;
} {
  if (isReturned) {
    return { label: 'Returned', isOverdue: false, daysDiff: 0 };
  }
  const due = new Date(dueDateString);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`,
      isOverdue: true,
      daysDiff: diffDays,
    };
  }
  if (diffDays === 0) {
    return { label: 'Due today', isOverdue: false, daysDiff: 0 };
  }
  if (diffDays === 1) {
    return { label: 'Due tomorrow', isOverdue: false, daysDiff: 1 };
  }
  return {
    label: `${diffDays} days remaining`,
    isOverdue: false,
    daysDiff: diffDays,
  };
}
