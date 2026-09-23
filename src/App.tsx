import { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Shield,
  Phone,
  Bell,
  Moon,
  Sun,
  User,
  Lock,
  LogOut,
} from 'lucide-react';
import UserDashboard from './components/User/UserDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import PhoneLoginModal from './components/Auth/PhoneLoginModal';
import AuthGate from './components/Auth/AuthGate';
import ReportHistoryDrawer from './components/History/ReportHistoryDrawer';
import PushNotificationsTray from './components/Common/PushNotificationsTray';
import OfflineBanner from './components/Common/OfflineBanner';
import AndroidPushToast from './components/Common/AndroidPushToast';
import HotlineModal from './components/Directory/HotlineModal';
import BfpMadridLogo from './components/Common/BfpMadridLogo';
import { IncidentReport, UserProfile, PushNotificationItem, ResponderUnit } from './types';
import {
  getStoredReports,
  saveReport,
  getStoredUserProfile,
  clearUserProfile,
  clearOfflineQueue,
  getOfflineQueue,
  getStoredNotifications,
  saveNotifications,
  getStoredResponderUnits,
} from './services/storageService';
import { SEEDED_ACCOUNTS, logoutCurrentUser } from './services/accountService';
import {
  playNotificationChime,
  playAlarmingStationSiren,
  startContinuousStationAlarm,
  stopContinuousStationAlarm,
  stopAllAlarmSounds,
  isStationAlarmSounding,
} from './services/audioService';

