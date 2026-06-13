import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// All credentials matching the client-side store
const CREDENTIALS: Record<string, { password: string; role: string; name: string; userId: string }> = {
  admin: { password: 'Laxree@2025', role: 'ADMIN', name: 'Arti Sharma', userId: 'user-admin' },
  ea: { password: 'EA@Laxree', role: 'EA', name: 'Arti Sharma', userId: 'user-ea1' },
  ashish: { password: 'Ashish@2025', role: 'DIRECTOR', name: 'Ashish Sir', userId: 'user-dir3' },
  samarth: { password: 'Samarth@2025', role: 'DIRECTOR', name: 'Samarth Sir', userId: 'user-dir4' },
  aditya: { password: 'Aditya@2025', role: 'EMPLOYEE', name: 'Aditya Sharma', userId: 'user-emp1' },
  aakash: { password: 'Aakash@2025', role: 'EMPLOYEE', name: 'Aakash', userId: 'user-emp2' },
  anamika: { password: 'Anamika@2025', role: 'EMPLOYEE', name: 'Anamika', userId: 'user-emp3' },
  saurabh: { password: 'Saurabh@2025', role: 'EMPLOYEE', name: 'Saurabh', userId: 'user-emp4' },
  ruchi: { password: 'Ruchi@2025', role: 'EMPLOYEE', name: 'Ruchi', userId: 'user-emp5' },
  aayush: { password: 'Aayush@2025', role: 'EMPLOYEE', name: 'Aayush', userId: 'user-emp6' },
  kamlesh: { password: 'Kamlesh@2025', role: 'EMPLOYEE', name: 'Kamlesh', userId: 'user-emp7' },
  hitesh: { password: 'Hitesh@2025', role: 'EMPLOYEE', name: 'Hitesh Tak', userId: 'user-emp8' },
  khushboo: { password: 'Khushboo@2025', role: 'MANAGER', name: 'Khushboo Manglani', userId: 'user-mgr1' },
  radhika: { password: 'Radhika@2025', role: 'MANAGER', name: 'Radhika', userId: 'user-mgr2' },
  tanuja: { password: 'Tanuja@2025', role: 'MANAGER', name: 'Tanuja Tigaya', userId: 'user-mgr3' },
}

// POST /api/auth - Login endpoint
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const cred = CREDENTIALS[username.toLowerCase()]
    if (!cred || cred.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Find the user in the database
    let dbUser = await db.user.findFirst({
      where: {
        OR: [
          { id: cred.userId },
          { name: cred.name, role: cred.role as any },
        ],
        isActive: true,
      },
    })

    // If not found by ID/name, try role match
    if (!dbUser) {
      dbUser = await db.user.findFirst({
        where: { role: cred.role as any, isActive: true },
      })
    }

    return NextResponse.json({
      id: dbUser?.id || cred.userId,
      name: cred.name,
      role: cred.role,
      department: dbUser?.department || null,
      email: dbUser?.email || `${username}@laxree.com`,
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
