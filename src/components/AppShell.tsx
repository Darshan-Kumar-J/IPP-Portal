import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Compass,
  GitBranch,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Menu,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Rocket,
  Search,
  Settings,
  Shield,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import type {
  ActivityEvent,
  ApiEndpoint,
  Capability,
  DocumentEntry,
  NavSection,
  Platform,
  User,
} from '../types/ipp';
import { IppLogo } from './ui/Primitives';

interface AppShellProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  currentUser: User;
  availableUsers: User[];
  onSwitchUser: (userId: string) => Promise<void>;
  platforms: Platform[];
  apis: ApiEndpoint[];
  capabilities: Capability[];
  documents: DocumentEntry[];
  activities: ActivityEvent[];
  onSelectPlatform: (id: string) => void;
  onSelectApi: (api: ApiEndpoint) => void;
  onSelectDoc: (id: string) => void;
  onOpenHelp: () => void;
  onOpenPreferences: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'platforms', label: 'Platform Catalog', icon: Layers },
  { id: 'apis', label: 'API Marketplace', icon: Compass },
  { id: 'producer', label: 'Producer Workspace', icon: Rocket },
  { id: 'docs', label: 'Documentation Hub', icon: BookOpen },
  { id: 'capabilities', label: 'Capability Management', icon: Network },
  { id: 'assistant', label: 'AI Assistant', icon: Bot },
  { id: 'workflows', label: 'Agent Workflows', icon: GitBranch },
  { id: 'explorer', label: 'API Explorer', icon: Terminal },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'admin', label: 'Administration', icon: Shield },
];

