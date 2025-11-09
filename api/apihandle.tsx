import { NextResponse } from 'next/server';

export async function get() {
  try {
    const response = await fetch('https://hackutd2025.eog.systems', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}