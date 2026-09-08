import { supabase } from './supabase';
import { 
  Book, 
  Member, 
  Rental, 
  RentalRenewal, 
  RentalWithDetails, 
  DashboardStats, 
  LibrarySettings,
  PaginatedResponse,
  FetchBooksParams,
  FetchMembersParams,
  FetchRentalsParams
} from '../types';

// Helper to determine the current active account identifier
export function getActiveAccountId(): string | null {
  try {
    const raw = localStorage.getItem('athenaeum_active_account');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.email) return parsed.email.toLowerCase().trim();
      if (parsed?.id) return parsed.id;
    }
  } catch {}
  return null;
}

// ==================== LIBRARY SETTINGS ====================

export async function fetchLibrarySettings(accountId?: string): Promise<LibrarySettings> {
  const resolved = accountId || getActiveAccountId();
  try {
    if (resolved) {
      const { data, error } = await supabase
        .from('library_settings')
        .select('*')
        .eq('key', `${resolved}:overall_weekly_rate`)
        .maybeSingle();

      if (!error && data?.value) {
        const rate = parseFloat(data.value);
        return {
          overall_weekly_rate: isNaN(rate) ? 100 : rate,
        };
      }
    }

    const { data } = await supabase
      .from('library_settings')
      .select('*')
      .eq('key', 'overall_weekly_rate')
      .maybeSingle();

    const rate = data?.value ? parseFloat(data.value) : 100;
    return {
      overall_weekly_rate: isNaN(rate) ? 100 : rate,
    };
  } catch (err) {
    console.warn('Error in fetchLibrarySettings:', err);
    return { overall_weekly_rate: 100 };
  }
}

export async function updateOverallWeeklyRate(
  newRate: number,
  accountId?: string,
  updateExistingBooks: boolean = true
): Promise<void> {
  const rateNum = Number(newRate);
  if (isNaN(rateNum) || rateNum < 0) {
    throw new Error('Please enter a valid non-negative rate in Kenyan shillings.');
  }
  const resolved = accountId || getActiveAccountId();
  const settingsKey = resolved ? `${resolved}:overall_weekly_rate` : 'overall_weekly_rate';

  // 1. Update library_settings
  const { error: settingsError } = await supabase
    .from('library_settings')
    .upsert({
      key: settingsKey,
      value: String(rateNum),
      account_id: resolved || null,
      updated_at: new Date().toISOString(),
    });

  if (settingsError) {
    console.error('Error updating library_settings:', settingsError);
    throw settingsError;
  }

  // 2. Optionally update all existing books belonging to this account in library to the new overall rate
  if (updateExistingBooks) {
    let booksQuery = supabase
      .from('books')
      .update({
        weekly_fee: rateNum,
        updated_at: new Date().toISOString(),
      });

    if (resolved) {
      booksQuery = booksQuery.eq('account_id', resolved);
    }

    const { error: booksError } = await booksQuery;

    if (booksError) {
      console.error('Error updating books weekly_fee:', booksError);
      throw booksError;
    }
  }
}

// ==================== BOOKS ====================

export async function fetchDistinctGenres(accountId?: string): Promise<string[]> {
  const resolved = accountId || getActiveAccountId();
  try {
    let query = supabase.from('books').select('genre');
    if (resolved) {
      query = query.eq('account_id', resolved);
    }
    const { data } = await query;
    const genres = Array.from(new Set((data || []).map(b => b.genre).filter(Boolean)));
    return ['All', ...genres];
  } catch (err) {
    console.error('Error fetching distinct genres:', err);
    return ['All'];
  }
}