export default function App() {
  // App State
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [responderUnits, setResponderUnits] = useState<ResponderUnit[]>([]);
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [activeToast, setActiveToast] = useState<PushNotificationItem | null>(null);
  const [activeAlarmReport, setActiveAlarmReport] = useState<IncidentReport | null>(null);

  // Active Dashboard View: 'user' or 'admin'
  const [dashboardMode, setDashboardMode] = useState<'user' | 'admin'>('user');

  // Network Connectivity
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueuedReports, setOfflineQueuedReports] = useState<IncidentReport[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Night Mode / Tactical Dark Theme
  const [isNightMode, setIsNightMode] = useState<boolean>(true);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isNotifTrayOpen, setIsNotifTrayOpen] = useState<boolean>(false);
  const [isHotlineOpen, setIsHotlineOpen] = useState<boolean>(false);

  // GPS User Location
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);

  // Initialize and load persisted data
  useEffect(() => {
    const loadedReports = getStoredReports();
    setReports(loadedReports);
    if (loadedReports.length > 0) {
      setSelectedReportId(loadedReports[0].id);
    }

    // Load stored user only if valid registered user or admin, clearing out any test account
    const stored = getStoredUserProfile();
    if (stored && stored.username === 'sample1') {
      clearUserProfile();
      setCurrentUser(null);
    } else {
      setCurrentUser(stored);
      if (stored?.role === 'admin_dispatcher') {
        setDashboardMode('admin');
      }
    }

    const loadedUnits = getStoredResponderUnits();
    setResponderUnits(loadedUnits);

    const loadedNotifs = getStoredNotifications();
    setNotifications(loadedNotifs);

    const queued = getOfflineQueue();
    setOfflineQueuedReports(queued);

    // Online / Offline Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Watch real user GPS coordinates with fallback to Madrid center
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.log('GPS acquired fallback to Madrid Center:', err.message);
          setUserCoords({ lat: 9.2618, lng: 125.9610 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        null,
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
      setGpsWatchId(watchId);
    } else {
      setUserCoords({ lat: 9.2618, lng: 125.9610 });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
      }
    };
  }, []);

  const refreshLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setUserCoords({ lat: 9.2618, lng: 125.9610 });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Sync offline queued reports when connection is restored
  const handleSyncQueue = async () => {
    if (offlineQueuedReports.length === 0) return;
    setIsSyncing(true);

    try {
      await new Promise((res) => setTimeout(res, 1200));

      const updated = [...reports];
      offlineQueuedReports.forEach((queued) => {
        saveReport({ ...queued, isOfflineQueued: false });
        updated.unshift({ ...queued, isOfflineQueued: false });
      });

      setReports(updated);
      clearOfflineQueue();
      setOfflineQueuedReports([]);

      const syncNotif: PushNotificationItem = {
        id: 'sync-' + Date.now(),
        incidentId: offlineQueuedReports[0].id,
        title: 'Cloud & SMS Sync Successful',
        body: `${offlineQueuedReports.length} offline report(s) dispatched to BFP Madrid.`,
        type: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };

      setNotifications((prev) => [syncNotif, ...prev]);
      setActiveToast(syncNotif);
      playNotificationChime();
    } finally {
      setIsSyncing(false);
    }
  };

  // Add newly created incident
  const handleReportCreated = (newReport: IncidentReport) => {
    setReports((prev) => [newReport, ...prev]);
    setSelectedReportId(newReport.id);

    // CONTINUOUS ALARMING SIREN: Sounds indefinitely until BFP or MDRRMO stops it!
    startContinuousStationAlarm();
    setActiveAlarmReport(newReport);

    const newNotif: PushNotificationItem = {
      id: 'notif-' + Date.now(),
      incidentId: newReport.id,
      title: `🚨 EMERGENCY PHOTO: ${newReport.incidentNumber}`,
      body: `Photo reported at ${newReport.location.streetAddress || newReport.location.barangay}. BFP & MDRRMO alerted by continuous siren!`,
      type: 'dispatch',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast(newNotif);
  };

  // ONLY BFP OR MDRRMO CAN STOP THE STATION ALARM
  const handleStopAlarmByResponder = (responderTitle: string) => {
    stopContinuousStationAlarm();
    const currentAlarm = activeAlarmReport;
    setActiveAlarmReport(null);

    // Switch to responder profile if stopping from banner
    if (responderTitle.toLowerCase().includes('bfp')) {
      const bfpUser = SEEDED_ACCOUNTS.find((a) => a.username === 'Admin1')?.profile;
      if (bfpUser) setCurrentUser(bfpUser);
    } else if (responderTitle.toLowerCase().includes('mdrrmo')) {
      const mdrrmoUser = SEEDED_ACCOUNTS.find((a) => a.username === 'Admin2')?.profile;
      if (mdrrmoUser) setCurrentUser(mdrrmoUser);
    }

    setDashboardMode('admin');

    if (currentAlarm) {
      const updatedHistory = [
        ...currentAlarm.statusHistory,
        {
          status: currentAlarm.status,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: `Continuous station alarm silenced and acknowledged by ${responderTitle}.`,
          updatedBy: responderTitle,
        },
      ];

      const updated: IncidentReport = {
        ...currentAlarm,
        statusHistory: updatedHistory,
        updatedAt: new Date().toISOString(),
      };

      saveReport(updated);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  };

  // Update incident status from dispatch
  const handleReportUpdated = (updated: IncidentReport) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (selectedReportId === updated.id) {
      setSelectedReportId(updated.id);
    }

    const updateNotif: PushNotificationItem = {
      id: 'notif-' + Date.now(),
      incidentId: updated.id,
      title: `Status: ${updated.status.toUpperCase()} (${updated.incidentNumber})`,
      body: updated.statusHistory[updated.statusHistory.length - 1]?.note || `${updated.title} is now ${updated.status}.`,
      type: 'status_change',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };

    setNotifications((prev) => [updateNotif, ...prev]);
    setActiveToast(updateNotif);
    playNotificationChime();
  };

  // Mark all notifications read
  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logoutCurrentUser();
    clearUserProfile();
    setCurrentUser(null);
    setDashboardMode('user');
    setIsLoginOpen(false);
  };

  // Switch persona account between the 2 official admins
  const handleSwitchToAdmin = (adminUser: 'Admin1' | 'Admin2') => {
    const found = SEEDED_ACCOUNTS.find((a) => a.username === adminUser);
    if (found) {
      setCurrentUser(found.profile);
      setDashboardMode('admin');
    }
  };

  // If user is not authenticated, show the mandatory AuthGate (Login & Registration)
  if (!currentUser) {
    return (
      <div className={isNightMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'}>
        <AuthGate
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            if (user.role === 'admin_dispatcher') {
              setDashboardMode('admin');
            } else {
              setDashboardMode('user');
            }
          }}
          onOpenHotlines={() => setIsHotlineOpen(true)}
        />
        <HotlineModal isOpen={isHotlineOpen} onClose={() => setIsHotlineOpen(false)} />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${
        isNightMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* Alarming Incoming Emergency Siren Alert Banner */}
      {activeAlarmReport && (
        <div className="relative z-50 bg-rose-600 border-b-2 border-amber-300 text-white px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xl animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white text-rose-600 flex items-center justify-center font-black text-lg animate-bounce shrink-0 shadow">
              🚨
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <span>CONTINUOUS STATION ALARM ACTIVE!</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold hidden sm:inline">
                  STOPS ONLY VIA BFP OR MDRRMO
                </span>
              </div>
              <div className="text-[11px] text-rose-100 truncate">
                {activeAlarmReport.incidentNumber} &bull; {activeAlarmReport.title} ({activeAlarmReport.location.streetAddress || `Brgy. ${activeAlarmReport.location.barangay}`})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Authorized BFP Stop Button */}
            <button
              onClick={() => handleStopAlarmByResponder('BFP Madrid Station Commander')}
              className="py-1 px-3 rounded-xl bg-white text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 shadow transition"
              title="Stop alarm as BFP Madrid Commander"
            >
              <span>🚒 BFP Stop Alarm</span>
            </button>

            {/* Authorized MDRRMO Stop Button */}
            <button
              onClick={() => handleStopAlarmByResponder('MDRRMO Operations Chief')}
              className="py-1 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1 shadow transition"
              title="Stop alarm as MDRRMO Operations Chief"
            >
              <span>🚑 MDRRMO Stop Alarm</span>
            </button>
          </div>
        </div>
      )}

      {/* Offline Status Top Banner */}
      <OfflineBanner
        isOnline={isOnline}
        queuedCount={offlineQueuedReports.length}
        onSyncQueue={handleSyncQueue}
        isSyncing={isSyncing}
        lastQueuedReport={offlineQueuedReports[0]}
      />

      {/* Main App Top Navigation Bar */}
      <header className="relative z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/90 px-3 sm:px-5 py-2 flex items-center justify-between shadow-xl">
        {/* Brand & Municipality Identity */}
        <div className="flex items-center gap-2.5">
          <BfpMadridLogo size="md" withGlow={true} />

          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase flex items-center gap-1.5">
              <span>BFP MADRID EMERGENCY NOTIFIER</span>
            </h1>
            <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-rose-400 font-bold">BFP Madrid Fire Station</span>
              <span>&bull;</span>
              <span className="text-amber-400 font-bold">MDRRMO</span>
              <span>&bull;</span>
              <span className="text-slate-300">Surigao del Sur</span>
            </div>
          </div>
        </div>

        {/* Persona Mode Switcher & Top Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Dashboard Mode Toggle (Citizen vs Admin) */}
          <div className="flex items-center bg-slate-950/90 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                setDashboardMode('user');
              }}
              className={`py-1 px-2.5 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                dashboardMode === 'user'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="User Dashboard (Upload Photo & Map)"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Citizen</span>
            </button>

            <button
              onClick={() => {
                setDashboardMode('admin');
                if (currentUser?.role !== 'admin_dispatcher') {
                  handleSwitchToAdmin('Admin1');
                }
              }}
              className={`py-1 px-2.5 sm:px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition ${
                dashboardMode === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Admin Dashboard (Photos Reported & Realtime Map)"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>

          {/* Quick Admin Persona Selector Dropdown if in Admin Mode */}
          {dashboardMode === 'admin' && (
            <div className="hidden md:flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800 text-[11px]">
              <span className="text-slate-400 text-[10px]">Station:</span>
              <button
                onClick={() => handleSwitchToAdmin('Admin1')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  currentUser?.username === 'Admin1'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="BFP Fire Station Commander"
              >
                Admin1 (BFP)
              </button>
              <button
                onClick={() => handleSwitchToAdmin('Admin2')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  currentUser?.username === 'Admin2'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="MDRRMO Rescue Officer"
              >
                Admin2 (MDRRMO)
              </button>
            </div>
          )}

          {/* Direct Hotlines Modal Trigger */}
          <button
            onClick={() => setIsHotlineOpen(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            title="Emergency Directory Hotlines"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">Hotlines</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotifTrayOpen(true)}
            className="relative p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Push Status Updates"
          >
            <Bell className="w-4 h-4 text-slate-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Night Mode Toggle */}
          <button
            onClick={() => setIsNightMode((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title={isNightMode ? 'Switch Theme' : 'Night Vision Mode'}
          >
            {isNightMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* User Sign In / Profile Modal */}
          <button
            onClick={() => setIsLoginOpen(true)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              currentUser?.role === 'admin_dispatcher'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Profile & Account Details"
          >
            {currentUser?.role === 'admin_dispatcher' ? (
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span className="max-w-[70px] sm:max-w-[100px] truncate">
              {currentUser ? currentUser.username || currentUser.fullName.split(' ')[0] : 'Profile'}
            </span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-950/80 hover:border-rose-700 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Sign Out of Notifier"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Viewport: Either Citizen Dashboard or Admin Dashboard */}
      <main className="relative flex-1 w-full h-full overflow-hidden flex flex-col">
        {dashboardMode === 'user' ? (
          /* USER DASHBOARD: ONLY Upload / Report Photo and Map tabs */
          <UserDashboard
            currentUser={currentUser}
            userCoords={userCoords}
            onRefreshLocation={refreshLocation}
            reports={reports}
            onReportCreated={handleReportCreated}
            isOnline={isOnline}
            responderUnits={responderUnits}
            onSelectIncidentOnMap={(report) => {
              setSelectedReportId(report.id);
            }}
          />
        ) : (
          /* ADMIN DASHBOARD: ONLY Photos Reported and Realtime Map tabs */
          <AdminDashboard
            currentUser={currentUser}
            reports={reports}
            onUpdateReport={handleReportUpdated}
            responderUnits={responderUnits}
            userCoords={userCoords}
            isOnline={isOnline}
            onSelectIncidentOnMap={(report) => {
              setSelectedReportId(report.id);
            }}
            isAlarmActive={Boolean(activeAlarmReport)}
            onStopAlarmByResponder={handleStopAlarmByResponder}
          />
        )}
      </main>

      {/* Floating Push Notification Banner Toast */}
      <AndroidPushToast
        notification={activeToast}
        onDismiss={() => setActiveToast(null)}
        onTap={(notif) => {
          setSelectedReportId(notif.incidentId);
          setIsHistoryOpen(true);
          setActiveToast(null);
        }}
      />

      {/* Phone Login Modal */}
      <PhoneLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'admin_dispatcher') {
            setDashboardMode('admin');
          } else {
            setDashboardMode('user');
          }
          setIsLoginOpen(false);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* User Reporting History & Lifecycle Drawer */}
      <ReportHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        reports={reports}
        currentUser={currentUser}
        onSelectIncident={(report) => {
          setSelectedReportId(report.id);
        }}
      />

      {/* Push Notifications Tray */}
      <PushNotificationsTray
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onSelectNotification={(item) => {
          setSelectedReportId(item.incidentId);
          setIsHistoryOpen(true);
        }}
        isOpen={isNotifTrayOpen}
        onClose={() => setIsNotifTrayOpen(false)}
      />

      {/* Madrid Emergency Hotlines Directory */}
      <HotlineModal isOpen={isHotlineOpen} onClose={() => setIsHotlineOpen(false)} />
    </div>
  );
}
