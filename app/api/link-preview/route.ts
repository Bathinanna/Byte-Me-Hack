// import { NextResponse } from 'next/server';
// import ogs from 'open-graph-scraper';

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const url = searchParams.get('url');
//   if (!url) {
//     return NextResponse.json({ error: 'URL is required' }, { status: 400 });
//   }

//   try {
//     const { result } = await ogs({ url });
//     return NextResponse.json({
//       title: result.ogTitle || result.title || '',
//       image: result.ogImage?.url || '',
//       description: result.ogDescription || result.description || '',
//       url,
//     });
//   } catch (error) {
//     return NextResponse.json({ error: 'Failed to fetch link preview' }, { status: 500 });
//   }
// } 

export {}; 