export async function fetchBooksPaginated(params: FetchBooksParams = {}): Promise<PaginatedResponse<Book>> {
  const {
    page = 1,
    pageSize = 12,
    search = '',
    genre = 'All',
    availability = 'all',
    accountId,
  } = params;

  const resolved = accountId || getActiveAccountId();
  let query = supabase
    .from('books')
    .select('*', { count: 'exact' });

  if (resolved) {
    query = query.eq('account_id', resolved);
  }

  if (genre && genre !== 'All') {
    query = query.eq('genre', genre);
  }

  if (availability === 'available') {
    query = query.gt('available_copies', 0);
  } else if (availability === 'loaned') {
    // Books where at least one copy is currently loaned out
    let rentalQuery = supabase
      .from('rentals')
      .select('book_id')
      .in('status', ['active', 'extended', 'overdue']);
    if (resolved) {
      rentalQuery = rentalQuery.eq('account_id', resolved);
    }
    const { data: activeLoans } = await rentalQuery;
    const loanedIds = Array.from(new Set((activeLoans || []).map(r => r.book_id).filter(Boolean)));
    if (loanedIds.length === 0) {
      return { items: [], total: 0, page, pageSize, totalPages: 1 };
    }
    query = query.in('id', loanedIds);
  }

  if (search && search.trim()) {
    const term = search.trim().replace(/[%_]/g, '');
    if (term) {
      query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%,isbn.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  query = query.order('created_at', { ascending: false });

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error('Error fetching paginated books:', error);
    throw error;
  }

  const items = (data || []).map(b => ({
    ...b,
    total_copies: Number(b.total_copies),
    available_copies: Number(b.available_copies),
    weekly_fee: Number(b.weekly_fee),
  }));

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function fetchBooks(accountId?: string): Promise<Book[]> {
  const resolved = accountId || getActiveAccountId();
  let query = supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (resolved) {
    query = query.eq('account_id', resolved);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
  return (data || []).map(b => ({
    ...b,
    total_copies: Number(b.total_copies),
    available_copies: Number(b.available_copies),
    weekly_fee: Number(b.weekly_fee),
  }));
}

export async function addBook(
  book: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'available_copies' | 'weekly_fee'> & { available_copies?: number; weekly_fee?: number },
  accountId?: string
): Promise<Book> {
  const resolved = accountId || getActiveAccountId();
  const available = book.available_copies !== undefined ? book.available_copies : book.total_copies;
  
  let fee = book.weekly_fee;
  if (fee === undefined || isNaN(fee)) {
    const settings = await fetchLibrarySettings(resolved || undefined);
    fee = settings.overall_weekly_rate;
  }

  const { data, error } = await supabase
    .from('books')
    .insert([{
      title: book.title.trim(),
      author: book.author.trim(),
      isbn: book.isbn ? book.isbn.trim() : null,
      genre: book.genre.trim(),
      description: book.description ? book.description.trim() : null,
      cover_url: book.cover_url ? book.cover_url.trim() : null,
      total_copies: Number(book.total_copies),
      available_copies: Number(available),
      weekly_fee: Number(fee),
      account_id: resolved || null,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding book:', error);
    throw error;
  }
  return {
    ...data,
    total_copies: Number(data.total_copies),
    available_copies: Number(data.available_copies),
    weekly_fee: Number(data.weekly_fee),
  };
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<Book> {
  const cleanUpdates: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
  if (cleanUpdates.total_copies !== undefined) cleanUpdates.total_copies = Number(cleanUpdates.total_copies);
  if (cleanUpdates.available_copies !== undefined) cleanUpdates.available_copies = Number(cleanUpdates.available_copies);
  if (cleanUpdates.weekly_fee !== undefined) cleanUpdates.weekly_fee = Number(cleanUpdates.weekly_fee);

  const { data, error } = await supabase
    .from('books')
    .update(cleanUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating book:', error);
    throw error;
  }
  return {
    ...data,
    total_copies: Number(data.total_copies),
    available_copies: Number(data.available_copies),
    weekly_fee: Number(data.weekly_fee),
  };
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
}

// ==================== MEMBERS ====================

export async function fetchMembersPaginated(
  params: FetchMembersParams = {}
): Promise<PaginatedResponse<Member> & { memberStats: Record<string, { totalRentals: number; activeRentals: number; totalSpent: number }> }> {
  const {
    page = 1,
    pageSize = 12,
    search = '',
    status,
    accountId,
  } = params;

  const resolved = accountId || getActiveAccountId();
  let query = supabase
    .from('members')
    .select('*', { count: 'exact' });

  if (resolved) {
    query = query.eq('account_id', resolved);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search && search.trim()) {
    const term = search.trim().replace(/[%_]/g, '');
    if (term) {
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,membership_number.ilike.%${term}%,address.ilike.%${term}%`);
    }
  }

  query = query.order('created_at', { ascending: false });

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error('Error fetching paginated members:', error);
    throw error;
  }

  const items = data || [];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Compute stats for ONLY the displayed members on this page
  const memberStats: Record<string, { totalRentals: number; activeRentals: number; totalSpent: number }> = {};
  items.forEach(m => {
    memberStats[m.id] = { totalRentals: 0, activeRentals: 0, totalSpent: 0 };
  });

  if (items.length > 0) {
    const memberIds = items.map(m => m.id);
    const { data: memberRentals } = await supabase
      .from('rentals')
      .select('member_id, total_fees_paid, status')
      .in('member_id', memberIds);

    (memberRentals || []).forEach(r => {
      if (r.member_id && memberStats[r.member_id]) {
        memberStats[r.member_id].totalRentals += 1;
        memberStats[r.member_id].totalSpent += Number(r.total_fees_paid || 0);
        if (r.status === 'active' || r.status === 'extended' || r.status === 'overdue') {
          memberStats[r.member_id].activeRentals += 1;
        }
      }
    });
  }

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    memberStats,
  };
}

export async function fetchMembers(accountId?: string): Promise<Member[]> {
  const resolved = accountId || getActiveAccountId();
  let query = supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });

  if (resolved) {
    query = query.eq('account_id', resolved);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching members:', error);
    throw error;
  }
  return data || [];
}

export async function findMemberByContact(
  contact: { phone?: string | null; email?: string | null },
  accountId?: string,
  excludeMemberId?: string
): Promise<Member | null> {
  const resolved = accountId || getActiveAccountId();
  const trimmedPhone = contact.phone && contact.phone.trim() ? contact.phone.trim() : null;
  const trimmedEmail = contact.email && contact.email.trim() ? contact.email.trim().toLowerCase() : null;

  if (!trimmedPhone && !trimmedEmail) return null;

  // Extract raw digits for phone comparison
  const phoneDigits = trimmedPhone ? trimmedPhone.replace(/\D/g, '') : '';
  const last7Phone = phoneDigits.length >= 7 ? phoneDigits.slice(-7) : null;

  let query = supabase.from('members').select('*');
  if (resolved) {
    query = query.eq('account_id', resolved);
  }
  if (excludeMemberId) {
    query = query.neq('id', excludeMemberId);
  }

  const { data, error } = await query;
  if (error || !data) return null;

  // 1. First check email match (if email provided)
  if (trimmedEmail) {
    const emailMatch = data.find(m => m.email && m.email.trim().toLowerCase() === trimmedEmail);
    if (emailMatch) return emailMatch;
  }

  // 2. Check phone match (by clean digits or last 7-9 digits)
  if (trimmedPhone && last7Phone) {
    const phoneMatch = data.find(m => {
      if (!m.phone) return false;
      const mDigits = m.phone.replace(/\D/g, '');
      if (mDigits === phoneDigits) return true;
      if (mDigits.endsWith(last7Phone) || phoneDigits.endsWith(mDigits.slice(-7))) return true;
      return false;
    });
    if (phoneMatch) return phoneMatch;
  }

  return null;
}

export async function addMember(
  member: {
    full_name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  },
  accountId?: string
): Promise<Member> {
  const resolved = accountId || getActiveAccountId();

  // Check for existing duplicate member by contact
  const existing = await findMemberByContact(
    { phone: member.phone, email: member.email },
    resolved || undefined
  );
  if (existing) {
    const matchedContact = existing.phone && member.phone && existing.phone.replace(/\D/g, '').endsWith(member.phone.replace(/\D/g, '').slice(-7))
      ? `phone number "${existing.phone}"`
      : `email "${existing.email}"`;
    throw new Error(
      `A member with this ${matchedContact} already exists under the name "${existing.full_name}" (Membership ID: ${existing.membership_number}).`
    );
  }

  // Auto-generate membership number e.g. MEM-YEAR-RANDOM
  const membership_number = `MEM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data, error } = await supabase
    .from('members')
    .insert([{
      full_name: member.full_name.trim(),
      email: member.email && member.email.trim() ? member.email.trim().toLowerCase() : null,
      phone: member.phone && member.phone.trim() ? member.phone.trim() : null,
      address: member.address && member.address.trim() ? member.address.trim() : null,
      membership_number,
      status: 'active',
      account_id: resolved || null,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding member:', error);
    throw error;
  }
  return data;
}

export async function updateMember(id: string, updates: Partial<Member>): Promise<Member> {
  const cleanUpdates: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
  if ('email' in cleanUpdates) {
    cleanUpdates.email = cleanUpdates.email && typeof cleanUpdates.email === 'string' && cleanUpdates.email.trim() ? cleanUpdates.email.trim().toLowerCase() : null;
  }
  if ('phone' in cleanUpdates) {
    cleanUpdates.phone = cleanUpdates.phone && typeof cleanUpdates.phone === 'string' && cleanUpdates.phone.trim() ? cleanUpdates.phone.trim() : null;
  }

  // If phone or email changed, verify no other member has this contact
  if (cleanUpdates.phone || cleanUpdates.email) {
    const existing = await findMemberByContact(
      { phone: cleanUpdates.phone, email: cleanUpdates.email },
      undefined,
      id
    );
    if (existing) {
      const matchedContact = existing.phone && cleanUpdates.phone && existing.phone.replace(/\D/g, '').endsWith(cleanUpdates.phone.replace(/\D/g, '').slice(-7))
        ? `phone number "${existing.phone}"`
        : `email "${existing.email}"`;
      throw new Error(
        `Another member with this ${matchedContact} already exists under the name "${existing.full_name}" (Membership ID: ${existing.membership_number}).`
      );
    }
  }

  const { data, error } = await supabase
    .from('members')
    .update(cleanUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating member:', error);
    throw error;
  }
  return data;
}

export async function deleteMember(id: string): Promise<void> {
  // Check if member has active or overdue loans
  const { data: activeRentals, error: checkErr } = await supabase
    .from('rentals')
    .select('id, status, book:books(title)')
    .eq('member_id', id)
    .in('status', ['active', 'extended', 'overdue']);

  if (!checkErr && activeRentals && activeRentals.length > 0) {
    const bookTitle = (activeRentals[0] as any)?.book?.title || 'a book';
    throw new Error(
      `Cannot delete this member: they currently have ${activeRentals.length} active book loan(s) checked out ("${bookTitle}"). Please return or delete their active loans first.`
    );
  }

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting member:', error);
    throw error;
  }
}

// ==================== RENTALS ====================

export async function fetchRentalStatusCounts(accountId?: string): Promise<{
  total: number;
  active: number;
  extended: number;
  overdue: number;
  returned: number;
}> {
  const resolved = accountId || getActiveAccountId();
  let query = supabase.from('rentals').select('status, due_date');
  if (resolved) {
    query = query.eq('account_id', resolved);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching rental status counts:', error);
    return { total: 0, active: 0, extended: 0, overdue: 0, returned: 0 };
  }

  const now = new Date();
  let total = data.length;
  let active = 0;
  let extended = 0;
  let overdue = 0;
  let returned = 0;

  for (const r of data) {
    const isPastDue = new Date(r.due_date) < now && r.status !== 'returned';
    if (r.status === 'returned') {
      returned++;
    } else if (isPastDue || r.status === 'overdue') {
      overdue++;
    } else if (r.status === 'extended') {
      extended++;
    } else if (r.status === 'active') {
      active++;
    }
  }

  return { total, active, extended, overdue, returned };
}

export async function fetchRentalsPaginated(
  params: FetchRentalsParams = {}
): Promise<PaginatedResponse<RentalWithDetails>> {
  const {
    page = 1,
    pageSize = 10,
    search = '',
    status = 'all',
    memberId,
    bookId,
    accountId,
  } = params;

  const resolved = accountId || getActiveAccountId();
  let query = supabase
    .from('rentals')
    .select(
      `
      *,
      book:books(*),
      member:members(*)
      `,
      { count: 'exact' }
    );

  if (resolved) {
    query = query.eq('account_id', resolved);
  }

  if (memberId) {
    query = query.eq('member_id', memberId);
  }

  if (bookId) {
    query = query.eq('book_id', bookId);
  }

  const now = new Date();

  // Status filtering
  if (status === 'active') {
    query = query.in('status', ['active', 'extended']).gte('due_date', now.toISOString());
  } else if (status === 'overdue') {
    query = query.or(`status.eq.overdue,and(status.neq.returned,due_date.lt.${now.toISOString()})`);
  } else if (status === 'extended') {
    query = query.eq('status', 'extended').gte('due_date', now.toISOString());
  } else if (status === 'returned') {
    query = query.eq('status', 'returned');
  }

  // Search filtering
  if (search && search.trim()) {
    const term = search.trim().replace(/[%_]/g, '');
    if (term) {
      let bQ = supabase.from('books').select('id').or(`title.ilike.%${term}%,author.ilike.%${term}%`);
      let mQ = supabase.from('members').select('id').or(`full_name.ilike.%${term}%,email.ilike.%${term}%,membership_number.ilike.%${term}%,phone.ilike.%${term}%`);
      if (resolved) {
        bQ = bQ.eq('account_id', resolved);
        mQ = mQ.eq('account_id', resolved);
      }
      const [{ data: booksData }, { data: membersData }] = await Promise.all([bQ, mQ]);
      const matchedBookIds = (booksData || []).map(b => b.id);
      const matchedMemberIds = (membersData || []).map(m => m.id);

      const conditions: string[] = [];
      if (matchedBookIds.length > 0) {
        conditions.push(`book_id.in.(${matchedBookIds.join(',')})`);
      }
      if (matchedMemberIds.length > 0) {
        conditions.push(`member_id.in.(${matchedMemberIds.join(',')})`);
      }
      conditions.push(`notes.ilike.%${term}%`);

      query = query.or(conditions.join(','));
    }
  }

  query = query.order('borrow_date', { ascending: false });

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: rentalsData, count, error } = await query;
  if (error) {
    console.error('Error fetching paginated rentals:', error);
    throw error;
  }

  const rentalIds = (rentalsData || []).map(r => r.id);
  let renewalsByRental: Record<string, RentalRenewal[]> = {};

  if (rentalIds.length > 0) {
    const { data: renewalsData } = await supabase
      .from('rental_renewals')
      .select('*')
      .in('rental_id', rentalIds)
      .order('week_number', { ascending: true });

    renewalsByRental = (renewalsData || []).reduce((acc: Record<string, RentalRenewal[]>, item) => {
      if (!acc[item.rental_id]) acc[item.rental_id] = [];
      acc[item.rental_id].push({
        ...item,
        week_number: Number(item.week_number),
        fee_amount: Number(item.fee_amount)
      });
      return acc;
    }, {});
  }

  const items: RentalWithDetails[] = (rentalsData || []).map(r => {
    const isPastDue = new Date(r.due_date) < now && r.status !== 'returned';
    const computedStatus = isPastDue ? 'overdue' : r.status;

    return {
      ...r,
      weeks_borrowed: Number(r.weeks_borrowed),
      weekly_fee: Number(r.weekly_fee),
      total_fees_paid: Number(r.total_fees_paid),
      status: computedStatus,
      book: r.book ? {
        ...r.book,
        total_copies: Number(r.book.total_copies),
        available_copies: Number(r.book.available_copies),
        weekly_fee: Number(r.book.weekly_fee)
      } : undefined,
      renewals: renewalsByRental[r.id] || []
    };
  });

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function fetchRentals(accountId?: string): Promise<RentalWithDetails[]> {
  const resolved = accountId || getActiveAccountId();
  let query = supabase
    .from('rentals')
    .select(`
      *,
      book:books(*),
      member:members(*)
    `)
    .order('borrow_date', { ascending: false });

  if (resolved) {
    query = query.eq('account_id', resolved);
  }

  const { data: rentalsData, error: rentalsError } = await query;

  if (rentalsError) {
    console.error('Error fetching rentals:', rentalsError);
    throw rentalsError;
  }

  // Fetch renewals
  const { data: renewalsData } = await supabase
    .from('rental_renewals')
    .select('*')
    .order('week_number', { ascending: true });

  const renewalsByRental = (renewalsData || []).reduce((acc: Record<string, RentalRenewal[]>, item) => {
    if (!acc[item.rental_id]) acc[item.rental_id] = [];
    acc[item.rental_id].push({
      ...item,
      week_number: Number(item.week_number),
      fee_amount: Number(item.fee_amount)
    });
    return acc;
  }, {});

  const now = new Date();

  return (rentalsData || []).map(r => {
    const isPastDue = new Date(r.due_date) < now && r.status !== 'returned';
    const computedStatus = isPastDue ? 'overdue' : r.status;

    return {
      ...r,
      weeks_borrowed: Number(r.weeks_borrowed),
      weekly_fee: Number(r.weekly_fee),
      total_fees_paid: Number(r.total_fees_paid),
      status: computedStatus,
      book: r.book ? {
        ...r.book,
        total_copies: Number(r.book.total_copies),
        available_copies: Number(r.book.available_copies),
        weekly_fee: Number(r.book.weekly_fee)
      } : undefined,
      renewals: renewalsByRental[r.id] || []
    };
  });
}

/**
 * Creates a rental for 1 week at the book's weekly fee.
 * Supports custom or previous borrow dates (logging historical transactions).
 * Automatically decrements available_copies for active/overdue loans.
 */
export async function createRental(
  params: {
    bookId: string;
    memberId: string;
    notes?: string;
    borrowDate?: string;
    isHistoricalReturned?: boolean;
    returnDate?: string;
    weeksLoaned?: number;
    totalFeesPaid?: number;
  },
  accountId?: string
): Promise<Rental> {
  const resolved = accountId || getActiveAccountId();

  // 1. Fetch current book to verify available copies & get weekly fee
  const { data: book, error: bookErr } = await supabase
    .from('books')
    .select('*')
    .eq('id', params.bookId)
    .single();

  if (bookErr || !book) {
    throw new Error('Book not found');
  }

  const isHistoricalReturned = !!params.isHistoricalReturned;

  if (!isHistoricalReturned && Number(book.available_copies) <= 0) {
    throw new Error(`No available copies of "${book.title}" remaining.`);
  }

  // 2. Check if member already has this exact book currently active
  if (!isHistoricalReturned) {
    const { data: existingActive } = await supabase
      .from('rentals')
      .select('id')
      .eq('book_id', params.bookId)
      .eq('member_id', params.memberId)
      .in('status', ['active', 'extended', 'overdue'])
      .limit(1);

    if (existingActive && existingActive.length > 0) {
      throw new Error('This member already has an active copy of this book on loan.');
    }
  }

  const now = new Date();
  const borrowDateObj = params.borrowDate
    ? (params.borrowDate.includes('T') ? new Date(params.borrowDate) : new Date(params.borrowDate + 'T12:00:00'))
    : now;
  const weeklyFee = Number(book.weekly_fee);

  // Determine weeks borrowed
  let weeksBorrowed = Math.max(1, params.weeksLoaned ? Math.round(params.weeksLoaned) : 1);
  if (isHistoricalReturned && !params.weeksLoaned && params.returnDate) {
    const retObj = params.returnDate.includes('T') ? new Date(params.returnDate) : new Date(params.returnDate + 'T12:00:00');
    const diffDays = Math.max(0, Math.round((retObj.getTime() - borrowDateObj.getTime()) / (1000 * 60 * 60 * 24)));
    weeksBorrowed = Math.max(1, Math.ceil(diffDays === 0 ? 1 : diffDays / 7));
  }

  const calculatedTotalFees = params.totalFeesPaid !== undefined
    ? Number(params.totalFeesPaid)
    : (weeklyFee * weeksBorrowed);

  // Due date: borrowDate + (weeksBorrowed * 7 days)
  const dueDate = new Date(borrowDateObj.getTime() + (weeksBorrowed * 7) * 24 * 60 * 60 * 1000);

  let status: 'active' | 'extended' | 'overdue' | 'returned' = 'active';
  let returnDateStr: string | null = null;

  if (isHistoricalReturned) {
    status = 'returned';
    returnDateStr = params.returnDate
      ? (params.returnDate.includes('T') ? new Date(params.returnDate).toISOString() : new Date(params.returnDate + 'T12:00:00').toISOString())
      : now.toISOString();
  } else if (dueDate < now) {
    status = 'overdue';
  } else if (weeksBorrowed > 1) {
    status = 'extended';
  }

  // 3. Insert rental
  const { data: rental, error: rentalErr } = await supabase
    .from('rentals')
    .insert([{
      book_id: params.bookId,
      member_id: params.memberId,
      borrow_date: borrowDateObj.toISOString(),
      due_date: dueDate.toISOString(),
      return_date: returnDateStr,
      weeks_borrowed: weeksBorrowed,
      weekly_fee: weeklyFee,
      total_fees_paid: calculatedTotalFees,
      status: status,
      notes: params.notes ? params.notes.trim() : null,
      account_id: resolved || null,
    }])
    .select()
    .single();

  if (rentalErr) {
    console.error('Error creating rental:', rentalErr);
    throw rentalErr;
  }

  // If multiple weeks were loaned, record renewals for audit log
  if (weeksBorrowed > 1) {
    const renewalsToInsert = [];
    for (let w = 2; w <= weeksBorrowed; w++) {
      const stepDueDate = new Date(borrowDateObj.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      renewalsToInsert.push({
        rental_id: rental.id,
        week_number: w,
        fee_amount: weeklyFee,
        renewed_at: borrowDateObj.toISOString(),
        new_due_date: stepDueDate.toISOString(),
        notes: isHistoricalReturned ? `Historical loan extension (Week ${w})` : `Extended borrow (Week ${w})`
      });
    }
    const { error: renewErr } = await supabase
      .from('rental_renewals')
      .insert(renewalsToInsert);
    if (renewErr) {
      console.warn('Could not insert historical renewals:', renewErr);
    }
  }

  // 4. Decrement available copies only if loan is still active/out
  if (!isHistoricalReturned) {
    const newAvailable = Math.max(0, Number(book.available_copies) - 1);
    await supabase
      .from('books')
      .update({ available_copies: newAvailable, updated_at: now.toISOString() })
      .eq('id', params.bookId);
  }

  return {
    ...rental,
    weeks_borrowed: Number(rental.weeks_borrowed),
    weekly_fee: Number(rental.weekly_fee),
    total_fees_paid: Number(rental.total_fees_paid),
  };
}

/**
 * Extends a rental by 1 additional week.
 * STRICT ENFORCEMENT: Max 4 weeks total.
 * Charges additional weekly renewal fee and logs renewal transaction.
 */
export async function extendRental(rentalId: string, notes?: string): Promise<Rental> {
  // 1. Fetch current rental
  const { data: rental, error: fetchErr } = await supabase
    .from('rentals')
    .select('*, book:books(*)')
    .eq('id', rentalId)
    .single();

  if (fetchErr || !rental) {
    throw new Error('Rental record not found.');
  }

  if (rental.status === 'returned') {
    throw new Error('This rental has already been marked as returned.');
  }

  const currentWeeks = Number(rental.weeks_borrowed);
  if (currentWeeks >= 4) {
    throw new Error('Maximum borrow limit reached! Individuals can only hold a book for a maximum of 4 weeks.');
  }

  const newWeeks = currentWeeks + 1;
  const weeklyFee = Number(rental.weekly_fee);
  const newTotalFees = Number(rental.total_fees_paid) + weeklyFee;
  
  // New due date: 7 days after the previous due date (or 7 days from now if already overdue)
  const currentDueDate = new Date(rental.due_date);
  const baseDate = currentDueDate > new Date() ? currentDueDate : new Date();
  const newDueDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const now = new Date();

  // 2. Insert renewal transaction log
  const { error: renewalErr } = await supabase
    .from('rental_renewals')
    .insert([{
      rental_id: rentalId,
      week_number: newWeeks,
      fee_amount: weeklyFee,
      renewed_at: now.toISOString(),
      new_due_date: newDueDate.toISOString(),
      notes: notes ? notes.trim() : 'Extended loan (+7 days)'
    }]);

  if (renewalErr) {
    console.error('Error logging renewal:', renewalErr);
    throw renewalErr;
  }

  // 3. Update rental record
  const { data: updatedRental, error: updateErr } = await supabase
    .from('rentals')
    .update({
      weeks_borrowed: newWeeks,
      due_date: newDueDate.toISOString(),
      total_fees_paid: newTotalFees,
      status: 'extended',
      updated_at: now.toISOString()
    })
    .eq('id', rentalId)
    .select()
    .single();

  if (updateErr) {
    console.error('Error updating rental on extend:', updateErr);
    throw updateErr;
  }

  return {
    ...updatedRental,
    weeks_borrowed: Number(updatedRental.weeks_borrowed),
    weekly_fee: Number(updatedRental.weekly_fee),
    total_fees_paid: Number(updatedRental.total_fees_paid)
  };
}

/**
 * Returns a borrowed book back to the library.
 * Automatically increments available_copies for the book.
 */
export async function returnRental(rentalId: string, notes?: string): Promise<Rental> {
  const { data: rental, error: fetchErr } = await supabase
    .from('rentals')
    .select('*, book:books(*)')
    .eq('id', rentalId)
    .single();

  if (fetchErr || !rental) {
    throw new Error('Rental not found');
  }

  if (rental.status === 'returned') {
    return rental;
  }

  const now = new Date();

  // 1. Mark rental as returned
  const noteSuffix = notes ? ` | Return note: ${notes.trim()}` : '';
  const mergedNotes = rental.notes ? `${rental.notes}${noteSuffix}` : notes;

  const { data: updatedRental, error: updateErr } = await supabase
    .from('rentals')
    .update({
      status: 'returned',
      return_date: now.toISOString(),
      notes: mergedNotes,
      updated_at: now.toISOString()
    })
    .eq('id', rentalId)
    .select()
    .single();

  if (updateErr) {
    console.error('Error returning rental:', updateErr);
    throw updateErr;
  }

  // 2. Increment available copies on book
  if (rental.book) {
    const currentAvailable = Number(rental.book.available_copies);
    const totalCopies = Number(rental.book.total_copies);
    const newAvailable = Math.min(totalCopies, currentAvailable + 1);

    await supabase
      .from('books')
      .update({
        available_copies: newAvailable,
        updated_at: now.toISOString()
      })
      .eq('id', rental.book_id);
  }

  return updatedRental;
}

/**
 * Deletes a rental record completely from the database.
 * If the rental was active/overdue, its checked-out copy is safely restored to the book's available stock.
 */
export async function deleteRental(rentalId: string): Promise<void> {
  // Fetch rental to check status and book
  const { data: rental, error: fetchErr } = await supabase
    .from('rentals')
    .select('*, book:books(*)')
    .eq('id', rentalId)
    .single();

  if (fetchErr || !rental) {
    throw new Error('Rental record not found.');
  }

  // If the rental was not yet returned, restore the copy to available_copies
  if (rental.status !== 'returned' && rental.book) {
    const currentAvailable = Number(rental.book.available_copies);
    const totalCopies = Number(rental.book.total_copies);
    const newAvailable = Math.min(totalCopies, currentAvailable + 1);

    await supabase
      .from('books')
      .update({
        available_copies: newAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', rental.book_id);
  }

  const { error } = await supabase
    .from('rentals')
    .delete()
    .eq('id', rentalId);

  if (error) {
    console.error('Error deleting rental:', error);
    throw error;
  }
}

// ==================== DASHBOARD STATS COMPUTATION ====================

export function computeDashboardStats(
  books: Book[],
  rentals: RentalWithDetails[],
  members: Member[]
): DashboardStats {
  let totalRevenue = 0;
  let rentalBaseRevenue = 0;
  let extensionRevenue = 0;
  let activeRentalsCount = 0;
  let overdueCount = 0;

  const revenueByBook: Record<string, { revenue: number; count: number; book: Book }> = {};

  for (const r of rentals) {
    const feePaid = Number(r.total_fees_paid || 0);
    const weeklyFee = Number(r.weekly_fee || 0);
    totalRevenue += feePaid;
    rentalBaseRevenue += weeklyFee;
    extensionRevenue += Math.max(0, feePaid - weeklyFee);

    if (r.status === 'active' || r.status === 'extended') {
      activeRentalsCount++;
    } else if (r.status === 'overdue') {
      activeRentalsCount++;
      overdueCount++;
    }

    if (r.book_id) {
      if (!revenueByBook[r.book_id]) {
        const foundBook = books.find(b => b.id === r.book_id) || r.book;
        if (foundBook) {
          revenueByBook[r.book_id] = { revenue: 0, count: 0, book: foundBook };
        }
      }
      if (revenueByBook[r.book_id]) {
        revenueByBook[r.book_id].revenue += feePaid;
        revenueByBook[r.book_id].count += 1;
      }
    }
  }

  let topRevenueBook: DashboardStats['topRevenueBook'] = null;
  let maxRev = -1;

  for (const item of Object.values(revenueByBook)) {
    if (item.revenue > maxRev) {
      maxRev = item.revenue;
      topRevenueBook = {
        book: item.book,
        revenue: item.revenue,
        rentalCount: item.count
      };
    }
  }

  let totalCopies = 0;
  let availableCopies = 0;
  for (const b of books) {
    totalCopies += Number(b.total_copies || 0);
    availableCopies += Number(b.available_copies || 0);
  }

  return {
    totalRevenue,
    rentalBaseRevenue,
    extensionRevenue,
    totalBooks: books.length,
    totalCopies,
    availableCopies,
    borrowedCopies: Math.max(0, totalCopies - availableCopies),
    activeRentalsCount,
    overdueCount,
    topRevenueBook,
    totalMembers: members.length
  };
}

// ==================== REALTIME SUBSCRIPTION ====================

export function subscribeToLibraryChanges(onUpdate: () => void) {
  const channel = supabase
    .channel('library-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' }, () => {
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_renewals' }, () => {
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
      onUpdate();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
