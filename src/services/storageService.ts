import { IncidentReport, UserProfile, PushNotificationItem, ResponderUnit } from '../types';
import { INITIAL_RESPONDER_UNITS } from '../constants/madridLocations';
import { getTotalRegisteredCount } from './accountService';

const STORAGE_KEYS = {
  USER_PROFILE: 'madrid_user_profile',
  REPORTS: 'madrid_incident_reports',
  OFFLINE_QUEUE: 'madrid_offline_reports_queue',
  NOTIFICATIONS: 'madrid_push_notifications',
  RESPONDER_UNITS: 'madrid_responder_units',
  BETA_USER_COUNT: 'madrid_beta_user_count',
  THEME_MODE: 'madrid_theme_mode',
};

// Initial realistic Madrid, Surigao del Sur incident sample
const SEED_REPORTS: IncidentReport[] = [
  {
    id: 'mdr-rep-001',
    incidentNumber: 'MDR-2026-0814',
    category: 'fire',
    subcategory: 'Residential Structure Fire',
    severity: 'high',
    title: 'Kitchen Fire spreading to roof',
    description: 'LPG gas tank leakage ignited ceiling near public market area. Neighboring houses are closely built wood.',
    location: {
      latitude: 9.2632,
      longitude: 125.9612,
      barangay: 'Linungao (Poblacion)',
      landmark: 'Behind Madrid Public Market, Purok 3',
      accuracyMeters: 8,
    },
    reporterName: 'Danilo Alcantara',
    reporterPhone: '0917-542-8891',
    photos: [
      {
        id: 'p1',
        dataUrl: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=600&q=80',
        timestamp: '19:15:20',
        caption: 'Smoke coming from residential roof',
        aiSceneAssessment: 'Dense grey smoke visible from roof eaves. Flammable light materials suspected.',
      },
    ],
    status: 'en_route',
    statusHistory: [
      {
        status: 'reported',
        timestamp: '19:14:02',
        note: 'Emergency distress received via Madrid Notifier App',
        updatedBy: 'System / Dispatch Gate',
      },
      {
        status: 'acknowledged',
        timestamp: '19:14:40',
        note: 'Verified with BFP Madrid Duty Desk Officer FO1 C. Morales',
        updatedBy: 'BFP Madrid Dispatch',
      },
      {
        status: 'dispatched',
        timestamp: '19:15:30',
        note: 'Engine 01 Rosenbauer rolling out from station',
        updatedBy: 'BFP Station Commander',
      },
      {
        status: 'en_route',
        timestamp: '19:16:10',
        note: 'Vehicle is 0.8 km away on National Highway, sirens active',
        updatedBy: 'FO2 Rommel Plaza (Driver)',
      },
    ],
    assignedUnitId: 'unit-bfp-01',
    assignedUnitName: 'BFP Engine 01 (Rosenbauer Pumper)',
    responderDistanceKm: 0.8,
    responderEtaMinutes: 2,
    e2eeHash: '4F89BC1A90E2',
    isEncrypted: true,
    smsSent: true,
    smsRecipient: '09178192371',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    aiTriage: {
      alarmLevel: '1st Alarm Fire (BFP Madrid)',
      equipmentSuggested: ['Rosenbauer Pumper Engine 01', '1.5" Attack Hose', 'SCBA Breathing Team'],
      civilianSafetyAdvice: 'Keep neighborhood crowd back. Do not attempt to use household garden hose on electrical lines.',
      dispatchPriority: 'Critical - Immediate',
    },
  },
  {
    id: 'mdr-rep-002',
    incidentNumber: 'MDR-2026-0815',
    category: 'vehicular',
    subcategory: 'Motorcycle Highway Collision',
    severity: 'high',
    title: 'Two motorcycles collided at curved road',
    description: 'Two motorbikes collided at the blind curve going north to Cantilan. Two drivers thrown to road shoulder, conscious but bleeding from knee and arm.',
    location: {
      latitude: 9.2745,
      longitude: 125.9542,
      barangay: 'Songkit',
      landmark: 'Near Songkit Elementary School waiting shed',
      accuracyMeters: 12,
    },
    reporterName: 'Marites Cabarrubias',
    reporterPhone: '0929-331-4820',
    photos: [],
    status: 'dispatched',
    statusHistory: [
      {
        status: 'reported',
        timestamp: '19:22:15',
        note: 'Distress call registered by citizen',
        updatedBy: 'App User',
      },
      {
        status: 'dispatched',
        timestamp: '19:24:00',
        note: 'MDRRMO Alpha Rescue Ambulance deployed with 2 EMTs',
        updatedBy: 'MDRRMO Dispatcher',
      },
    ],
    assignedUnitId: 'unit-rescue-01',
    assignedUnitName: 'MDRRMO Alpha Rescue Ambulance',
    responderDistanceKm: 1.6,
    responderEtaMinutes: 3,
    e2eeHash: '9D4A18E6627C',
    isEncrypted: true,
    smsSent: true,
    smsRecipient: '09985521911',
    createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    aiTriage: {
      alarmLevel: 'Code Red - Vehicular Collision',
      equipmentSuggested: ['Spine Board', 'C-Collar', 'Trauma Bleed Dressing', 'Ambulance Unit'],
      civilianSafetyAdvice: 'Direct oncoming traffic around victims. Keep victims warm and resting flat on ground.',
      dispatchPriority: 'Urgent',
    },
  },
];

