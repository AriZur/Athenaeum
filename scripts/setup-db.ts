import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Chrisnoah%402678@db.iwtiuksdcohleojgoncg.supabase.co:5432/postgres';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  console.log('Connecting to Supabase Postgres...');
  const client = await pool.connect();
  try {
    console.log('Connected! Creating tables and triggers...');

    await client.query(`
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- 1. BOOKS TABLE
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT UNIQUE,
        genre TEXT NOT NULL DEFAULT 'General',
        description TEXT,
        cover_url TEXT,
        total_copies INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
        available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0 AND available_copies <= total_copies),
        weekly_fee NUMERIC(10, 2) NOT NULL DEFAULT 5.00 CHECK (weekly_fee >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 2. MEMBERS TABLE
      CREATE TABLE IF NOT EXISTS members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        address TEXT,
        membership_number TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 3. RENTALS TABLE
      CREATE TABLE IF NOT EXISTS rentals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        borrow_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        due_date TIMESTAMPTZ NOT NULL,
        return_date TIMESTAMPTZ,
        weeks_borrowed INT NOT NULL DEFAULT 1 CHECK (weeks_borrowed >= 1 AND weeks_borrowed <= 4),
        weekly_fee NUMERIC(10, 2) NOT NULL CHECK (weekly_fee >= 0),
        total_fees_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_fees_paid >= 0),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'extended', 'returned', 'overdue')),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 4. RENTAL EXTENSIONS / TRANSACTIONS TABLE
      CREATE TABLE IF NOT EXISTS rental_renewals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
        week_number INT NOT NULL CHECK (week_number >= 2 AND week_number <= 4),
        fee_amount NUMERIC(10, 2) NOT NULL CHECK (fee_amount >= 0),
        renewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        new_due_date TIMESTAMPTZ NOT NULL,
        notes TEXT
      );

      -- Indexes for high performance
      CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
      CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
      CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
      CREATE INDEX IF NOT EXISTS idx_rentals_book_id ON rentals(book_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_member_id ON rentals(member_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_due_date ON rentals(due_date);

      -- Enable RLS and create public access policies (for anon and authenticated)
      ALTER TABLE books ENABLE ROW LEVEL SECURITY;
      ALTER TABLE members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
      ALTER TABLE rental_renewals ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Allow all access to books" ON books;
      CREATE POLICY "Allow all access to books" ON books FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow all access to members" ON members;
      CREATE POLICY "Allow all access to members" ON members FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow all access to rentals" ON rentals;
      CREATE POLICY "Allow all access to rentals" ON rentals FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow all access to rental_renewals" ON rental_renewals;
      CREATE POLICY "Allow all access to rental_renewals" ON rental_renewals FOR ALL USING (true) WITH CHECK (true);

      -- Enable realtime replication on tables if not already enabled
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'books'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE books;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rentals'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE rentals;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'members'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE members;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Skipping supabase_realtime publication configuration: %', SQLERRM;
      END $$;
    `);

    console.log('Tables and policies successfully created/verified.');

    // Seed realistic books and members if empty
    const bookCountRes = await client.query('SELECT COUNT(*) FROM books');
    const bookCount = parseInt(bookCountRes.rows[0].count, 10);
    console.log(`Current book count: ${bookCount}`);

    if (bookCount === 0) {
      console.log('Seeding initial library catalog...');
      const sampleBooks = [
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          isbn: '978-0743273565',
          genre: 'Classic Fiction',
          description: 'A portrait of the Jazz Age in all its decadence and excess.',
          cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
          total_copies: 5,
          available_copies: 3,
          weekly_fee: 4.50
        },
        {
          title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
          author: 'Robert C. Martin',
          isbn: '978-0132350884',
          genre: 'Technology',
          description: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees.',
          cover_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e37272?auto=format&fit=crop&q=80&w=400',
          total_copies: 4,
          available_copies: 2,
          weekly_fee: 6.00
        },
        {
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          isbn: '978-0061120084',
          genre: 'Literary Fiction',
          description: 'A gripping, heart-wrenching story of race and justice in the American South.',
          cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
          total_copies: 6,
          available_copies: 5,
          weekly_fee: 3.50
        },
        {
          title: 'Designing Data-Intensive Applications',
          author: 'Martin Kleppmann',
          isbn: '978-1449373320',
          genre: 'Technology',
          description: 'The definitive guide to the architecture of distributed and high-scale systems.',
          cover_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=400',
          total_copies: 3,
          available_copies: 1,
          weekly_fee: 7.50
        },
        {
          title: 'Sapiens: A Brief History of Humankind',
          author: 'Yuval Noah Harari',
          isbn: '978-0062316097',
          genre: 'Non-Fiction / History',
          description: 'Explores how biology and history have defined us and enhanced our understanding of what it means to be "human".',
          cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=400',
          total_copies: 4,
          available_copies: 4,
          weekly_fee: 5.00
        },
        {
          title: 'Dune',
          author: 'Frank Herbert',
          isbn: '978-0441172719',
          genre: 'Science Fiction',
          description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides.',
          cover_url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=400',
          total_copies: 5,
          available_copies: 2,
          weekly_fee: 5.50
        }
      ];

      for (const b of sampleBooks) {
        await client.query(
          `INSERT INTO books (title, author, isbn, genre, description, cover_url, total_copies, available_copies, weekly_fee)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [b.title, b.author, b.isbn, b.genre, b.description, b.cover_url, b.total_copies, b.available_copies, b.weekly_fee]
        );
      }
    }

    const memberCountRes = await client.query('SELECT COUNT(*) FROM members');
    const memberCount = parseInt(memberCountRes.rows[0].count, 10);
    console.log(`Current member count: ${memberCount}`);

    if (memberCount === 0) {
      console.log('Seeding initial library members and rental transactions...');
      const sampleMembers = [
        {
          full_name: 'Eleanor Vance',
          email: 'eleanor.vance@example.com',
          phone: '+1 (555) 234-5678',
          address: '42 Pine Crest Rd, Boston, MA',
          membership_number: 'MEM-2026-001'
        },
        {
          full_name: 'Marcus Holloway',
          email: 'marcus.h@techfirm.org',
          phone: '+1 (555) 876-5432',
          address: '108 Silicon Way, San Francisco, CA',
          membership_number: 'MEM-2026-002'
        },
        {
          full_name: 'Dr. Sophia Lindqvist',
          email: 's.lindqvist@university.edu',
          phone: '+1 (555) 345-9871',
          address: '77 Academy Ave, Cambridge, MA',
          membership_number: 'MEM-2026-003'
        },
        {
          full_name: 'Julian Reynolds',
          email: 'julian.rey@readermag.com',
          phone: '+1 (555) 901-2345',
          address: '15 Maple St, Seattle, WA',
          membership_number: 'MEM-2026-004'
        }
      ];

      for (const m of sampleMembers) {
        await client.query(
          `INSERT INTO members (full_name, email, phone, address, membership_number)
           VALUES ($1, $2, $3, $4, $5)`,
          [m.full_name, m.email, m.phone, m.address, m.membership_number]
        );
      }

      // Fetch created books and members to create initial active and past rentals
      const bRes = await client.query('SELECT id, title, weekly_fee FROM books ORDER BY title ASC');
      const mRes = await client.query('SELECT id, full_name FROM members ORDER BY full_name ASC');

      if (bRes.rows.length >= 3 && mRes.rows.length >= 3) {
        const now = new Date();
        
        // Rental 1: Active, 1 week
        const due1 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000); // 4 days remaining
        await client.query(`
          INSERT INTO rentals (book_id, member_id, borrow_date, due_date, weeks_borrowed, weekly_fee, total_fees_paid, status, notes)
          VALUES ($1, $2, $3, $4, 1, $5, $5, 'active', 'Regular borrow - clean copy issued')
        `, [bRes.rows[0].id, mRes.rows[0].id, new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), due1, bRes.rows[0].weekly_fee]);

        // Rental 2: Extended to 2 weeks (has 1 renewal fee paid)
        const due2 = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
        const rent2 = await client.query(`
          INSERT INTO rentals (book_id, member_id, borrow_date, due_date, weeks_borrowed, weekly_fee, total_fees_paid, status, notes)
          VALUES ($1, $2, $3, $4, 2, $5, $6, 'extended', 'Renewed for second week')
          RETURNING id
        `, [bRes.rows[1].id, mRes.rows[1].id, new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), due2, bRes.rows[1].weekly_fee, bRes.rows[1].weekly_fee * 2]);

        await client.query(`
          INSERT INTO rental_renewals (rental_id, week_number, fee_amount, renewed_at, new_due_date, notes)
          VALUES ($1, 2, $2, $3, $4, 'Week 2 extension approved by admin')
        `, [rent2.rows[0].id, bRes.rows[1].weekly_fee, new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), due2]);

        // Rental 3: Overdue book! (borrowed 10 days ago, due 3 days ago)
        const pastDue = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        await client.query(`
          INSERT INTO rentals (book_id, member_id, borrow_date, due_date, weeks_borrowed, weekly_fee, total_fees_paid, status, notes)
          VALUES ($1, $2, $3, $4, 1, $5, $5, 'overdue', 'First notice sent to borrower')
        `, [bRes.rows[2].id, mRes.rows[2].id, new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), pastDue, bRes.rows[2].weekly_fee]);

        // Rental 4: Previously returned book (completed history with 3 weeks borrowed)
        const returnedDue = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const returnedAt = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
        await client.query(`
          INSERT INTO rentals (book_id, member_id, borrow_date, due_date, return_date, weeks_borrowed, weekly_fee, total_fees_paid, status, notes)
          VALUES ($1, $2, $3, $4, $5, 3, $6, $7, 'returned', 'Returned in excellent condition')
        `, [bRes.rows[3].id, mRes.rows[3].id, new Date(now.getTime() - 34 * 24 * 60 * 60 * 1000), returnedDue, returnedAt, bRes.rows[3].weekly_fee, bRes.rows[3].weekly_fee * 3]);
      }
    }

    console.log('Database setup and verification complete!');
  } catch (err) {
    console.error('Error during setup:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