export function AppShell({
  activeSection,
  onNavigate,
  theme,
  onToggleTheme,
  currentUser,
  availableUsers,
  onSwitchUser,
  platforms,
  apis,
  capabilities,
  documents,
  activities,
  onSelectPlatform,
  onSelectApi,
  onSelectDoc,
  onOpenHelp,
  onOpenPreferences,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeSection)?.label || 'Overview';

  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{
      id: string;
      type: 'Platform' | 'API' | 'Document' | 'Capability';
      title: string;
      onClick: () => void;
    }> = [];

    platforms.forEach((p) => {
      if (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
        results.push({
          id: p.id,
          type: 'Platform',
          title: p.name,
          onClick: () => onSelectPlatform(p.id),
        });
      }
    });
    apis.forEach((a) => {
      if (a.name.toLowerCase().includes(q) || a.baseUrl.toLowerCase().includes(q)) {
        results.push({
          id: a.id,
          type: 'API',
          title: a.name,
          onClick: () => onSelectApi(a),
        });
      }
    });
    documents.forEach((d) => {
      if (d.title.toLowerCase().includes(q)) {
        results.push({
          id: d.id,
          type: 'Document',
          title: d.title,
          onClick: () => onSelectDoc(d.id),
        });
      }
    });
    capabilities.forEach((c) => {
      if (c.name.toLowerCase().includes(q)) {
        results.push({
          id: c.id,
          type: 'Capability',
          title: c.name,
          onClick: () => onNavigate('capabilities'),
        });
      }
    });

    return results.slice(0, 8);
  }, [globalQuery, platforms, apis, documents, capabilities, onSelectPlatform, onSelectApi, onSelectDoc, onNavigate]);

  const contextualCta = useMemo(() => {
    switch (activeSection) {
      case 'apis':
      case 'explorer':
        return { label: 'Open Producer Journey', action: () => onNavigate('producer') };
      case 'docs':
        return { label: 'Ask AI Assistant', action: () => onNavigate('assistant') };
      case 'assistant':
        return { label: 'View Workflows', action: () => onNavigate('workflows') };
      default:
        return { label: 'Register Platform', action: () => onNavigate('producer') };
    }
  }, [activeSection, onNavigate]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#101B32] border-r border-slate-200 dark:border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('overview')}
          className="flex items-center gap-2.5 text-left min-w-0"
        >
          <IppLogo className="w-8 h-8 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight text-[#101B32] dark:text-white block leading-none">
                IPP
              </span>
              <span className="text-[11px] text-[#65748B] dark:text-slate-400 truncate block mt-0.5">
                Internal Platforms Portal
              </span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:inline-flex p-1.5 rounded-lg text-[#65748B] hover:text-[#101B32] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-[#65748B]"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Nav */}
      <nav aria-label="Primary Sidebar Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#2457D6] text-white'
                  : 'text-[#334155] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Sidebar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1 shrink-0">
        <button
          type="button"
          onClick={onOpenHelp}
          title={collapsed ? 'Help & Support' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#65748B] dark:text-slate-400 hover:text-[#101B32] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70 whitespace-nowrap"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Help & Support</span>}
        </button>

        <button
          type="button"
          onClick={onOpenPreferences}
          title={collapsed ? 'Settings' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#65748B] dark:text-slate-400 hover:text-[#101B32] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70 whitespace-nowrap"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>

        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left"
        >
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#101B32] dark:text-slate-100 truncate">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-[#65748B] dark:text-slate-400 truncate">
                {currentUser.role}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-150 ${
          collapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full">{sidebarContent}</div>
          <div
            className="flex-1 bg-[#101B32]/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 px-4 lg:px-8 bg-white/95 dark:bg-[#101B32]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          {/* Zone 1: Mobile Toggle + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#65748B] hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => onNavigate('overview')}
                className="font-semibold text-[#101B32] dark:text-slate-100 whitespace-nowrap shrink-0"
              >
                IPP
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[#65748B] dark:text-slate-400 truncate">
                {activeNavLabel}
              </span>
            </nav>
          </div>

          {/* Zone 2: Global Search */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-[#65748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="Search platforms, APIs, capabilities, docs..."
              aria-label="Global portal search"
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100 placeholder:text-[#65748B]"
            />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-50">
                {searchResults.map((res) => (
                  <button
                    key={`${res.type}-${res.id}`}
                    type="button"
                    onClick={() => {
                      res.onClick();
                      setGlobalQuery('');
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate font-medium text-[#101B32] dark:text-slate-100">
                      {res.title}
                    </span>
                    <span className="text-xs text-[#65748B] dark:text-slate-400 shrink-0">
                      {res.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zone 3: Theme, Notifications, Profile, Contextual Action */}
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[#65748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                aria-label="Notification center"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[#65748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700 shadow-xl p-4 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-semibold text-[#101B32] dark:text-slate-100">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#65748B]"
                    >
                      Close
                    </button>
                  </div>
                  <div className="divide-y divide-slate-200/70 dark:divide-slate-800 max-h-64 overflow-y-auto mt-1">
                    {activities.slice(0, 5).map((act) => (
                      <div key={act.id} className="py-2.5 text-xs">
                        <p className="text-[#101B32] dark:text-slate-200">
                          <strong>{act.actor}</strong> {act.action}{' '}
                          <span className="text-[#2457D6] dark:text-[#438BFF]">{act.target}</span>
                        </p>
                        <p className="text-[#65748B] mt-0.5 tabular-nums">
                          {new Date(act.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="hidden sm:inline text-xs font-medium text-[#101B32] dark:text-slate-100 whitespace-nowrap">
                  {currentUser.role}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700 shadow-xl p-4 z-50 space-y-3">
                  <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-semibold text-[#101B32] dark:text-slate-100">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-[#65748B] dark:text-slate-400">{currentUser.title}</p>
                    <p className="text-xs font-mono text-[#2457D6] dark:text-[#438BFF] mt-1">
                      Role: {currentUser.role}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-[#65748B] dark:text-slate-400 mb-1.5">
                      Switch Demo Session Role (JWT Cookie)
                    </p>
                    <div className="space-y-1">
                      {availableUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={async () => {
                            await onSwitchUser(u.id);
                            setProfileOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                            u.id === currentUser.id
                              ? 'bg-[#2457D6]/10 text-[#2457D6] dark:text-[#438BFF] font-medium'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#334155] dark:text-slate-300'
                          }`}
                        >
                          <span>{u.name}</span>
                          <span className="text-[11px] opacity-80">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={contextualCta.action}
              className="hidden sm:inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] transition-colors whitespace-nowrap shrink-0"
            >
              {contextualCta.label}
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