export function getStoredReports(): IncidentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(SEED_REPORTS));
      return SEED_REPORTS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_REPORTS;
  }
}

export function saveReport(report: IncidentReport): void {
  const reports = getStoredReports();
  const index = reports.findIndex(r => r.id === report.id);
  if (index >= 0) {
    reports[index] = report;
  } else {
    reports.unshift(report);
  }
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
}

export function getOfflineQueue(): IncidentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineReport(report: IncidentReport): void {
  const queue = getOfflineQueue();
  queue.push({ ...report, isOfflineQueued: true });
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
}

export function clearOfflineQueue(): IncidentReport[] {
  const queue = getOfflineQueue();
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
  return queue;
}

export function getStoredUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserProfile(user: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
}

export function clearUserProfile(): void {
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
}

// 300 user capacity limit for beta launch
export function getBetaUserCount(): number {
  return getTotalRegisteredCount();
}

export function incrementBetaUserCount(): number {
  return getTotalRegisteredCount();
}

export function getStoredResponderUnits(): ResponderUnit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESPONDER_UNITS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RESPONDER_UNITS, JSON.stringify(INITIAL_RESPONDER_UNITS));
      return INITIAL_RESPONDER_UNITS;
    }
    const parsed: ResponderUnit[] = JSON.parse(raw);
    // Ensure newly added initial units (like BFP EMS Ambulance) are present and BFP number is updated
    const existingIds = new Set(parsed.map((u) => u.id));
    const merged = parsed.map((u) => {
      if (u.id === 'unit-bfp-01' || u.id === 'unit-bfp-amb-01') {
        return { ...u, contactNumber: '0931-7218-765' };
      }
      return u;
    });
    for (const initUnit of INITIAL_RESPONDER_UNITS) {
      if (!existingIds.has(initUnit.id)) {
        merged.push(initUnit);
      }
    }
    return merged;
  } catch {
    return INITIAL_RESPONDER_UNITS;
  }
}

export function saveResponderUnits(units: ResponderUnit[]): void {
  localStorage.setItem(STORAGE_KEYS.RESPONDER_UNITS, JSON.stringify(units));
}

export function getStoredNotifications(): PushNotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [
      {
        id: 'notif-1',
        incidentId: 'mdr-rep-001',
        title: 'BFP Engine 01 En Route',
        body: 'Fire response unit dispatched to Purok 3, Brgy. Linungao. ETA 2 minutes.',
        type: 'dispatch',
        timestamp: '19:16',
        read: false,
      },
      {
        id: 'notif-2',
        incidentId: 'mdr-rep-002',
        title: 'MDRRMO Ambulance Dispatched',
        body: 'Rescue Alpha unit responding to vehicular incident in Brgy. Songkit.',
        type: 'dispatch',
        timestamp: '19:24',
        read: false,
      },
    ];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: PushNotificationItem[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
}

export function addNotification(item: Omit<PushNotificationItem, 'id' | 'read' | 'timestamp'>): PushNotificationItem {
  const list = getStoredNotifications();
  const newItem: PushNotificationItem = {
    ...item,
    id: 'notif-' + Date.now(),
    read: false,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
  list.unshift(newItem);
  saveNotifications(list.slice(0, 30));
  return newItem;
}
