import { NextResponse } from 'next/server';

const BASE_URL = 'https://hackutd2025.eog.systems';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 });
    }

    console.log('Fetching from:', `${BASE_URL}/api/${endpoint}`);

    const response = await fetch(`${BASE_URL}/api/${endpoint}`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `API responded with status ${response.status}` }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}