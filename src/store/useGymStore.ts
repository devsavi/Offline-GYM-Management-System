import { create } from 'zustand';
import {
  Trainer,
  Location,
  Member,
  MemberSummaryStats,
} from '../types';
import { trainerService } from '../database/services/trainerService';
import { locationService } from '../database/services/locationService';
import { memberService } from '../database/services/memberService';
import { initDatabase, clearAllDatabaseData, queryFirst, runQuery } from '../database/db';

interface GymState {
  // Initialization & Auth
  isInitialized: boolean;
  isAuthenticated: boolean;
  trainer: Trainer | null;

  // Locations
  locations: Location[];
  selectedLocation: Location | null;

  // Members (Scoped to selectedLocation)
  members: Member[];
  isLoadingMembers: boolean;
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'inactive';
  locationStats: MemberSummaryStats | null;

  // Error & Feedback
  errorMessage: string | null;

  // Actions
  initialize: () => Promise<void>;
  authenticate: (pin?: string) => Promise<boolean>;
  clearAllData: () => Promise<void>;
  lockApp: () => void;
  loadTrainer: () => Promise<void>;
  saveTrainerProfile: (profile: Omit<Trainer, 'created_at'>) => Promise<void>;
  updateTrainerProfile: (updates: Partial<Trainer>) => Promise<void>;
  updateTrainerPin: (newPin: string) => Promise<void>;
  removeTrainerPin: () => Promise<void>;

  loadLocations: () => Promise<void>;
  selectLocation: (location: Location) => Promise<void>;
  createLocation: (name: string, description?: string, address?: string) => Promise<Location>;
  updateLocation: (id: string, name: string, description?: string, address?: string) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  loadMembers: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'all' | 'active' | 'inactive') => void;
  refreshDashboard: () => Promise<void>;
}

export const useGymStore = create<GymState>((set, get) => ({
  isInitialized: false,
  isAuthenticated: false,
  trainer: null,

  locations: [],
  selectedLocation: null,

  members: [],
  isLoadingMembers: false,
  searchQuery: '',
  statusFilter: 'all',
  locationStats: null,
  errorMessage: null,

  initialize: async () => {
    try {
      await initDatabase();
      const trainer = await trainerService.getProfile();
      const locations = await locationService.getAllLocations();

      let selectedLocation: Location | null = null;
      if (locations.length > 0) {
        // Default to the first location or last used
        selectedLocation = locations[0];
      }

      set({
        isInitialized: true,
        trainer,
        locations,
        selectedLocation,
        // If no PIN is configured, mark as authenticated directly
        isAuthenticated: !trainer?.pin_hash,
      });

      if (selectedLocation) {
        await get().refreshDashboard();
      }
    } catch (err: any) {
      console.error('[GymStore] Initialization failed:', err);
      set({
        isInitialized: true,
        errorMessage: err.message || 'Failed to initialize local database',
      });
    }
  },

  authenticate: async (pin?: string) => {
    const { trainer } = get();
    if (!trainer?.pin_hash) {
      set({ isAuthenticated: true });
      return true;
    }
    if (pin && (await trainerService.verifyPin(pin))) {
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },

  lockApp: () => {
    const { trainer } = get();
    if (trainer?.pin_hash) {
      set({ isAuthenticated: false });
    }
  },

  clearAllData: async () => {
    await clearAllDatabaseData();
    set({
      trainer: null,
      locations: [],
      selectedLocation: null,
      members: [],
      locationStats: null,
      searchQuery: '',
      statusFilter: 'all',
      isAuthenticated: false,
      errorMessage: null,
    });
  },

  loadTrainer: async () => {
    const trainer = await trainerService.getProfile();
    set({ trainer });
  },

  saveTrainerProfile: async (profile) => {
    const saved = await trainerService.saveProfile(profile);
    set({ trainer: saved, isAuthenticated: true });
  },

  updateTrainerProfile: async (updates) => {
    const { trainer } = get();
    if (!trainer) return;
    const merged = { ...trainer, ...updates };
    const saved = await trainerService.saveProfile(merged);
    set({ trainer: saved });
  },

  updateTrainerPin: async (newPin: string) => {
    await trainerService.updatePin(newPin);
    const trainer = await trainerService.getProfile();
    set({ trainer });
  },

  removeTrainerPin: async () => {
    await trainerService.removePin();
    const trainer = await trainerService.getProfile();
    set({ trainer, isAuthenticated: true });
  },

  loadLocations: async () => {
    const locations = await locationService.getAllLocations();
    set({ locations });
  },

  selectLocation: async (location: Location) => {
    set({
      selectedLocation: location,
      searchQuery: '',
      statusFilter: 'all',
    });
    await get().refreshDashboard();
  },

  createLocation: async (name: string, description?: string, address?: string) => {
    const newLoc = await locationService.createLocation(name, description, address);
    await get().loadLocations();
    await get().selectLocation(newLoc);
    return newLoc;
  },

  updateLocation: async (id: string, name: string, description?: string, address?: string) => {
    await locationService.updateLocation(id, name, description, address);
    await get().loadLocations();
    const { selectedLocation } = get();
    if (selectedLocation?.id === id) {
      set({ selectedLocation: { ...selectedLocation, name, description, address } });
    }
  },

  deleteLocation: async (id: string) => {
    await locationService.deleteLocation(id);
    await get().loadLocations();
    const { locations, selectedLocation } = get();
    if (selectedLocation?.id === id && locations.length > 0) {
      await get().selectLocation(locations[0]);
    }
  },

  loadMembers: async () => {
    const { selectedLocation, searchQuery, statusFilter } = get();
    if (!selectedLocation) return;

    set({ isLoadingMembers: true });
    try {
      const members = await memberService.getMembersByLocation(
        selectedLocation.id,
        searchQuery,
        statusFilter
      );
      set({ members, isLoadingMembers: false });
    } catch (err: any) {
      set({ isLoadingMembers: false, errorMessage: err.message });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().loadMembers();
  },

  setStatusFilter: (filter: 'all' | 'active' | 'inactive') => {
    set({ statusFilter: filter });
    get().loadMembers();
  },

  refreshDashboard: async () => {
    const { selectedLocation } = get();
    if (!selectedLocation) return;

    try {
      const [members, stats] = await Promise.all([
        memberService.getMembersByLocation(selectedLocation.id, get().searchQuery, get().statusFilter),
        memberService.getLocationSummaryStats(selectedLocation.id),
      ]);
      set({ members, locationStats: stats });
    } catch (err: any) {
      console.error('[GymStore] Error refreshing dashboard:', err);
    }
  },
}));
