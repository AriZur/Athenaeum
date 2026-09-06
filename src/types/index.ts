export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  genre: string;
  description: string | null;
  cover_url: string | null;
  total_copies: number;
  available_copies: number;
  weekly_fee: number;
  account_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  membership_number: string;
  status: 'active' | 'suspended' | 'expired';
  account_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type RentalStatus = 'active' | 'extended' | 'returned' | 'overdue';

export interface Rental {
  id: string;
  book_id: string;
  member_id: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  weeks_borrowed: number; // 1 to 4 max
  weekly_fee: number;
  total_fees_paid: number;
  status: RentalStatus;
  notes: string | null;
  account_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalRenewal {
  id: string;
  rental_id: string;
  week_number: number;
  fee_amount: number;
  renewed_at: string;
  new_due_date: string;
  notes: string | null;
}

export interface RentalWithDetails extends Rental {
  book?: Book;
  member?: Member;
  renewals?: RentalRenewal[];
}

export interface MemberWithHistory extends Member {
  rentals: RentalWithDetails[];
  total_spent: number;
  active_rentals_count: number;
}

export interface DashboardStats {
  totalRevenue: number;
  rentalBaseRevenue: number;
  extensionRevenue: number;
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  activeRentalsCount: number;
  overdueCount: number;
  topRevenueBook: {
    book: Book | null;
    revenue: number;
    rentalCount: number;
  } | null;
  totalMembers: number;
}

export interface LibrarySettings {
  overall_weekly_rate: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FetchBooksParams {
  page?: number;
  pageSize?: number;
  search?: string;
  genre?: string;
  availability?: 'all' | 'available' | 'loaned';
  accountId?: string;
}

export interface FetchMembersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  accountId?: string;
}

export interface FetchRentalsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  memberId?: string;
  bookId?: string;
  accountId?: string;
}
