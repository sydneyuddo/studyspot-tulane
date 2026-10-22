export interface StaticSpotData {
  id: string;
  name: string;
  shortName: string;
  category: 'library' | 'student-center' | 'cafe' | 'academic';
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  hoursGuidance: string;
  officialHoursUrl: string;
  floorsOrZones: string[];
}

export const TULANE_SPOTS_METADATA: StaticSpotData[] = [
  {
    id: 'howard-tilton',
    name: 'Howard-Tilton Memorial Library',
    shortName: 'Howard-Tilton Library',
    category: 'library',
    address: '7001 Freret St, New Orleans, LA 70118',
    coordinates: {
      lat: 29.9405,
      lng: -90.1218,
    },
    description: "Tulane's main library on the Uptown campus, featuring collaborative study floors on lower levels, designated quiet floors on upper levels, and a PJ's Coffee location in the lobby.",
    hoursGuidance: 'Operating schedules vary across regular semesters, holidays, and exam periods. Visit the official Tulane Libraries schedule for current building and service desk hours.',
    officialHoursUrl: 'https://library.tulane.edu/about/hours',
    floorsOrZones: [
      '1st Floor - Learning Commons',
      '2nd Floor - Stacks & Open Tables',
      '3rd Floor - Study Stacks',
      '4th Floor - Quiet Study Area',
      '5th Floor - Quiet Stacks',
      '6th Floor - Quiet Study Area',
    ],
  },
  {
    id: 'lavin-bernick-center',
    name: 'Lavin-Bernick Center for University Life (LBC)',
    shortName: 'LBC Student Center',
    category: 'student-center',
    address: '201 Boggs Center / McAlister Way, New Orleans, LA 70118',
    coordinates: {
      lat: 29.9398,
      lng: -90.1207,
    },
    description: 'The student union on the Uptown campus, providing common lounge areas, campus dining options, student meeting spaces, and an outdoor courtyard.',
    hoursGuidance: 'Building access and dining vendor operating hours are subject to change. Check the official LBC and Dining Services websites for current schedules.',
    officialHoursUrl: 'https://lbc.tulane.edu',
    floorsOrZones: [
      '1st Floor - Nalty Commons & Dining',
      '2nd Floor - Meeting Rooms & Lounge',
      'Outdoor - Courtyard Patio',
    ],
  },
  {
    id: 'pjs-stern',
    name: "PJ's Coffee - Stern Hall",
    shortName: "PJ's Stern Hall",
    category: 'cafe',
    address: 'Stern Science Hall, Tulane University, New Orleans, LA 70118',
    coordinates: {
      lat: 29.9412,
      lng: -90.1200,
    },
    description: 'Campus coffee shop located within the Stern Science Hall complex serving coffee, tea, and quick snacks.',
    hoursGuidance: 'Campus dining location hours follow the Tulane Dining Services calendar and holiday schedule. Check Tulane Dining for current branch hours.',
    officialHoursUrl: 'https://campusservices.tulane.edu/departments/dining/hours',
    floorsOrZones: [
      'Counter Area & Seating',
      'Stern Hallway Tables',
    ],
  },
  {
    id: 'pjs-howie-t',
    name: "PJ's Coffee - Howard-Tilton Library",
    shortName: "PJ's Howie-T",
    category: 'cafe',
    address: 'Howard-Tilton Memorial Library Ground Floor, 7001 Freret St',
    coordinates: {
      lat: 29.9406,
      lng: -90.1219,
    },
    description: 'Campus coffee venue located near the front entrance of the Howard-Tilton Memorial Library.',
    hoursGuidance: 'Operating hours are managed by Tulane Dining Services in coordination with library facilities. Check current hours on the Tulane Dining website.',
    officialHoursUrl: 'https://campusservices.tulane.edu/departments/dining/hours',
    floorsOrZones: [
      'Lobby Seating & Counter',
    ],
  },
  {
    id: 'pjs-willow',
    name: "PJ's Coffee - Willow Street",
    shortName: "PJ's Willow",
    category: 'cafe',
    address: '1301 Willow St, New Orleans, LA 70118',
    coordinates: {
      lat: 29.9368,
      lng: -90.1225,
    },
    description: 'Campus coffee shop located on Willow Street near campus residence halls with indoor seating and an outdoor patio.',
    hoursGuidance: 'Operating schedules follow the university dining schedule. Check Tulane Dining Services for today’s operating status.',
    officialHoursUrl: 'https://campusservices.tulane.edu/departments/dining/hours',
    floorsOrZones: [
      'Indoor Seating',
      'Outdoor Patio',
    ],
  },
  {
    id: 'freeman-gwbc',
    name: 'Freeman School of Business (Goldring / GWBC)',
    shortName: 'Freeman Business Complex',
    category: 'academic',
    address: '7 McAlister Dr, New Orleans, LA 70118',
    coordinates: {
      lat: 29.9388,
      lng: -90.1220,
    },
    description: 'Academic complex comprising the Goldring and Woldenberg business facilities with central atrium common areas and breakout study spaces.',
    hoursGuidance: 'Facility access hours correspond to academic class schedules and official Freeman School calendar policies. Consult the school website for details.',
    officialHoursUrl: 'https://freeman.tulane.edu',
    floorsOrZones: [
      'Atrium Commons (Level 1)',
      'Upper Study Bridges',
    ],
  },
  {
    id: 'richardson-memorial',
    name: 'Richardson Memorial Hall',
    shortName: 'Richardson Memorial Hall',
    category: 'academic',
    address: '6823 St Charles Ave, New Orleans, LA 70118',
    coordinates: {
      lat: 29.9377,
      lng: -90.1212,
    },
    description: 'Historic academic hall on the Tulane academic quad housing the Tulane School of Architecture.',
    hoursGuidance: 'General public and student access hours are set by the Tulane School of Architecture. Refer to the architecture school website for current policies.',
    officialHoursUrl: 'https://architecture.tulane.edu',
    floorsOrZones: [
      'Main Hall & Lobby',
      'Study Alcoves',
    ],
  },
];
