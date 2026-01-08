import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  modals: {
    [key: string]: boolean;
  };
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      modals: {},
      openModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: true },
      })),
      closeModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: false },
      })),
    }),
    {
      name: 'life-assistant-ui',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
);
