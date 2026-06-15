import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const users = await db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        designation: true,
        phone: true,
        location: true,
        avatar: true,
        isActive: true,
        joinDate: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users — Create new user (EA only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, role, department, designation, phone, location, loginUsername, loginPassword } = body

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'name, email, and role are required' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        role,
        department: department || null,
        designation: designation || null,
        phone: phone || null,
        location: location || null,
        loginUsername: loginUsername || null,
        loginPassword: loginPassword || null,
        isActive: true,
        joinDate: new Date(),
      },
    })

    return NextResponse.json({ user, loginUsername, loginPassword }, { status: 201 })
  } catch (error) {
    console.error('Users POST error:', error)
    return NextResponse.json({ error: 'Failed to create user: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}

// PATCH /api/users — Update user (EA only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, role, department, designation, phone, location, isActive, loginPassword } = body

    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (department !== undefined) updateData.department = department
    if (designation !== undefined) updateData.designation = designation
    if (phone !== undefined) updateData.phone = phone
    if (location !== undefined) updateData.location = location
    if (isActive !== undefined) updateData.isActive = isActive
    if (loginPassword !== undefined) updateData.loginPassword = loginPassword

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Users PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update user: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}

// DELETE /api/users — Soft delete user (EA only)
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete — mark as inactive instead of deleting
    const user = await db.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ user, message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Users DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
