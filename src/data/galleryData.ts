export interface GalleryAlbum {
  id: string;
  title: string;
  category: 'Worship Services' | 'Youth & Camps' | 'Missions & Outreach' | 'Seasonal Celebrations';
  date: string;
  photoCount: number;
  coverUrl: string;
  description: string;
}

export const SAMPLE_ALBUMS: GalleryAlbum[] = [
  {
    id: 'easter-revival-2026',
    title: 'Easter Resurrection Celebration 2026',
    category: 'Seasonal Celebrations',
    date: 'April 05, 2026',
    photoCount: 24,
    coverUrl: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=800&q=80',
    description: 'Joyous resurrection Sunday celebration with choir orchestra, water baptism testimonies, and community fellowship lunch.',
  },
  {
    id: 'youth-camp-2026',
    title: 'Kingdom Youth Ignite Retreat',
    category: 'Youth & Camps',
    date: 'August 14-16, 2026',
    photoCount: 36,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    description: 'Three days of spiritual revival, worship campfires, team building, and intensive biblical discipleship in the hills.',
  },
  {
    id: 'missions-outreach-2026',
    title: 'Rural Village Outreach & Medical Camp',
    category: 'Missions & Outreach',
    date: 'October 24, 2026',
    photoCount: 18,
    coverUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80',
    description: 'Providing free health checkups, medicine, winter blankets, and the Gospel message to remote village families.',
  },
  {
    id: 'carols-candlelight-2025',
    title: 'Carols by Candlelight & Christmas Pageant',
    category: 'Seasonal Celebrations',
    date: 'December 24, 2025',
    photoCount: 42,
    coverUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=800&q=80',
    description: 'The annual candlelit worship evening featuring the children\'s nativity drama and choral symphonies.',
  },
  {
    id: 'night-vigil-2026',
    title: 'All-Night Intercession & Anointing Night',
    category: 'Worship Services',
    date: 'September 18, 2026',
    photoCount: 20,
    coverUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=800&q=80',
    description: 'Six hours of unceasing prayer, prophetic worship, and laying on of hands for healing and breakthroughs.',
  },
];
